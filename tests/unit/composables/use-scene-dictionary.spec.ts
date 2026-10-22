import { expect, it, vi } from 'vitest'

import { useSceneDictionary } from '@/composables/use-scene-dictionary'

const token = {
  text: 'went',
  word: true,
  start: 3,
  end: 7,
  line_id: 'line-1',
  highlight: false,
  colorIndex: 0
}
const result = (word = 'went') => ({
  word,
  lemma: 'go',
  phonetic: '/went/',
  source: 'dictionary' as const,
  definitions: [{ part_of_speech: 'v.', meaning: '去的过去式' }],
  speech_text: word,
  provider: 'fixture'
})
/** 创建无播放器副作用的查词端口，发音仅由明确点击触发 */
const setup = () => {
  const request = vi.fn(),
    playSpeech = vi.fn(),
    stopSpeech = vi.fn(),
    dispose = vi.fn(),
    load = vi.fn(() => 'local-word'),
    onFailure = vi.fn()
  const context = { cardId: 'card', versionId: 'v1', owner: 'owner' }
  const dictionary = useSceneDictionary({
    context: () => context,
    request,
    playSpeech,
    stopSpeech,
    prepareSpeech: () => ({ load, dispose, invalidate: vi.fn() }),
    onFailure
  })
  return { dictionary, request, playSpeech, stopSpeech, dispose, load, context, onFailure }
}

it('queries exact clicked source without playing and preserves original word separately from lemma', async () => {
  const { dictionary, request, playSpeech, load } = setup()
  request.mockResolvedValue(result())
  await dictionary.open(token)
  expect(request).toHaveBeenCalledWith(
    '/api/mini/v1/cards/card/dictionary?version_id=v1&word=went&line_id=line-1&start=3&end=7'
  )
  expect(dictionary.result.value?.word).toBe('went')
  expect(dictionary.result.value?.lemma).toBe('go')
  expect(playSpeech).not.toHaveBeenCalled()
  expect(load).not.toHaveBeenCalled()
  dictionary.play()
  expect(playSpeech).toHaveBeenCalledTimes(1)
  dictionary.close()
})

it('rejects late results after switching words and stops only the previous popup speech on close', async () => {
  const { dictionary, request, stopSpeech, dispose } = setup()
  let finish: (value: ReturnType<typeof result>) => void = () => undefined
  request
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    .mockResolvedValueOnce(result('mobile'))
  const first = dictionary.open(token)
  await dictionary.open({ ...token, text: 'mobile', start: 9, end: 15 })
  finish(result('went'))
  await first
  expect(dictionary.result.value?.word).toBe('mobile')
  dictionary.close()
  expect(dictionary.selection.value).toBe(null)
  expect(stopSpeech).toHaveBeenCalledTimes(2)
  expect(dispose).toHaveBeenCalledTimes(2)
})

it('shows a real failure separately from configured missing results and retries without inventing a definition', async () => {
  const { dictionary, request } = setup()
  request
    .mockRejectedValueOnce(new Error('词典服务暂未配置'))
    .mockResolvedValueOnce({ ...result(), source: 'missing', definitions: [] })
  await dictionary.open(token)
  expect(dictionary.error.value).toBe('词典服务暂未配置')
  expect(dictionary.result.value).toBe(null)
  await dictionary.retry()
  expect(dictionary.error.value).toBe('')
  expect(dictionary.result.value?.source).toBe('missing')
  dictionary.close()
})

it('never exposes an old account or publication response and ignores pure punctuation', async () => {
  const { dictionary, request, context } = setup()
  await dictionary.open({ ...token, text: ',', word: false })
  expect(request).not.toHaveBeenCalled()
  let finish: (value: ReturnType<typeof result>) => void = () => undefined
  request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      })
  )
  const pending = dictionary.open(token)
  context.owner = 'another'
  context.versionId = 'v2'
  finish(result())
  await pending
  expect(dictionary.result.value).toBe(null)
  expect(dictionary.selection.value).toBe(null)
})
