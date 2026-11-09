import { ref } from 'vue'

import type { components } from '@/shared/contracts/generated/mini-api'
import type {
  StudyNoteFile,
  StudyNotePorts,
  StudyNoteScene,
  StudyNoteTask
} from '@/shared/types/study-note'

/** 串行重验当前发布笔记并协调原生文档生命周期
 * @param ports 当前账号、详情、音频暂停与原生文档端口
 */
export const createStudyNote = (ports: StudyNotePorts) => {
  const locked = ref(false),
    busy = ref(false),
    error = ref('')
  let generation = 0,
    native = false,
    hidden = false,
    returning = false,
    file: StudyNoteFile | null = null
  const cancellations = new Set<() => void>()
  /** 取消本次下载及文件，不能恢复任何播放意图 */
  const cancel = () => {
    generation++
    for (const callback of cancellations) callback()
    cancellations.clear()
    file?.release()
    file = null
    native = false
    hidden = false
    returning = false
    locked.value = false
    busy.value = false
  }
  /** 原生打开前逐次刷新详情和独立附件票据，不复用旧文件或授权 */
  const open = async () => {
    if (busy.value || locked.value) return
    busy.value = true
    error.value = ''
    const run = ++generation,
      context = ports.context(),
      owner = ports.userId()
    let noteVersion = '',
      stage = '校验',
      downloaded: StudyNoteFile | null = null
    /** 确认下载与原生回调仍属于本账号、卡片和附件版本 */
    const active = () => {
      const current = ports.context()
      return (
        run === generation &&
        owner === ports.userId() &&
        Boolean(
          current &&
          context &&
          current.cardId === context.cardId &&
          current.bodyVersion === context.bodyVersion &&
          (!noteVersion || !('noteVersion' in current) || current.noteVersion === noteVersion)
        )
      )
    }
    const task: StudyNoteTask = {
      active,
      onCancel: (callback) => {
        cancellations.add(callback)
        return () => cancellations.delete(callback)
      }
    }
    try {
      if (!context || !(await ports.ensure()) || !active()) return
      const scene = await ports.request<StudyNoteScene>(
        `/api/mini/v1/cards/${encodeURIComponent(context.cardId)}?mark_started=false`
      )
      if (!active()) return
      if (scene.version_id !== context.bodyVersion) {
        await ports.refreshBody?.()
        if (run === generation && owner === ports.userId()) {
          error.value = '场景内容已更新，已重新获取，请重试查看学习笔记'
          cancel()
        }
        return
      }
      ports.accept(scene)
      const note = scene.study_note
      if (!note || note.state !== 'ready') throw new Error('当前暂无可用学习笔记')
      noteVersion = note.version_id
      const ticket = await ports.request<components['schemas']['ResourceURL']>(
        `/api/mini/v1/cards/${encodeURIComponent(context.cardId)}/media/${encodeURIComponent(note.media_id)}/url?purpose=study_note&study_note_version_id=${encodeURIComponent(note.version_id)}`
      )
      if (!active()) return
      locked.value = true
      ports.pause()
      stage = '下载'
      downloaded = await ports.download(
        ports.resource(ticket.url),
        JSON.stringify([owner, context.cardId, note.version_id]),
        task
      )
      if (!active()) {
        downloaded.release()
        return
      }
      file = downloaded
      stage = '校验'
      // 文件传输期间权限和发布附件仍可能变化，打开本地文件前必须再次经过服务端
      const latest = await ports.request<StudyNoteScene>(
        `/api/mini/v1/cards/${encodeURIComponent(context.cardId)}?mark_started=false`
      )
      if (!active()) {
        downloaded.release()
        if (file === downloaded) file = null
        return
      }
      if (latest.version_id !== context.bodyVersion) {
        await ports.refreshBody?.()
        if (run === generation && owner === ports.userId()) {
          error.value = '场景内容已更新，已重新获取，请重试查看学习笔记'
          cancel()
        }
        return
      }
      const currentNote = latest.study_note
      noteVersion = currentNote?.version_id || ''
      ports.accept(latest)
      if (
        !currentNote ||
        currentNote.state !== 'ready' ||
        currentNote.version_id !== note.version_id ||
        currentNote.media_id !== note.media_id
      )
        throw new Error('学习笔记已更新或移除，请重新获取当前笔记')
      stage = '打开'
      // #ifdef JUYA_ANALYTICS
      try {
        ports.onReady?.()
      } catch {
        /* 观察回调不能阻止文档打开 */
      }
      // #endif
      native = true
      await ports.open(downloaded.path)
      // success/complete 仅说明平台接受打开，保持锁直到确实经历原生 onHide/onShow
      if (!active()) return
      busy.value = false
    } catch (reason) {
      if (run !== generation) {
        // 旧请求只释放自己捕获的文件，不能清除后来一轮下载的共享引用或界面状态
        downloaded?.release()
        if (file === downloaded) file = null
        return
      }
      if (active()) {
        // #ifdef JUYA_ANALYTICS
        try {
          ports.onError?.(
            reason,
            stage === '下载' ? 'download' : stage === '打开' ? 'open' : 'validation'
          )
        } catch {
          /* 观察回调不改变错误处理 */
        }
        // #endif
        error.value = `学习笔记${stage}失败：${reason instanceof Error ? reason.message : '请重试'}`
        ports.invalid(reason)
      }
      if (run === generation) cancel()
    } finally {
      if (run === generation && !native) {
        locked.value = false
        busy.value = false
      }
    }
  }
  /** 文档隐藏阶段保留当前阅读及音频实例，下载中离开则取消 */
  const hide = () => {
    if (native && locked.value) {
      hidden = true
      return true
    }
    if (busy.value) {
      cancel()
      returning = true
      return true
    }
    return false
  }
  /** 仅原生文档真实返回时解除锁，仍由用户手动续播 */
  const show = () => {
    if (returning) {
      returning = false
      return true
    }
    if (!native || !hidden) return false
    cancel()
    return true
  }
  return { locked, busy, error, open, hide, show, cancel }
}
