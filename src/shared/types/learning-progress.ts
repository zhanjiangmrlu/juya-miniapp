import type { StablePosition } from '@/shared/contracts/common'

export type ProgressCommand =
  | {
      idempotencyKey: string
      kind: 'COMPLETE'
      sceneId: string
    }
  | {
      clientSequence: number
      idempotencyKey: string
      kind: 'POSITION'
      position: StablePosition
      sceneId: string
    }

export interface ProgressQueueStorage {
  clear(): void
  load(): ProgressCommand[]
  save(commands: ProgressCommand[]): void
}

export interface ProgressQueueOptions {
  delay?: number
  idFactory?: () => string
}

export type ProgressSender = (command: ProgressCommand, idempotencyKey: string) => Promise<void>

export interface ProgressQueue {
  clear(): void
  enqueueCompletion(sceneId: string): void
  enqueuePosition(sceneId: string, position: StablePosition): void
  flush(): Promise<void>
  readonly snapshot: ProgressCommand[]
}
