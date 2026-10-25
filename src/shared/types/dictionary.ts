import type { components } from '@/shared/contracts/generated/mini-api'
import type { OperationSession } from '@/shared/types/operations'

export interface DictionaryToken {
  text: string
  word: boolean
  start: number
  end: number
  line_id: string
  highlight: boolean
  colorIndex: number
}
export type DictionaryReference = components['schemas']['DictionaryReference']
export interface DictionarySelection extends DictionaryReference {
  cardId: string
}
export type DictionaryResult = components['schemas']['DictionaryResult']
export interface DictionaryScope {
  cardId: string
  versionId: string
  owner: string
  accessVersion?: string
}
export interface DictionarySpeechPreparation {
  load: () => string | Promise<string>
  dispose: () => void
  invalidate: () => void
}
export interface DictionaryPorts {
  context: () => DictionaryScope | null
  request: OperationSession['request']
  prepareSpeech: (
    selection: DictionarySelection,
    active: () => boolean
  ) => DictionarySpeechPreparation
  stopSpeech: (key: string) => void
  playSpeech: (key: string, load: () => string | Promise<string>) => void
  onFailure: (reason: unknown) => Promise<void> | void
}
