import { computed, ref } from 'vue'

import { ApiError, isUnconfirmedFailure } from '@/services/errors'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_IMAGE_LIMIT,
  FEEDBACK_TEXT_LIMIT
} from '@/shared/constants/feedback'
import { FeedbackCategory, FeedbackSource, FeedbackUploadStatus } from '@/shared/enums/feedback'

import type {
  FeedbackAttachment,
  FeedbackDetail,
  FeedbackDraftPorts,
  FeedbackImage
} from '@/shared/types/feedback'

/** 持有本人本次反馈输入，上传与未知提交分别恢复
 * @param ports 本人会话、持久幂等及当前反馈来源
 */
export const createFeedbackDraft = (ports: FeedbackDraftPorts) => {
  const text = ref(''),
    category = ref<FeedbackCategory | null>(null),
    images = ref<FeedbackAttachment[]>([]),
    busy = ref(false),
    error = ref(''),
    unknown = ref(false),
    retryOriginal = ref(false),
    refill = ref(false),
    locked = ref(false),
    source = ref(ports.source || { source: FeedbackSource.PROFILE })
  let generation = 0,
    frozenBody: unknown = null
  const active = computed(() => !locked.value),
    uploading = computed(() =>
      images.value.some((item) => item.status === FeedbackUploadStatus.UPLOADING)
    ),
    dirty = computed(() => Boolean(text.value || category.value || images.value.length)),
    count = computed(() => Array.from(text.value.trim()).length)
  /** 当前写入仍须属于打开编辑器时的本人 */
  const valid = () => !locked.value && ports.session.userId() === ports.owner
  /** 仅当前本人且无待确认提交时修改说明
   * @param value 本次编辑的原始说明
   */
  const updateText = (value: string) => {
    if (valid() && !busy.value && (!unknown.value || refill.value)) text.value = value
  }
  /** 选择本次反馈分类，不改动未知提交的冻结正文
   * @param value 用户明确选择的问题分类
   */
  const selectCategory = (value: FeedbackCategory) => {
    if (valid() && !busy.value && (!unknown.value || refill.value)) category.value = value
  }
  /** 未提交输入可放弃，未知事务离开仍保留本人恢复快照，换号或结果确定才彻底清除
   * @param force 账号切换或已确定结果时销毁个人输入
   */
  const discard = (force = false) => {
    generation++
    busy.value = false
    error.value = ''
    retryOriginal.value = false
    if (unknown.value && !force) return
    text.value = ''
    category.value = null
    images.value = []
    frozenBody = null
    refill.value = false
    unknown.value = false
  }
  /** 会话失效立即遮蔽并暂停编辑，保留同账号内存草稿 */
  const lock = () => {
    generation++
    locked.value = true
    busy.value = false
    for (const item of images.value)
      if (item.status === FeedbackUploadStatus.UPLOADING) {
        item.status = FeedbackUploadStatus.ERROR
        item.error = '请重新登录后确认上传结果'
      }
  }
  /** 确认成功后清理本次输入，不提前改变服务端状态
   * @param value 已由服务器接受的反馈快照
   */
  const accept = (value: FeedbackDetail | null) => {
    if (value) {
      discard(true)
      unknown.value = false
    }
    return value
  }
  /** 查询持久原操作，默认只读，不自动重发私有说明 */
  const recover = async () => {
    if (!valid() || busy.value) return null
    busy.value = true
    error.value = ''
    const run = generation
    try {
      const value = await ports.operations.recover<FeedbackDetail>(ports.action, { retry: false })
      return valid() && run === generation ? accept(value) : null
    } catch (reason) {
      if (valid() && run === generation) {
        const missing = reason instanceof ApiError && reason.code === 'operation_unknown'
        retryOriginal.value = missing && Boolean(frozenBody)
        refill.value = missing && !frozenBody
        error.value = retryOriginal.value
          ? '尚未查到结果，可明确重试原提交'
          : refill.value
            ? '原说明已不在内存中。可重新填写，仍用原操作标识确认；不会另建重复操作'
            : reason instanceof Error
              ? reason.message
              : '提交结果暂未确认'
      }
      return null
    } finally {
      if (run === generation) busy.value = false
    }
  }
  /** 同账号重新进入先查回执，换账号只清理不提交 */
  const resume = async () => {
    if (ports.session.userId() !== ports.owner) {
      if (ports.session.userId()) discard(true)
      lock()
      return null
    }
    locked.value = false
    unknown.value = ports.operations.pending(ports.action)
    return unknown.value ? recover() : null
  }
  /** 上传一张失败项，成功附件不重复上传
   * @param key 所选截图的稳定本地操作标识
   */
  const upload = async (key: string) => {
    const item = images.value.find((row) => row.key === key)
    if (!item || item.image || !valid() || (unknown.value && !refill.value) || busy.value) return
    item.status = FeedbackUploadStatus.UPLOADING
    item.error = ''
    const run = generation,
      action = `feedback:image:${key}`
    try {
      let value: FeedbackImage | null = null
      if (ports.operations.pending(action)) {
        try {
          value = await ports.operations.recover<FeedbackImage>(action, { retry: false })
        } catch (reason) {
          if (
            !(reason instanceof ApiError) ||
            reason.code !== 'operation_unknown' ||
            !valid() ||
            run !== generation
          )
            throw reason
          // 用户明确重试时，同账号已重查无回执，仍使用原路径和原幂等键
          value = await ports.operations.run<FeedbackImage>(
            action,
            '/api/mini/v1/feedback/images',
            'POST',
            { file_path: item.path }
          )
        }
      } else
        value = await ports.operations.run<FeedbackImage>(
          action,
          '/api/mini/v1/feedback/images',
          'POST',
          { file_path: item.path }
        )
      if (valid() && run === generation && value) {
        item.image = value
        item.status = FeedbackUploadStatus.READY
      }
    } catch (reason) {
      if (run === generation) {
        item.status = FeedbackUploadStatus.ERROR
        item.error = reason instanceof Error ? reason.message : '截图上传失败，请重试'
      }
    }
  }
  /** 仅加入剩余数量的截图并各自上传，失败项仍留在原位
   * @param paths 平台选择得到的本地临时图片路径
   */
  const addImages = async (paths: string[]) => {
    if (!valid() || (unknown.value && !refill.value) || busy.value) return
    const added = paths.slice(0, FEEDBACK_IMAGE_LIMIT - images.value.length).map((path) => ({
      key: ports.key(),
      path,
      status: FeedbackUploadStatus.ERROR,
      error: '',
      image: null
    }))
    images.value.push(...added)
    await Promise.all(added.map((item) => upload(item.key)))
  }
  /** 明确移除一个失败或已上传附件，不影响其他成功引用
   * @param key 本地附件操作标识
   */
  const remove = (key: string) => {
    if (valid() && !busy.value && (!unknown.value || refill.value) && !uploading.value)
      images.value = images.value.filter((item) => item.key !== key)
  }
  /** 成功截图过期只续签预览授权，不重新上传
   * @param key 已成功上传的截图操作标识
   */
  const renew = async (key: string) => {
    const item = images.value.find((row) => row.key === key)
    if (!item?.image || !valid()) return null
    const run = generation
    try {
      const value = await ports.session.request<FeedbackImage>(
        `/api/mini/v1/feedback/images/${encodeURIComponent(item.image.id)}/url`
      )
      if (run !== generation || !valid()) return null
      item.image = value
      item.error = ''
      return value
    } catch (reason) {
      if (run === generation) item.error = reason instanceof Error ? reason.message : '截图暂未获取'
      return null
    }
  }
  /** 校验并提交原说明，结果未知先查询，明确重试仍使用冻结正文与原键 */
  const submit = async (): Promise<FeedbackDetail | null> => {
    if (!valid() || busy.value || uploading.value) return null
    if (ports.operations.pending(ports.action) && !retryOriginal.value && !refill.value) {
      unknown.value = true
      return recover()
    }
    if (!unknown.value || refill.value) {
      error.value = ''
      if (!ports.feedbackId && !FEEDBACK_CATEGORIES.some((item) => item.value === category.value)) {
        error.value = '请选择问题分类'
        return null
      }
      if (count.value < 1 || count.value > FEEDBACK_TEXT_LIMIT) {
        error.value = '请输入1—500字有效说明'
        return null
      }
      if (images.value.some((item) => !item.image)) {
        error.value = '请重试上传失败的截图，或移除后提交'
        return null
      }
      frozenBody = {
        text: text.value.trim(),
        images: images.value.map((item) => item.image!.id),
        ...(!ports.feedbackId
          ? {
              category: category.value,
              source: source.value.source,
              ...(source.value.source === FeedbackSource.SCENE
                ? { card_id: source.value.card_id, version_id: source.value.version_id }
                : {})
            }
          : {})
      }
    }
    if (!frozenBody) {
      error.value = '请先查询上次提交结果'
      return null
    }
    busy.value = true
    error.value = ''
    const run = generation,
      rebinding = refill.value
    refill.value = false
    try {
      const value = rebinding
        ? await ports.operations.rebind<FeedbackDetail>(ports.action, frozenBody)
        : await ports.operations.run<FeedbackDetail>(
            ports.action,
            ports.feedbackId
              ? `/api/mini/v1/feedback/${encodeURIComponent(ports.feedbackId)}/messages`
              : '/api/mini/v1/feedback',
            'POST',
            frozenBody
          )
      return valid() && run === generation ? accept(value) : null
    } catch (reason) {
      if (run === generation && valid()) {
        unknown.value = ports.operations.pending(ports.action)
        if (unknown.value && reason instanceof ApiError && !isUnconfirmedFailure(reason))
          frozenBody = null
        retryOriginal.value = false
        error.value = reason instanceof Error ? reason.message : '提交失败，内容和截图已保留'
      }
      return null
    } finally {
      if (run === generation) busy.value = false
    }
  }
  return {
    text,
    updateText,
    selectCategory,
    category,
    images,
    busy,
    error,
    unknown,
    retryOriginal,
    refill,
    active,
    dirty,
    uploading,
    count,
    source,
    submit,
    recover,
    resume,
    upload,
    addImages,
    remove,
    renew,
    lock,
    discard
  }
}
