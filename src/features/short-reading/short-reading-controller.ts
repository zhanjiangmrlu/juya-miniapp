import { ref } from 'vue'

import { createShortReadingProgressQueue } from '@/features/short-reading/short-reading-progress'
import { toShortReadingSummary } from '@/features/short-reading/short-reading-service'
import { ApiError } from '@/services/http/errors'
import { createRequestId } from '@/services/http/request-id'
import { SHORT_READING_DENIED_STATUSES } from '@/shared/constants/short-reading'
import { ShortReadingPageStatus } from '@/shared/enums/short-reading'

import type {
  ShortReadingDetail,
  ShortReadingPosition,
  ShortReadingSummary
} from '@/shared/contracts/short-reading'
import type { HttpStatusCarrier } from '@/shared/types/http'
import type {
  ShortReadingControllerOptions,
  ShortReadingEntryOptions
} from '@/shared/types/short-reading'

/** 判断短文授权或版本已失效，error 为请求或资源签名错误 */
export const isShortReadingDenied = (error: unknown) =>
  SHORT_READING_DENIED_STATUSES.includes((error as HttpStatusCarrier)?.status ?? 0)

/** 编排纯阅读会话，options 为独立短文服务与唯一全局播放端口 */
export const createShortReadingController = (options: ShortReadingControllerOptions) => {
  const detail = ref<ShortReadingDetail>()
  const summary = ref<ShortReadingSummary>()
  const status = ref<ShortReadingPageStatus>(ShortReadingPageStatus.IDLE)
  const translationVisible = ref(false)
  const categorySelected = ref(false)
  const levelSelected = ref(false)
  const completing = ref(false)
  const errorMessage = ref('')
  const contentId = ref('')
  const position = ref<ShortReadingPosition>({ paragraph_id: '', offset: 0 })
  const initialPosition = ref<ShortReadingPosition>()
  const sourceParagraphId = ref<string>()
  let generation = 0
  let suspended = false
  let completionKey: string | undefined
  let completionVersion: number | undefined

  /** 清除局部展示状态，重新进入不沿用标签选色和全文译文 */
  const resetView = () => {
    translationVisible.value = false
    categorySelected.value = false
    levelSelected.value = false
    completing.value = false
    errorMessage.value = ''
    initialPosition.value = undefined
    sourceParagraphId.value = undefined
  }

  /** 只读安全预览，id 为稳定短文ID，request 为当前页面请求代次 */
  const loadPreview = async (id: string, request: number) => {
    try {
      const safe = await options.service.preview(id)
      if (request !== generation || suspended) return
      summary.value = toShortReadingSummary(safe)
      status.value = ShortReadingPageStatus.PREVIEW
    } catch {
      if (request === generation && !suspended) status.value = ShortReadingPageStatus.UNAVAILABLE
    }
  }

  /** 当前授权失效时立即丢弃正文、位置与播放，随后只取安全摘要 */
  const revoke = () => {
    const request = ++generation
    queue.clear()
    queue.pause()
    completionKey = undefined
    detail.value = undefined
    summary.value = undefined
    position.value = { paragraph_id: '', offset: 0 }
    resetView()
    status.value = ShortReadingPageStatus.UNAVAILABLE
    options.audio.dispose()
    if (contentId.value && !suspended) void loadPreview(contentId.value, request)
  }

  const queue = createShortReadingProgressQueue({
    /** 提交本页已授权位置，command 为版本、段落和序号固定的独立短文命令 */
    save: async (command) => {
      const current = detail.value
      if (
        suspended ||
        !current ||
        command.contentId !== current.content_id ||
        command.contentVersion !== current.content_version
      )
        return
      await options.service.savePosition(
        command.contentId,
        command.position,
        command.idempotencyKey
      )
    },
    denied: isShortReadingDenied,
    onDenied: revoke
  })

  /** 重新核验当前短文，id 为稳定ID，previewOnly 禁用正文，entry 为收藏来源版本及精确段落 */
  const initialize = async (
    id?: string,
    previewOnly = false,
    entry: ShortReadingEntryOptions = {}
  ) => {
    const sameId = id === contentId.value
    const pendingVersion = queue.snapshot[0]?.contentVersion
    suspended = false
    const request = ++generation
    queue.pause()
    if (!sameId || entry.contentVersion !== undefined || entry.sourceLocator !== undefined) {
      queue.clear()
      completionKey = undefined
    }
    options.audio.dispose()
    detail.value = undefined
    summary.value = undefined
    resetView()
    contentId.value = id ?? ''
    position.value = { paragraph_id: '', offset: 0 }
    if (!id) {
      queue.clear()
      status.value = ShortReadingPageStatus.UNAVAILABLE
      return
    }
    status.value = ShortReadingPageStatus.LOADING
    if (previewOnly) {
      queue.clear()
      await loadPreview(id, request)
      return
    }
    try {
      const result = await options.service.open(id)
      if (request !== generation || suspended) return
      if (pendingVersion !== undefined && pendingVersion !== result.content_version) queue.clear()
      detail.value = result
      summary.value = toShortReadingSummary(result)
      queue.seed(result.progress.client_sequence)
      const pending = queue.snapshot[0]
      const retry =
        pending?.contentVersion === result.content_version &&
        pending.position.client_sequence > result.progress.client_sequence
          ? pending.position
          : undefined
      const saved = retry ?? result.progress.position
      initialPosition.value =
        saved &&
        (retry || result.progress.content_version === result.content_version) &&
        result.paragraphs_en.some((item) => item.paragraph_id === saved.paragraph_id)
          ? { paragraph_id: saved.paragraph_id, offset: saved.offset }
          : undefined
      if (entry.contentVersion !== undefined || entry.sourceLocator !== undefined) {
        const exact =
          entry.contentVersion === result.content_version &&
          Boolean(entry.sourceLocator) &&
          result.paragraphs_en.filter((item) => item.paragraph_id === entry.sourceLocator)
            .length === 1
        initialPosition.value = exact
          ? { paragraph_id: entry.sourceLocator!, offset: 0 }
          : undefined
        sourceParagraphId.value = exact ? entry.sourceLocator : undefined
        if (!exact) errorMessage.value = '来源内容已更新'
      }
      position.value = initialPosition.value
        ? { ...initialPosition.value }
        : { paragraph_id: result.paragraphs_en[0].paragraph_id, offset: 0 }
      status.value = ShortReadingPageStatus.READY
      queue.resume()
      void queue.flush()
    } catch (error) {
      if (request !== generation || suspended) return
      queue.clear()
      if (isShortReadingDenied(error)) await loadPreview(id, request)
      else {
        status.value = ShortReadingPageStatus.UNAVAILABLE
        errorMessage.value = '加载失败，请重试'
      }
    }
  }

  /** 标签只切本次会话颜色，tag 为类别或题材难度标签 */
  const toggleTag = (tag: 'category' | 'level') => {
    if (!detail.value || suspended) return
    if (tag === 'category') categorySelected.value = !categorySelected.value
    else levelSelected.value = !levelSelected.value
  }

  /** 一次切整篇译文，保留段落锚点与播放器 */
  const toggleTranslation = () => {
    if (detail.value && !suspended) translationVisible.value = !translationVisible.value
  }

  /** 保存真实可解析段落，next 为英文段落锚点和段内像素偏移 */
  const savePosition = (next: ShortReadingPosition) => {
    const current = detail.value
    if (
      suspended ||
      !current ||
      !current.paragraphs_en.some((item) => item.paragraph_id === next.paragraph_id)
    )
      return
    position.value = {
      paragraph_id: next.paragraph_id,
      offset: Math.max(0, Math.round(next.offset))
    }
    // BFF的offset是字符数，页面仅可靠地测量段落与像素，提交段落开头而不混用单位
    queue.enqueue(current.content_id, current.content_version, {
      paragraph_id: next.paragraph_id,
      offset: 0
    })
  }

  /** 播放当前版本唯一全文音频，签名失败失权由受控服务清理正文 */
  const play = async () => {
    const current = detail.value
    const request = generation
    if (!current?.whole_audio || suspended) return
    const signedService = {
      /** 取当前短文音频签名，target 为播放器请求的版本固定目标 */
      getSignedUrl: async (
        target: Parameters<ShortReadingControllerOptions['audio']['play']>[0]
      ) => {
        try {
          return await options.service.getSignedUrl(target)
        } catch (error) {
          // 已提交BFF的RESOURCE_NOT_FOUND仅表示全文资源缺失，映射为可重试播放失败而不撤销正文
          if (
            (error as ApiError)?.status === 404 &&
            (error as ApiError)?.code === 'RESOURCE_NOT_FOUND'
          ) {
            throw new ApiError('SHORT_READING_AUDIO_UNAVAILABLE', '全文音频暂不可用，请重试', 503)
          }
          if (request === generation && isShortReadingDenied(error)) revoke()
          throw error
        }
      }
    }
    await options.audio.play(current.whole_audio, signedService)
  }

  /** 主动提交读完，不要求播放或译文；失败重试沿用同一幂等键 */
  const complete = async (): Promise<boolean> => {
    const current = detail.value
    if (!current || suspended || completing.value) return false
    if (current.progress.completed_at) return true
    const request = generation
    if (completionVersion !== current.content_version) {
      completionKey = undefined
      completionVersion = current.content_version
    }
    completionKey ??= createRequestId()
    completing.value = true
    errorMessage.value = ''
    try {
      const response = await options.service.complete(
        current.content_id,
        current.content_version,
        completionKey
      )
      if (request !== generation || suspended || detail.value !== current) return false
      detail.value = { ...current, progress: response.progress }
      return true
    } catch (error) {
      if (request === generation) {
        if (isShortReadingDenied(error)) revoke()
        else errorMessage.value = '读完未提交，请重试'
      }
      return false
    } finally {
      if (request === generation) completing.value = false
    }
  }

  /** 离页立即停播清正文，saveBeforeHide 为正常离页前是否尽力提交当前段落；注销或失权不提交 */
  const suspend = (saveBeforeHide = false) => {
    if (saveBeforeHide && !suspended && detail.value) void queue.flush()
    suspended = true
    generation++
    queue.pause()
    detail.value = undefined
    summary.value = undefined
    position.value = { paragraph_id: '', offset: 0 }
    resetView()
    options.audio.dispose()
  }

  /** 注销、切账号或销毁页面丢弃本次身份的全部待提交命令 */
  const dispose = () => {
    suspend()
    queue.clear()
    completionKey = undefined
    contentId.value = ''
  }

  return {
    categorySelected,
    complete,
    completing,
    contentId,
    detail,
    dispose,
    errorMessage,
    initialize,
    initialPosition,
    levelSelected,
    play,
    position,
    revoke,
    savePosition,
    status,
    sourceParagraphId,
    summary,
    suspend,
    toggleTag,
    toggleTranslation,
    translationVisible
  }
}
