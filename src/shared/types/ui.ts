import type { ComputedRef } from 'vue'

export interface PageScrollLock {
  acquire: () => () => void
  pageStyle: ComputedRef<string>
  scrollLocked: ComputedRef<boolean>
}

export type InputValueEvent<T> = { detail: { value: T } }

export type ScrollOffset = { scrollTop: number }

export type PageScrollEvent = { detail: { scrollTop: number } }

export type ScrollTopRect = { top: number }

export type ScrollBottomRect = { bottom: number }
