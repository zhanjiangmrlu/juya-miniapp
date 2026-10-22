import type { DictionaryReference, DictionarySelection } from '@/shared/types/dictionary'

/** 使用原词及UTF16位置构造唯一受控目标，不传入词典原形或自由读音
 * @param reference 服务端需要验证的正文位置
 */
export const dictionaryQuery = (reference: DictionaryReference) =>
  Object.entries({
    version_id: reference.version_id,
    word: reference.word,
    line_id: reference.line_id,
    start: reference.start,
    end: reference.end
  })
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&')
/** 将弹窗目标与已有重点词汇编号隔离，继续共用词音轨
 * @param selection 当前卡片版本与正文原词位置
 */
export const dictionarySpeechKey = (selection: DictionarySelection) =>
  `dictionary:${selection.cardId}:${selection.version_id}:${selection.line_id}:${selection.start}:${selection.end}`
