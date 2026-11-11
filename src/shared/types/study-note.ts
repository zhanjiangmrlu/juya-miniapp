import type { components } from '@/shared/contracts/generated/mini-api'
import type { OperationSession } from '@/shared/types/operations'

export type StudyNoteScene = Pick<
  components['schemas']['PublishedDetail'],
  'card_id' | 'version_id' | 'study_note'
>
export interface StudyNoteFile {
  path: string
  release: () => void
}
export interface StudyNoteContext {
  cardId: string
  bodyVersion: string
  noteVersion?: string
}
export interface StudyNoteTask {
  active: () => boolean
  onCancel: (callback: () => void) => () => void
}
export interface StudyNotePorts {
  userId: () => string | null
  context: () => StudyNoteContext | null
  ensure: () => Promise<boolean>
  request: OperationSession['request']
  resource: (url: string) => string
  pause: () => void
  accept: (scene: StudyNoteScene) => void
  invalid: (reason: unknown) => void
  refreshBody?: () => Promise<void>
  download: (url: string, identity: string, task: StudyNoteTask) => Promise<StudyNoteFile>
  open: (path: string) => Promise<void>
  onReady?: () => void
  onError?: (reason: unknown, stage: 'validation' | 'download' | 'open') => void
}
