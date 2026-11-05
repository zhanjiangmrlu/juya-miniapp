import { reactive, watch } from 'vue'

import { PAGE_SHARE_CACHE_PREFIX, PAGE_SHARE_DOWNLOAD_TIMEOUT_MS } from '@/shared/constants/share'
import { ShareChannel } from '@/shared/enums/share'

import type { PageShareCoverAsset, PageShareCoverAssets } from '@/shared/types/share'

import { runtimeMode } from './runtime-mode'

const deferredCleanup = new Set<string>()

/** 返回完整模式后清理本功能在摘要模式下暂不能删除的下载文件 */
const cleanDeferredDownloads = () => {
  for (const path of deferredCleanup) {
    try {
      uni.getFileSystemManager().unlinkSync(path)
    } catch {
      /* 系统可能已回收未完成的下载文件 */
    }
    deferredCleanup.delete(path)
  }
}

/** 判断已准备的公开文件是否仍存在且大小正确，不读取或传递账号凭证
 * @param asset 当前渠道固定版本的封面配置
 * @param path 已准备好的本地文件或 H5 网络地址
 */
const fileAvailable = (asset: PageShareCoverAsset, path: string) => {
  if (!path) return false
  if (path.startsWith('https://')) return path === asset.url
  try {
    const fs = uni.getFileSystemManager()
    fs.accessSync(path)
    const info = fs.statSync(path)
    return !Array.isArray(info) && info.size === asset.bytes
  } catch {
    return false
  }
}

/** 微信将公开封面缓存到按内容版本命名的自有文件，失败始终回到包内小图
 * @param asset 当前渠道的公开地址、真实规格及本地兜底图
 */
const prepareCover = (asset: PageShareCoverAsset): Promise<string> => {
  if (!asset.url.startsWith('https://') || runtimeMode.update())
    return Promise.resolve(asset.fallback)
  // #ifdef MP-WEIXIN
  return new Promise((resolve) => {
    let settled = false,
      task: Pick<UniNamespace.DownloadTask, 'abort'> | undefined,
      path = '',
      temporary = '',
      stopMode = () => {}
    /** 仅清理本功能自有的固定缓存文件，不影响其他媒体 */
    const remove = () => {
      if (!temporary) return
      if (runtimeMode.update()) {
        deferredCleanup.add(temporary)
        return
      }
      try {
        uni.getFileSystemManager().unlinkSync(temporary)
      } catch {
        /* 文件未生成或已由系统回收 */
      }
    }
    /** 结束后台准备，失败时不等待分享回调再处理网络 */
    const fail = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      stopMode()
      remove()
      resolve(asset.fallback)
    }
    const timer = setTimeout(() => {
      fail()
      try {
        task?.abort()
      } catch {
        /* 任务已经结束时不影响包内兜底 */
      }
    }, PAGE_SHARE_DOWNLOAD_TIMEOUT_MS)
    stopMode = watch(
      runtimeMode.browseOnly,
      (restricted) => {
        if (!restricted) return
        fail()
        try {
          task?.abort()
        } catch {
          /* 摘要模式不再读取或写入文件，未完成文件延后清理 */
        }
      },
      { flush: 'sync' }
    )
    /** 仅将实际像素与文件大小均正确的封面交给原生分享 */
    const ready = () => {
      if (settled) return
      if (runtimeMode.update()) {
        fail()
        return
      }
      try {
        if (temporary) uni.getFileSystemManager().renameSync(temporary, path)
      } catch {
        fail()
        return
      }
      settled = true
      clearTimeout(timer)
      stopMode()
      resolve(path)
    }
    /** 原生图片解码失败时执行指定的恢复动作
     * @param src 待验证的缓存文件或本次独占的下载文件
     * @param invalid 缓存可重新下载，新下载文件则回到本地兜底
     */
    const verify = (src: string, invalid: () => void) => {
      if (runtimeMode.update()) {
        fail()
        return
      }
      try {
        uni.getImageInfo({
          src,
          success: (info) => {
            if (settled) return
            if (runtimeMode.update()) {
              fail()
              return
            }
            if (
              info.width === asset.width &&
              info.height === asset.height &&
              fileAvailable(asset, src)
            )
              ready()
            else invalid()
          },
          fail: () => {
            if (!settled) invalid()
          }
        })
      } catch {
        invalid()
      }
    }
    /** 缓存缺失或损坏时下载固定版本，迟到响应不重新发布缓存 */
    const download = () => {
      if (settled) return
      if (runtimeMode.update()) {
        fail()
        return
      }
      // 各次下载独占临时文件，超时后的迟到回调不能删除后续重试成功的缓存
      temporary = `${path}.pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
      try {
        task = uni.downloadFile({
          url: asset.url,
          filePath: temporary,
          header: {},
          timeout: PAGE_SHARE_DOWNLOAD_TIMEOUT_MS,
          success: (result) => {
            if (settled) {
              remove()
              return
            }
            if (result.statusCode !== 200 || !fileAvailable(asset, temporary)) fail()
            else verify(temporary, fail)
          },
          fail
        })
      } catch {
        fail()
      }
    }
    try {
      if (!uni.env?.USER_DATA_PATH || !/^[a-z\d-]+(?:@3x)?\.jpg$/.test(asset.file)) {
        fail()
        return
      }
      path = `${uni.env.USER_DATA_PATH}/${PAGE_SHARE_CACHE_PREFIX}${asset.file}`
      if (fileAvailable(asset, path)) verify(path, download)
      else download()
    } catch {
      fail()
    }
  })
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve(asset.url)
  // #endif
}

/** 创建通用分享封面的缓存边界
 * @param assets 两个渠道各自的远程图片和本地兜底配置
 */
export const createPageShareCoverCache = (assets: PageShareCoverAssets) => {
  const prepared = reactive({ friends: '', timeline: '' })
  const pending: Partial<Record<ShareChannel, Promise<void>>> = {}
  /** 同步返回当前可用图，系统回收缓存后立即使用包内兜底
   * @param channel 原生分享对应的好友或朋友圈渠道
   */
  const image = (channel: ShareChannel) => {
    if (runtimeMode.update()) return assets[channel].fallback
    if (fileAvailable(assets[channel], prepared[channel])) return prepared[channel]
    prepared[channel] = ''
    return assets[channel].fallback
  }
  /** 两个渠道各自去重和重试，单张失败不阻塞另一渠道 */
  const prepare = async () => {
    if (runtimeMode.update()) return
    cleanDeferredDownloads()
    await Promise.all(
      Object.values(ShareChannel).map((channel) => {
        if (pending[channel]) return pending[channel]
        if (image(channel) !== assets[channel].fallback) return
        const run = prepareCover(assets[channel])
          .then((path) => {
            prepared[channel] = path === assets[channel].fallback ? '' : path
          })
          .finally(() => {
            delete pending[channel]
          })
        pending[channel] = run
        return run
      })
    )
  }
  return { image, prepare }
}
