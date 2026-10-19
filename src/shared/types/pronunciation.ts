import type { components } from '@/shared/contracts/generated/mini-api'
import type { AudioCacheFile, AudioPreparationCancellation } from '@/shared/types/audio'
export type PronunciationState = components['schemas']['SpeechState']
export type PronunciationReference = components['schemas']['SpeechReference']
export interface PronunciationPorts {
  request: (
    method: 'GET' | 'POST',
    path: string,
    reference: PronunciationReference
  ) => Promise<PronunciationState>
  pause: (milliseconds: number) => Promise<void>
  active: () => boolean
}

export type WordAudioCancellation = AudioPreparationCancellation
export type WordAudioFile = AudioCacheFile
export interface WordAudioPreparationPorts {
  resolve: (wordId: string, task: WordAudioCancellation) => Promise<string>
  download: (url: string, task: WordAudioCancellation) => Promise<WordAudioFile>
  active: () => boolean
  onFailure: (reason: unknown) => void
}
export interface PreparedWordAudio {
  file: WordAudioFile
  expires: number
  timer: ReturnType<typeof setTimeout>
}
export interface WordAudioPreparationJob {
  promise: Promise<string>
  cancel: () => void
}
