import type { StoragePort } from './runtime'
export interface PolicyDocument {
  kind: 'terms' | 'privacy' | 'analytics'
  version: string
  title: string
  content: string
}
export interface PolicyBundle {
  mode: 'legacy' | 'published'
  server_now: string
  documents: PolicyDocument[]
}
export interface AgreementConfirmation {
  confirmation_id: string
  terms_version: string
  privacy_version: string
  client_confirmed_at: string
  source: string
}
export interface PrivacyState {
  agreements: { current?: boolean; accepted?: unknown }
  analytics: {
    enabled: boolean
    scope_version: string
    revision: number
    updated_at: string | null
    collecting: boolean
  }
}
export interface PrivacyPorts {
  namespace?: string
  storage: StoragePort
  key: () => string
  now?: () => number
  policies: () => Promise<PolicyBundle>
  request: <T>(
    path: string,
    options?: { method?: string; body?: unknown; key?: string }
  ) => Promise<T>
}
export interface PrivacyLoginOptions {
  agreement_confirmation?: AgreementConfirmation
  analytics_choice?: { enabled: boolean; scope_version: string }
}
export interface AnalyticsContext {
  owner: string | null
  revision: number
  enabled: boolean
}
export interface CanonicalAnalyticsEvent {
  event_id: string
  event: string
  occurred_at: string
  consent_revision: number
  properties: Record<string, string | number>
  operation_key?: string
}
export interface AnalyticsEventPorts {
  context: () => AnalyticsContext
  key: () => string
  now?: () => number
  send: (event: CanonicalAnalyticsEvent) => Promise<void>
}
