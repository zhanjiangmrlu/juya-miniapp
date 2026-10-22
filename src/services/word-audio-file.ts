import { WORD_ADDRESS_LIFETIME_MS, WORD_AUDIO_FILE_PREFIX } from '@/shared/constants/media'

import type { AudioCacheFile, AudioPreparationCancellation } from '@/shared/types/audio'
import type { WordAudioCancellation, WordAudioFile } from '@/shared/types/pronunciation'

import { ApiError } from './errors'
import { runtimeMode } from './runtime-mode'

let lastSweep = Number.NEGATIVE_INFINITY

/** 清理上次异常退出遗留的过期音频，只处理本功能拥有的文件 */
const sweepExpiredWordAudio = () => {
  const now = Date.now(),
    fs = uni.getFileSystemManager()
  if (now - lastSweep < WORD_ADDRESS_LIFETIME_MS || typeof fs.readdir !== 'function') return
  lastSweep = now
  fs.readdir({
    dirPath: uni.env.USER_DATA_PATH,
    success: (result) => {
      for (const name of result.files) {
        if (!name.startsWith(WORD_AUDIO_FILE_PREFIX)) continue
        const created = Number(name.slice(WORD_AUDIO_FILE_PREFIX.length).split('-')[0])
        if (Number.isFinite(created) && now - created >= WORD_ADDRESS_LIFETIME_MS)
          temporaryWordAudio(`${uni.env.USER_DATA_PATH}/${name}`).release()
      }
    },
    fail: () => undefined
  })
}

/** 只释放本次下载拥有的临时文件，重复释放不影响其他资源
 * @param src 当前下载返回的临时文件路径
 */
const temporaryWordAudio = (src: string): WordAudioFile => {
  let released = false
  return {
    src,
    release: () => {
      if (released || !src) return
      released = true
      try {
        uni.getFileSystemManager().unlink({ filePath: src, fail: () => undefined })
      } catch {
        /* 系统已回收的临时文件无需重复删除 */
      }
    }
  }
}

/** 按实际文件头补齐播放器需要的扩展名，不将 WAV 误标成 MP3
 * @param src 本次下载拥有的无扩展名缓存路径
 */
const playableAudioFile = (src: string): WordAudioFile => {
  const fs = uni.getFileSystemManager(),
    header = new Uint8Array(fs.readFileSync(src, undefined, 0, 12) as ArrayBuffer)
  const mp3 =
    (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) ||
    (header[0] === 0xff && (header[1]! & 0xe0) === 0xe0 && (header[1]! & 0x06) !== 0)
  const wav =
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x41 &&
    header[10] === 0x56 &&
    header[11] === 0x45
  if (!mp3 && !wav) throw new Error('音频文件格式暂不可用')
  const path = `${src}.${mp3 ? 'mp3' : 'wav'}`
  fs.renameSync(src, path)
  return temporaryWordAudio(path)
}

/** 下载当前受控词汇音频，取消和迟到响应均清理本次文件
 * @param url 已经校验来源的短期发音地址
 * @param task 当前页面或词汇任务的取消边界
 */
export const downloadWordAudio = (
  url: string,
  task: WordAudioCancellation
): Promise<WordAudioFile> =>
  new Promise((resolve, reject) => {
    runtimeMode.assertPrivate()
    if (!task.active()) {
      reject(new Error('试听已取消'))
      return
    }
    sweepExpiredWordAudio()
    // 微信默认下载临时目录只读，指定自有缓存路径才可以在到期或离页后清理
    const filePath = `${uni.env.USER_DATA_PATH}/${WORD_AUDIO_FILE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`
    let settled = false,
      unsubscribe = () => {}
    /** 取消后先拒绝任务，避免原生 abort 的同步回调重复完成 */
    const cancel = () => {
      if (settled) return
      settled = true
      unsubscribe()
      reject(new Error('试听已取消'))
      download?.abort()
      temporaryWordAudio(filePath).release()
    }
    const download = uni.downloadFile({
      url,
      filePath,
      timeout: 20000,
      success: (result) => {
        const file = temporaryWordAudio(filePath)
        if (settled || !task.active()) {
          file.release()
          if (!settled) {
            settled = true
            unsubscribe()
            reject(new Error('试听已取消'))
          }
          return
        }
        settled = true
        unsubscribe()
        if (result.statusCode !== 200) {
          file.release()
          reject(new ApiError('word_audio_download_failed', '发音暂不可用', result.statusCode))
        } else {
          try {
            // 保留实际格式对应的扩展名，供 iPhone 原生播放器识别本地音源
            resolve(playableAudioFile(filePath))
          } catch (reason) {
            file.release()
            reject(reason)
          }
        }
      },
      fail: () => {
        if (settled) return
        settled = true
        unsubscribe()
        temporaryWordAudio(filePath).release()
        reject(new Error('音频下载暂未成功'))
      }
    })
    if (!settled) unsubscribe = task.onCancel(cancel)
  })

/** 为词汇或完整对话准备可清理的本地音源，其他平台保留受控地址
 * @param url 已确认的短期发音地址
 * @param task 当前页面或词汇任务的取消边界
 */
export const prepareAudioCacheFile = (
  url: string,
  task: AudioPreparationCancellation
): Promise<AudioCacheFile> => {
  runtimeMode.assertPrivate()
  // #ifdef MP-WEIXIN
  return downloadWordAudio(url, task)
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve({ src: url, release: () => undefined })
  // #endif
}

/** 保留词汇准备入口，复用相同的下载与文件回收边界
 * @param url 已确认的短期词汇地址
 * @param task 当前词汇任务的取消边界
 */
export const prepareWordAudioFile = (url: string, task: WordAudioCancellation) =>
  prepareAudioCacheFile(url, task)
