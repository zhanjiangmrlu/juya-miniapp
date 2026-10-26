import { computed, ref } from 'vue'

import { dictionaryQuery, dictionarySpeechKey } from '@/features/learning/dictionary-model'

import type {
  DictionaryPorts,
  DictionaryResult,
  DictionarySelection,
  DictionarySpeechPreparation,
  DictionaryToken
} from '@/shared/types/dictionary'

/** 管理中央查词的最新目标，查询和发音互不自动触发
 * @param ports 当前本人发布上下文、受控请求和共用词音轨端口
 */
export const useSceneDictionary = (ports: DictionaryPorts) => {
  const selection = ref<DictionarySelection | null>(null),
    result = ref<DictionaryResult | null>(null),
    busy = ref(false),
    error = ref('')
  let generation = 0,
    speech: DictionarySpeechPreparation | null = null
  const speechKey = computed(() => (selection.value ? dictionarySpeechKey(selection.value) : ''))
  /** 关闭或切换时取消旧任务，仅停止本弹窗音轨目标 */
  const close = () => {
    generation++
    if (selection.value) ports.stopSpeech(dictionarySpeechKey(selection.value))
    speech?.dispose()
    speech = null
    selection.value = null
    result.value = null
    error.value = ''
    busy.value = false
  }
  /** 对最新原词查询，账号、卡片和版本变化立即使迟到结果失效
   * @param token 当前发布正文的完整英文词元
   */
  const open = async (token: DictionaryToken) => {
    if (!token.word) return
    const context = ports.context()
    if (!context) return
    close()
    const run = generation,
      scope = { ...context }
    const current: DictionarySelection = {
      cardId: scope.cardId,
      version_id: scope.versionId,
      word: token.lookup?.word ?? token.text,
      line_id: token.line_id,
      start: token.lookup?.start ?? token.start,
      end: token.lookup?.end ?? token.end
    }
    selection.value = current
    busy.value = true
    /** 只允许本次选择及本人同一发布版本继续查询或准备音频 */
    const active = () => {
      const value = ports.context()
      return (
        run === generation &&
        value?.owner === scope.owner &&
        value?.cardId === scope.cardId &&
        value?.versionId === scope.versionId &&
        value?.accessVersion === scope.accessVersion
      )
    }
    speech = ports.prepareSpeech(current, active)
    try {
      const value = await ports.request<DictionaryResult>(
        `/api/mini/v1/cards/${encodeURIComponent(scope.cardId)}/dictionary?${dictionaryQuery(current)}`
      )
      if (!active()) {
        if (run === generation) close()
        return
      }
      result.value = value
    } catch (reason) {
      if (!active()) {
        if (run === generation) close()
        return
      }
      await ports.onFailure(reason)
      if (active()) error.value = reason instanceof Error ? reason.message : '查询失败，请重试'
    } finally {
      if (active()) busy.value = false
    }
  }
  /** 重试保持同一原词和位置，不生成假释义 */
  const retry = async () => {
    const current = selection.value
    if (!current || busy.value) return
    await open({
      text: current.word,
      word: true,
      start: current.start,
      end: current.end,
      line_id: current.line_id,
      highlight: false,
      colorIndex: 0
    })
  }
  /** 用户点喇叭才交给共用词音轨播放服务端核验的原词读音 */
  const play = () => {
    if (selection.value && result.value && !busy.value && speech)
      ports.playSpeech(speechKey.value, speech.load)
  }
  /** 原生词音播放失败后丢弃本弹窗缓存，允许明确重试
   * @param key 刚失败的共用词音轨目标编号
   */
  const invalidateSpeech = (key: string) => {
    if (key === speechKey.value) speech?.invalidate()
  }
  return { selection, result, busy, error, speechKey, open, close, retry, play, invalidateSpeech }
}
