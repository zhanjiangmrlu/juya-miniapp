import type {
  AnalyticsAction,
  AnalyticsErrorKind,
  AnalyticsEvent,
  AnalyticsStage
} from '../enums/analytics'
import type { CanonicalAnalyticsEvent } from './privacy'
export interface AnalyticsConfig {
  enabled: boolean
  appKey: string
  environment: 'test' | 'production' | 'disabled'
}
export type { AnalyticsEvent } from '../enums/analytics'
export interface AnalyticsProperties {
  content_type?: 'scene' | 'listening'
  content_id?: string
  entry_source?: string
  auth_state?: 'guest' | 'logged_in'
  favorite?: number
  channel?: 'friends' | 'timeline'
  page_path?: string
  duration_ms?: number
  version_id?: string
  audio_kind?: 'full' | 'word'
  word_id?: string
  position_s?: number
  audio_duration_s?: number
  playback_rate?: number
  trigger?: 'control' | 'system' | 'native'
  target_page?: string
  tab_id?: string
  category_id?: string
  expanded?: number
  action?: AnalyticsAction
  stage?: AnalyticsStage
  error_kind?: AnalyticsErrorKind
}

export type AudioAnalyticsObserver = (
  event: AnalyticsEvent,
  properties: AnalyticsProperties
) => void
export type AudioActionOrigin = 'control' | 'system' | 'restore'
export type AnalyticsMethod = (...args: unknown[]) => unknown
export interface AnalyticsSDK {
  [key: string]: unknown
  setUserid?: AnalyticsMethod
  init: AnalyticsMethod
  resume: AnalyticsMethod
  pause: AnalyticsMethod
  trackEvent: AnalyticsMethod
  trackPageStart: AnalyticsMethod
  trackPageEnd: AnalyticsMethod
  trackShare: AnalyticsMethod
  messager?: {
    messageType: { UMA_LIB_INITED: string | number }
    once: (event: string | number, callback: () => void) => void
  }
}
export interface AnalyticsRuntimeContext {
  owner: string | null
  revision: number
  enabled: boolean
  scopeVersion: string
  policiesReady: boolean
}
export interface AnalyticsConfigurePorts {
  context: () => AnalyticsRuntimeContext
  authorize: (event: CanonicalAnalyticsEvent) => Promise<void>
  currentPage: () => string
}
export interface AnalyticsSDKScope {
  wx: Record<string, unknown>
  App: (value: unknown) => unknown
  Page: (value: unknown) => unknown
  Component: (value: unknown) => unknown
  setTimeout: (callback: () => void, delay?: number) => number
  clearTimeout: (id: number) => void
  setInterval: (callback: () => void, delay?: number) => number
  clearInterval: (id: number) => void
}
export type AnalyticsSDKFactory = (scope: AnalyticsSDKScope) => AnalyticsSDK
export interface AnalyticsPorts {
  config: AnalyticsConfig
  createSDK?: AnalyticsSDKFactory
  native?: () => Record<string, unknown>
  key?: () => string
  now?: () => number
}

export interface AnalyticsPageVisit {
  route: string
  started: number
  properties: AnalyticsProperties
}
export interface AnalyticsPageContext {
  route?: string
  options?: Record<string, unknown>
}

export interface PendingAnalyticsEvent {
  event: AnalyticsEvent
  properties: AnalyticsProperties
  operationKey?: string
}

export interface AnalyticsNativePorts {
  native: () => Record<string, unknown>
  hasConsent: () => boolean
  owner: string
}
