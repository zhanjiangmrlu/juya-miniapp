import { runtimeMode } from '@/services/runtime-mode'
import { SESSION_STORAGE_KEY } from '@/shared/constants/account'

import type { StoredSession } from '@/shared/types/account'
import type { StudyNoteFile, StudyNoteTask } from '@/shared/types/study-note'

/** 删除本次原生下载拥有的文件，path 为该次请求的独占临时路径 */
const temporaryFile = (path: string): StudyNoteFile => {
  let released = false
  return {
    path,
    release: () => {
      if (released) return
      released = true
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
    if (!credential?.access_token) {
      reject(new Error('请重新登录后重试'))
      return
    }
    const suffix = Array.from(identity)
      .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0)
      .toString(36)
    const path = `${uni.env.USER_DATA_PATH}/study-note-${suffix}-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`,
      file = temporaryFile(path)
    let settled = false,
      unsubscribe = () => undefined as void
    const download = uni.downloadFile({
      url,
      filePath: path,
      timeout: 60000,
      header: { Authorization: `Bearer ${credential.access_token}` },
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
                    ? '当前无权获取笔记，请确认学习授权'
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
    })
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
