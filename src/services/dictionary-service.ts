import { dictionaryQuery } from '@/features/learning/dictionary-model'
import { session } from '@/services/api'
import { operationKey, resourceURL } from '@/services/platform'
import { loadPronunciation } from '@/services/pronunciation-service'
import { prepareWordAudioFile } from '@/services/word-audio-file'
import { createWordAudioPreparation, waitForWordAudio } from '@/services/word-audio-preparation'

import type { components } from '@/shared/contracts/generated/mini-api'
import type { DictionarySelection, DictionarySpeechPreparation } from '@/shared/types/dictionary'

/** 复用受控发音任务和文件缓存，不建立第三条播放器
 * @param selection 当前本人版本内的原词与精确位置
 * @param active 页面、账号、版本和弹窗目标仍有效的检查
 * @param onFailure 将访问失效交回当前详情处理
 */
export const createDictionarySpeech = (
  selection: DictionarySelection,
  active: () => boolean,
  onFailure: (reason: unknown) => void
): DictionarySpeechPreparation => {
  const path = `/api/mini/v1/cards/${encodeURIComponent(selection.cardId)}/dictionary/pronunciation`
  const reference = {
    version_id: selection.version_id,
    word: selection.word,
    line_id: selection.line_id,
    start: selection.start,
    end: selection.end
  }
  const prepared = createWordAudioPreparation({
    active,
    resolve: async (_id, task) =>
      resourceURL(
        await loadPronunciation(
          {
            active: task.active,
            pause: (milliseconds) => waitForWordAudio(milliseconds, task),
            request: (method) =>
              session.request<components['schemas']['SpeechState']>(
                method === 'GET' ? `${path}?${dictionaryQuery(reference)}` : path,
                method === 'POST' ? { method, key: operationKey(), body: reference } : {}
              )
          },
          path,
          { version_id: selection.version_id }
        )
      ),
    download: prepareWordAudioFile,
    onFailure
  })
  return {
    load: () => prepared.load('dictionary'),
    dispose: prepared.dispose,
    invalidate: () => prepared.invalidate('dictionary'),
    cancelSelection: prepared.cancelSelection
  }
}
