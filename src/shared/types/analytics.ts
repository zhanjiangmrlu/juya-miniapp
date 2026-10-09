import type { ANALYTICS_EVENT_FIELDS } from '@/shared/constants/analytics'
import type { AnalyticsEvent } from '@/shared/enums/analytics'

export type AnalyticsParams<E extends AnalyticsEvent = AnalyticsEvent> = Partial<
  Record<(typeof ANALYTICS_EVENT_FIELDS)[E][number] | 'page_code', string>
>
export interface AnalyticsStorage {
  read: (key: string) => unknown
  write: (key: string, value: unknown) => void
}
export interface AnalyticsDriver {
  start: () => Promise<void>
  stop: () => void
  resume: (launch?: AnalyticsLaunch) => void
  pause: () => void
  pageStart: (route: string) => void
  pageEnd: (route: string) => void
  track: (event: AnalyticsEvent, params: Record<string, string>) => void
}
export interface AnalyticsServiceOptions {
  enabled: boolean
  clientVersion: string
  storage: AnalyticsStorage
  driver: AnalyticsDriver
}
export interface AnalyticsTrackOptions {
  token?: number
  once?: string
}

export interface AnalyticsLaunch {
  scene?: number
  path?: string
  query?: Record<string, unknown>
  referrerInfo?: { appId?: string }
}
export interface AnalyticsNativeCall {
  key?: string
  url?: string
  data?: unknown
  success?: (result: unknown) => void
  fail?: (result: unknown) => void
  complete?: (result: unknown) => void
  [key: string]: unknown
}
export interface AnalyticsRequestTask {
  abort?: () => void
}
export interface AnalyticsNative {
  request: (options: AnalyticsNativeCall) => AnalyticsRequestTask
  getStorageSync: (key: string) => unknown
  setStorageSync: (key: string, value: unknown) => void
  getStorageInfoSync: () => { keys: string[] }
  removeStorageSync: (key: string) => void
  getSystemInfo: (options: AnalyticsNativeCall) => unknown
  getNetworkType: (options: AnalyticsNativeCall) => unknown
  getAccountInfoSync?: () => unknown
  getLaunchOptionsSync?: () => AnalyticsLaunch
  onNetworkStatusChange: (listener: (event: unknown) => void) => void
  offNetworkStatusChange?: (listener: (event: unknown) => void) => void
}
export interface UmengSdk {
  init: (config: Record<string, unknown>) => void
  messager: { once: (event: number, callback: () => void) => void }
  resume: (options: AnalyticsLaunch) => void
  pause: () => void
  trackPageStart: (route: string) => void
  trackPageEnd: (route: string) => void
  trackEvent: (event: string, params: Record<string, string>) => void
}
export interface UmengScope {
  wx: Record<string, unknown>
  setTimeout: (callback: () => void, delay?: number) => ReturnType<typeof setTimeout>
  clearTimeout: (timer: ReturnType<typeof setTimeout>) => void
  setInterval: (callback: () => void, delay?: number) => ReturnType<typeof setInterval>
  clearInterval: (timer: ReturnType<typeof setInterval>) => void
}
export type UmengSdkFactory = (scope: UmengScope) => UmengSdk
