import { expect, it } from 'vitest'

import { createAnalyticsService } from '@/services/analytics-service'

import type { AnalyticsPorts, AnalyticsSDK } from '@/shared/types/analytics'

const setup = (enabled = true, extra: Partial<AnalyticsPorts> = {}) => {
  const stored = new Map<string, unknown>(),
    sent: unknown[][] = []
  let ready = () => {}
  const sdk = {
    init: (...args: unknown[]) => sent.push(['init', ...args]),
    resume: (...args: unknown[]) => sent.push(['resume', ...args]),
    pause: (...args: unknown[]) => sent.push(['pause', ...args]),
    trackEvent: (...args: unknown[]) => sent.push(['event', ...args]),
    trackPageStart: (...args: unknown[]) => sent.push(['page', ...args]),
    trackPageEnd: (...args: unknown[]) => sent.push(['end', ...args]),
    trackShare: (input: unknown) => input,
    messager: {
      messageType: { UMA_LIB_INITED: 'ready' },
      once: (_: string, callback: () => void) => {
        ready = callback
      }
    }
  } as AnalyticsSDK
  const service = createAnalyticsService({
    config: {
      enabled,
      appKey: enabled ? 'fixture-test' : '',
      environment: enabled ? 'test' : 'disabled'
    },
    storage: {
      get: (key) => stored.get(key),
      set: (key, value) => {
        stored.set(key, value)
      },
      remove: (key) => {
        stored.delete(key)
      }
    },
    currentPage: () => 'pages/home/index?token=private',
    ...extra
  })
  service.attach(sdk)
  return { service, sdk, sent, stored, ready: () => ready() }
}

it('does not initialize, queue or replay any activity before explicit consent', () => {
  const { service, sdk, sent, ready } = setup()
  service.foreground({ scene: 1001, query: { token: 'private' } })
  sdk.resume({ query: { token: 'private' } })
  sdk.trackPageStart('pages/old/index')
  service.track('learning_start', { content_type: 'scene', content_id: 'before' })
  expect(sent).toEqual([])
  service.setConsent(true)
  expect(sent.map((row) => row[0])).toEqual(['init'])
  ready()
  expect(JSON.stringify(sent)).not.toContain('before')
  expect(JSON.stringify(sent)).not.toContain('private')
  expect(JSON.stringify(sent)).not.toContain('pages/old')
  expect(sent.some((row) => row[0] === 'event' && row[1] === 'app_entry')).toBe(true)
})
it('blocks SDK methods even after the SDK installs its initialized implementations', () => {
  const { service, sdk, sent, ready } = setup()
  service.foreground()
  service.setConsent(true)
  sdk.trackEvent = (...args: unknown[]) => sent.push(['replacement', ...args])
  ready()
  service.setConsent(false)
  const length = sent.length
  sdk.trackEvent('blocked')
  sdk.resume({})
  service.track('learning_complete', { content_id: 'blocked' })
  expect(sent.length).toBe(length)
})
it('disables every SDK action and consent storage in production', () => {
  const { service, sent, stored } = setup(false)
  service.foreground()
  service.setConsent(true)
  service.track('login_success')
  expect(service.available).toBe(false)
  expect(sent).toEqual([])
  expect(stored.size).toBe(0)
})
it('discards initialization that finishes after consent is withdrawn', () => {
  const { service, sent, ready } = setup()
  service.foreground()
  service.setConsent(true)
  service.setConsent(false)
  ready()
  expect(sent.map((row) => row[0])).toEqual(['init'])
})
it('allows only declared event fields and deduplicates confirmed operation keys', () => {
  const { service, sent, ready } = setup()
  service.foreground()
  service.setConsent(true)
  ready()
  service.track(
    'learning_complete',
    { content_type: 'scene', content_id: 'c1', token: 'private' } as never,
    'operation-1'
  )
  service.track('learning_complete', { content_type: 'scene', content_id: 'c1' }, 'operation-1')
  const events = sent.filter((row) => row[1] === 'learning_complete')
  expect(events).toHaveLength(1)
  expect(events[0]?.[2]).toEqual({
    content_type: 'scene',
    content_id: 'c1',
    auth_state: 'guest',
    environment: 'test'
  })
})

it('keeps only events collected after consent while the SDK is initializing', () => {
  const { service, sent, ready } = setup()
  service.foreground()
  service.track('login_prompt')
  service.setConsent(true)
  service.setAuthenticated(true)
  service.track('login_success')
  expect(sent.some((row) => row[1] === 'login_success')).toBe(false)
  ready()
  expect(sent.filter((row) => row[1] === 'login_success')).toHaveLength(1)
  expect(sent.some((row) => row[1] === 'login_prompt')).toBe(false)
})
it('ends the current authorized session before stopping new collection', () => {
  const { service, sent, ready } = setup()
  service.foreground()
  service.setConsent(true)
  ready()
  service.setConsent(false)
  expect(sent.filter((row) => row[0] === 'pause')).toHaveLength(1)
})

it('keeps statistics inactive while WeChat permits only public share browsing', () => {
  const sent: unknown[] = []
  const service = createAnalyticsService({
    config: { enabled: true, appKey: 'fixture-test', environment: 'test' },
    storage: {
      get: () => ({ version: '2026-11-09', agreed: true }),
      set: () => {},
      remove: () => {}
    },
    currentPage: () => 'sub-packages/scenes/detail',
    isPermitted: () => false
  })
  service.attach({
    init: () => sent.push('init'),
    resume: () => {},
    pause: () => {},
    trackEvent: () => sent.push('event'),
    trackPageStart: () => {},
    trackPageEnd: () => {},
    trackShare: (value) => value
  })
  service.foreground()
  service.track('learning_start', { content_type: 'scene' })
  expect(sent).toEqual([])
})

it('records page entry once and closes foreground dwell once across hide and unload', () => {
  let time = 1000
  const { service, sdk, sent, ready } = setup(true, { now: () => time })
  service.foreground()
  service.setConsent(true)
  ready()
  sdk.trackPageStart('pages/home/index?token=secret')
  time = 3500
  sdk.trackPageEnd('pages/home/index')
  sdk.trackPageEnd('pages/home/index')
  expect(sent.filter((row) => row[1] === 'page_enter')).toHaveLength(1)
  expect(sent.filter((row) => row[1] === 'page_stay')).toEqual([
    [
      'event',
      'page_stay',
      expect.objectContaining({ page_path: 'pages/home/index', duration_ms: 2500 })
    ]
  ])
  expect(JSON.stringify(sent)).not.toContain('secret')
})

it('excludes background and starts a fresh visit on return', () => {
  let time = 0
  const { service, sdk, sent, ready } = setup(true, { now: () => time })
  service.foreground()
  service.setConsent(true)
  ready()
  time = 2000
  sdk.pause()
  service.background()
  sdk.trackPageEnd('pages/home/index')
  time = 90000
  sdk.trackPageStart('pages/home/index')
  service.foreground()
  sdk.trackPageStart('pages/home/index')
  time = 93000
  service.background()
  expect(sent.filter((row) => row[1] === 'page_enter')).toHaveLength(2)
  expect(
    sent
      .filter((row) => row[1] === 'page_stay')
      .map((row) => (row[2] as { duration_ms: number }).duration_ms)
  ).toEqual([2000, 3000])
})

it('counts only the currently authorized page after initialization and after reconsent', () => {
  let time = 0
  const { service, sdk, sent, ready } = setup(true, { now: () => time })
  service.foreground()
  sdk.trackPageStart('pages/before/index')
  service.setConsent(true)
  time = 5000
  ready()
  time = 7000
  service.setConsent(false)
  time = 99000
  service.setConsent(true)
  time = 100000
  service.background()
  expect(
    sent
      .filter((row) => row[1] === 'page_stay')
      .map((row) => (row[2] as { duration_ms: number }).duration_ms)
  ).toEqual([2000, 1000])
  expect(JSON.stringify(sent)).not.toContain('pages/before')
})

it('keeps the ending page context when navigation has already changed the current route', () => {
  let time = 0,
    route = 'sub-packages/scenes/detail',
    content = 'scene-1'
  const { service, sdk, sent, ready } = setup(true, {
    now: () => time,
    currentPage: () => route,
    pageProperties: () => ({ content_type: 'scene', content_id: content })
  })
  service.foreground()
  service.setConsent(true)
  ready()
  time = 2000
  route = 'pages/home/index'
  content = ''
  sdk.trackPageEnd('sub-packages/scenes/detail')
  sdk.trackPageStart(route)
  const stay = sent.find((row) => row[1] === 'page_stay')
  expect(stay?.[2]).toMatchObject({
    content_id: 'scene-1',
    page_path: 'sub-packages/scenes/detail',
    duration_ms: 2000
  })
  sdk.trackPageEnd('sub-packages/scenes/detail')
  time = 3000
  sdk.trackPageEnd(route)
  expect(sent.filter((row) => row[1] === 'page_stay')).toHaveLength(2)
})

it('requires separate production consent and labels production events correctly', () => {
  const test = setup()
  test.service.foreground()
  test.service.setConsent(true)
  const { service, sent, ready } = setup(true, {
    config: { enabled: true, appKey: 'fixture-prod', environment: 'production' },
    storage: {
      get: (key) => test.stored.get(key),
      set: (key, value) => {
        test.stored.set(key, value)
      },
      remove: (key) => {
        test.stored.delete(key)
      }
    }
  })
  service.foreground()
  expect(service.choice()).toBeUndefined()
  expect(sent).toEqual([])
  service.setConsent(true)
  ready()
  service.track('learning_complete', { content_id: 'c1' })
  expect(sent.find((row) => row[1] === 'learning_complete')?.[2]).toMatchObject({
    environment: 'production'
  })
  expect(test.stored.size).toBe(2)
  service.setConsent(false)
  expect(test.service.hasConsent()).toBe(true)
})
