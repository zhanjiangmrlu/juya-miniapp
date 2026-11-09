import type {
  AnalyticsAction,
  AnalyticsErrorKind,
  AnalyticsEvent,
  AnalyticsStage
} from '../enums/analytics'
import type { StoragePort } from './runtime'
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
export interface AnalyticsPorts {
  config: AnalyticsConfig
  storage: StoragePort
  currentPage: () => string
  pageProperties?: () => AnalyticsProperties
  now?: () => number
  isPermitted?: () => boolean
  onConsentChanged?: (agreed: boolean) => void
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
  storageNamespace?: string
}
