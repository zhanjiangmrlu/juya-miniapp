import { runtimeMode } from '@/services/runtime-mode'
import { SESSION_STORAGE_KEY } from '@/shared/constants/account'
import { LEARNING_FEATURES } from '@/shared/constants/learning-features'

import type { StoredSession } from '@/shared/types/account'
import type { StudyNoteFile, StudyNoteTask } from '@/shared/types/study-note'

const activeFiles = new Set<string>()

/** 清扫上次进程遗留的笔记，只处理本功能生成且当前无人使用的私有文件
 * @param dir 当前微信账号的用户文件目录
 */
const sweepOrphans = (dir: string) => {
  try {
    const fs = uni.getFileSystemManager()
    for (const name of fs.readdirSync(dir)) {
      if (!/^study-note-[0-9a-z]{1,7}-[0-9]{13}-[0-9a-z]*\.pdf$/.test(name)) continue
      const path = `${dir}/${name}`
      if (activeFiles.has(path)) continue
      try {
        fs.unlinkSync(path)
      } catch {
        /* 单个文件可能已被系统回收，继续处理其余遗留文件 */
      }
    }
  } catch {
    /* 微信文件目录可能暂时不可访问，后续下载将重新清扫 */
  }
}
/** 删除本次原生下载拥有的文件，path 为该次请求的独占临时路径 */
const temporaryFile = (path: string): StudyNoteFile => {
  let released = false
  return {
    path,
    release: () => {
      if (released) return
      released = true
      activeFiles.delete(path)
      try {
        uni.getFileSystemManager().unlink({ filePath: path, fail: () => undefined })
      } catch {
        /* 系统可能已回收文件 */
      }
    }
  }
}
/** 下载受控PDF，按账号、卡片和附件独立版本隔离且取消后清理
 * @param url 本次新签发的受控资源地址
 * @param identity 当前账号、卡片和独立笔记版本的隔离标识
 * @param task 本次查看请求的取消和迟到响应边界
 */
export const downloadStudyNote = (
  url: string,
  identity: string,
  task: StudyNoteTask
): Promise<StudyNoteFile> =>
  new Promise((resolve, reject) => {
    runtimeMode.assertPrivate()
    if (!task.active()) {
      reject(new Error('查看已取消'))
      return
    }
    if (!uni.env?.USER_DATA_PATH || typeof uni.openDocument !== 'function') {
      reject(new Error('请在微信小程序内查看学习笔记'))
      return
    }
    const credential = uni.getStorageSync(SESSION_STORAGE_KEY) as StoredSession | undefined
    const publicTicket = /\/api\/mini\/v1\/public\/resources\/pub1_[^/?#]+$/.test(url)
    if (!publicTicket && !credential?.access_token) {
      reject(new Error('请重新登录后重试'))
      return
    }
    const suffix = Array.from(identity)
      .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
      .toString(36)
    const path = `${uni.env.USER_DATA_PATH}/study-note-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`,
      file = temporaryFile(path)
    activeFiles.add(path)
    sweepOrphans(uni.env.USER_DATA_PATH)
    let settled = false,
      unsubscribe = () => undefined as void
    const options = {
      url,
      filePath: path,
      timeout: 60000,
      header: publicTicket ? {} : { Authorization: `Bearer ${credential!.access_token}` },
      success: (result) => {
        if (settled || !task.active()) {
          temporaryFile(path).release()
          if (!settled) reject(new Error('查看已取消'))
          settled = true
          unsubscribe()
          return
        }
        settled = true
        unsubscribe()
        if (result.statusCode !== 200) {
          file.release()
          reject(
            new Error(
              result.statusCode === 409
                ? '笔记已更新，请重试获取当前版本'
                : result.statusCode === 401
                  ? '登录已失效，请重新登录'
                  : result.statusCode === 403
                    ? LEARNING_FEATURES.authorization
                      ? '当前无权获取笔记，请确认学习授权'
                      : '暂未开放'
                    : `文件请求未成功（${result.statusCode}），请重试`
            )
          )
          return
        }
        resolve(file)
      },
      fail: () => {
        if (settled) return
        settled = true
        unsubscribe()
        file.release()
        reject(new Error('网络中断，请检查网络后重试'))
      }
    } satisfies UniApp.DownloadFileOption
    let download: UniApp.DownloadTask
    try {
      download = uni.downloadFile(options)
    } catch (reason) {
      file.release()
      reject(reason)
      return
    }
    if (!settled)
      unsubscribe = task.onCancel(() => {
        if (settled) return
        settled = true
        unsubscribe()
        download.abort()
        file.release()
        reject(new Error('查看已取消'))
      })
  })
/** 调用微信原生PDF预览，path 为本次受控下载的独占文件 */
export const openStudyNoteDocument = (path: string): Promise<void> =>
  new Promise((resolve, reject) => {
    // #ifdef MP-WEIXIN
    uni.openDocument({
      filePath: path,
      fileType: 'pdf',
      showMenu: false,
      success: () => resolve(),
      fail: () => reject(new Error('微信文档预览未成功，请重试'))
    })
    // #endif
    // #ifndef MP-WEIXIN
    reject(new Error('请在微信小程序内查看学习笔记'))
    // #endif
  })
