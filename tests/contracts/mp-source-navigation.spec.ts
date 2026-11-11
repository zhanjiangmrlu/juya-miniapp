import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { readonly, ref } from 'vue'

import type { AudioPort } from '@/shared/types/audio'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = mkdtempSync(path.join(tmpdir(), 'juya-mp-navigation-'))
const require = createRequire(import.meta.url)

beforeAll(() => {
  const cli = path.join(
    path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
    'bin/uni.js'
  )
  const result = spawnSync(
    process.execPath,
    [cli, 'build', '-p', 'mp-weixin', '--mode', 'local-share'],
    {
      cwd: root,
      env: { ...process.env, UNI_OUTPUT_DIR: output },
      encoding: 'utf8'
    }
  )
  expect(result.status, result.stdout + result.stderr).toBe(0)
}, 60000)

afterAll(() => rmSync(output, { recursive: true, force: true }))

it('emits native scene-note row selectors without unsupported functional pseudo-classes', () => {
  const css = readFileSync(
    path.join(output, 'features/learning/components/scene-card.wxss'),
    'utf8'
  )
  expect(css).not.toMatch(/:(?:where|is|has)\(/)
  expect(css).toContain('.scene-state-line.has-note')
  expect(css).toContain('.note-label')
})

it('keeps 100KB below the main-package limit after 20 percent WeChat conversion expansion', () => {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'scripts/verify-mp-package-budget.mjs')],
    {
      cwd: root,
      env: { ...process.env, UNI_OUTPUT_DIR: output },
      encoding: 'utf8'
    }
  )
  expect(result.status, result.stdout + result.stderr).toBe(0)
})

it('excludes remote login artwork from the package and keeps native tab icons available', () => {
  expect(existsSync(path.join(output, 'static/brand/u00-botanical-watercolor@3x.png'))).toBe(false)
  const configuration = JSON.parse(readFileSync(path.join(output, 'app.json'), 'utf8'))
  for (const tab of configuration.tabBar.list) {
    expect(existsSync(path.join(output, tab.iconPath))).toBe(true)
    expect(existsSync(path.join(output, tab.selectedIconPath))).toBe(true)
  }
})

it('packages only small generic share fallbacks while preserving the existing share images', () => {
  for (const channel of ['friends', 'timeline']) {
    expect(existsSync(path.join(output, `static/brand/page-share-${channel}@3x.jpg`))).toBe(false)
    expect(
      readFileSync(path.join(output, `static/brand/page-share-${channel}-fallback.jpg`)).length
    ).toBeLessThan(30 * 1024)
  }
  expect(existsSync(path.join(output, 'static/brand/page-share-friends-2f9a6c3d5888.jpg'))).toBe(
    false
  )
  expect(existsSync(path.join(output, 'static/brand/page-share-timeline-696f2baaa802.jpg'))).toBe(
    false
  )
  expect(existsSync(path.join(output, 'static/brand/brand-share.png'))).toBe(true)
  expect(existsSync(path.join(output, 'static/brand/brand-share-square.png'))).toBe(true)
})

/** 执行真实微信CommonJS产物，只替换原生界面及业务网络边界
 * @param overrides 当前用例提供的微信原生能力
 * @param realSession 是否执行真实编译会话模块
 */
const nativeRuntime = (overrides: Record<string, unknown> = {}, realSession = false) => {
  const opened: string[] = [],
    toasts: string[] = [],
    requests: { path: string; options: unknown }[] = [],
    stored = new Map<string, unknown>(),
    modules = new Map<string, { exports: Record<string, unknown> }>()
  const native = {
    navigateTo: ({ url, success }: { url: string; success: () => void }) => {
      opened.push(url)
      success()
    },
    showToast: ({ title }: { title: string }) => toasts.push(title),
    ...overrides
  }
  /** 加载实际编译模块，缓存语义与小程序require一致
   * @param filename 编译目录内模块的绝对路径
   */
  const load = (filename: string): Record<string, unknown> => {
    const cached = modules.get(filename)
    if (cached) return cached.exports
    const module = { exports: {} as Record<string, unknown> }
    modules.set(filename, module)
    if (filename === path.join(output, 'common/vendor.js')) {
      module.exports = { index: native, readonly, ref }
    } else if (!realSession && filename === path.join(output, 'services/api.js')) {
      const session = {
        userId: () => 'receiver',
        request: async (requestPath: string, options: { body: { source: string } }) => {
          requests.push({ path: requestPath, options })
          if (requestPath !== '/api/mini/v1/learning-queues') throw new Error('Unexpected request')
          return { id: 'native-queue', source: options.body.source, total: 3 }
        }
      }
      const createOperations = load(path.join(output, 'services/operation-service.js'))
        .createOperationService as (ports: unknown) => unknown
      module.exports = {
        session,
        operations: createOperations({
          session,
          key: () => 'native-operation',
          storage: {
            get: (key: string) => stored.get(key),
            set: (key: string, value: unknown) => stored.set(key, value),
            remove: (key: string) => stored.delete(key)
          }
        }),
        onSessionExpired: () => () => undefined
      }
    } else {
      runInNewContext(
        readFileSync(filename, 'utf8'),
        {
          exports: module.exports,
          require: (specifier: string) => load(path.resolve(path.dirname(filename), specifier)),
          Error,
          console
        },
        { filename }
      )
    }
    return module.exports
  }
  return { load, opened, toasts, requests }
}

/** 为真实编译的隐私与会话模块提供原生网络边界，不替换业务模块 */
const nativePrivacyRuntime = () => {
  const saved = new Map<string, unknown>([
    ['juya-rebuild-mini-session-v1', { access_token: 'mini_fixture', user_id: 'learner-1' }]
  ])
  const calls: { path: string; method: string; authenticated: boolean }[] = []
  const state = {
    agreements: {
      current: true,
      accepted: {
        terms: { version: 'v1', accepted_at: '2026-11-10T00:00:00Z', source: 'account_action' },
        privacy: { version: 'v1', accepted_at: '2026-11-10T00:00:00Z', source: 'account_action' }
      }
    },
    analytics: {
      enabled: false,
      collecting: false,
      revision: 0,
      scope_version: '',
      updated_at: null
    }
  }
  const runtime = nativeRuntime(
    {
      getStorageSync: (key: string) => saved.get(key) ?? '',
      setStorageSync: (key: string, value: unknown) => saved.set(key, value),
      removeStorageSync: (key: string) => saved.delete(key),
      request: (request: {
        url: string
        method: string
        header: Record<string, string>
        success: (result: { statusCode: number; data: unknown }) => void
      }) => {
        const pathname = new URL(request.url).pathname
        calls.push({
          path: pathname,
          method: request.method,
          authenticated: !!request.header.Authorization
        })
        if (pathname === '/api/mini/v1/privacy/policies') {
          request.success({
            statusCode: 200,
            data: {
              mode: 'published',
              server_now: '2026-11-10T00:00:00Z',
              documents: ['terms', 'privacy', 'analytics'].map((kind) => ({
                kind,
                version: 'v1',
                title: kind,
                content: '隔离测试正文'
              }))
            }
          })
        } else if (pathname === '/api/mini/v1/me/privacy') {
          request.success({ statusCode: 200, data: state })
        } else if (pathname === '/api/mini/v1/me/analytics-preference') {
          request.success({
            statusCode: 200,
            data: { ...state.analytics, enabled: true, revision: 1, scope_version: 'v1' }
          })
        } else throw new Error('Unexpected privacy request')
      }
    },
    true
  )
  return { ...runtime, calls }
}

it('loads policies and synchronizes an account preference through executable WeChat modules', async () => {
  const runtime = nativePrivacyRuntime()
  const privacy = runtime.load(path.join(output, 'services/privacy.js')).privacy as {
    loadPolicies: () => Promise<unknown>
    restore: (user: string) => Promise<void>
    choose: (enabled: boolean) => Promise<void>
    state: { value: { analytics: { enabled: boolean; collecting: boolean } } }
  }
  await privacy.loadPolicies()
  await privacy.restore('learner-1')
  await privacy.choose(true)
  expect(privacy.state.value.analytics).toMatchObject({ enabled: true, collecting: false })
  expect(runtime.calls).toEqual([
    { path: '/api/mini/v1/privacy/policies', method: 'GET', authenticated: false },
    { path: '/api/mini/v1/me/privacy', method: 'GET', authenticated: true },
    { path: '/api/mini/v1/me/analytics-preference', method: 'PUT', authenticated: true }
  ])
})

it('checks the restored account before deciding whether to show native first agreements', async () => {
  const runtime = nativePrivacyRuntime()
  const coordinator = runtime.load(path.join(output, 'services/consent-coordinator.js')) as {
    prepareConsentLaunch: () => void
    considerHomeConsent: (show: (target: string) => void) => Promise<void>
  }
  const shown: string[] = []
  coordinator.prepareConsentLaunch()
  await coordinator.considerHomeConsent((target) => shown.push(target))
  expect(shown).toEqual([])
  expect(runtime.calls).toEqual([
    { path: '/api/mini/v1/privacy/policies', method: 'GET', authenticated: false },
    { path: '/api/mini/v1/me/privacy', method: 'GET', authenticated: true }
  ])
})

it('plays each word in silent mode without autoplay when native word contexts are recreated', () => {
  let obeyMuteSwitch = true
  const audible: string[] = [],
    contexts: { autoplay: boolean; destroy: ReturnType<typeof vi.fn> }[] = []
  const runtime = nativeRuntime({
    setInnerAudioOption: (options: { obeyMuteSwitch?: boolean }) => {
      if (options.obeyMuteSwitch !== undefined) obeyMuteSwitch = options.obeyMuteSwitch
    },
    createInnerAudioContext: () => {
      const audio = {
        autoplay: true,
        obeyMuteSwitch: true,
        src: '',
        play: () => {
          // 现代微信只按全局选项决定静音时是否发声，实例旧属性不能代替它
          if (!obeyMuteSwitch) audible.push(audio.src)
        },
        destroy: vi.fn(),
        onPlay: vi.fn(),
        onPause: vi.fn(),
        onEnded: vi.fn(),
        onTimeUpdate: vi.fn(),
        onError: vi.fn()
      }
      contexts.push(audio)
      return audio
    }
  })
  const createAudioPort = runtime.load(path.join(output, 'services/audio-port.js'))
    .createAudioPort as (isolated: boolean) => AudioPort
  const word = createAudioPort(true)
  word.src = '/reference.mp3'
  expect(contexts[0]!.autoplay).toBe(false)
  expect(audible).toEqual([])
  word.play()
  expect(audible).toEqual(['/reference.mp3'])

  // 录音等原生操作可能重置音频会话，新点读仍需应用静音策略
  obeyMuteSwitch = true
  word.src = '/cite.mp3'
  expect(contexts[0]!.destroy).toHaveBeenCalledTimes(1)
  expect(contexts[1]!.autoplay).toBe(false)
  expect(audible).toEqual(['/reference.mp3'])
  word.play()
  expect(audible).toEqual(['/reference.mp3', '/cite.mp3'])
  word.destroy()
})

it.each([
  ['learning', undefined],
  ['favorites', undefined],
  ['records', undefined],
  ['day', '2026-10-23']
])('opens a card from %s using an executable native source queue', async (source, day) => {
  const runtime = nativeRuntime()
  const openScene = runtime.load(path.join(output, 'services/navigation.js')).openScene as (
    id: string,
    source?: string,
    day?: string
  ) => Promise<void>
  await openScene('card-1', source, day)
  expect(runtime.opened).toEqual(['/sub-packages/scenes/detail?id=card-1&queue=native-queue'])
  expect(runtime.toasts).toEqual([])
  expect(runtime.requests).toEqual([
    {
      path: '/api/mini/v1/learning-queues',
      options: {
        method: 'POST',
        key: 'native-operation',
        body: { source, card_id: 'card-1', ...(day ? { day } : {}) }
      }
    }
  ])
})

it.each([
  'pages/home/index',
  'pages/records/index',
  'pages/profile/index',
  'pages/learning/index',
  'pages/favorites/index',
  'pages/login/index',
  'sub-packages/scenes/detail',
  'sub-packages/scenes/image-preview',
  'sub-packages/records/index',
  'sub-packages/account/profile',
  'sub-packages/account/identity-edit',
  'sub-packages/feedback/index',
  'sub-packages/feedback/create',
  'sub-packages/feedback/detail',
  'sub-packages/listening/index',
  'sub-packages/listening/topic',
  'sub-packages/listening/article'
])('exposes both native share lifecycles in the compiled WeChat page %s', (page) => {
  let pageOptions: { __runtimeHooks?: number } = {}
  const vendor = {
    defineComponent: (options: unknown) => options,
    _export_sfc: (options: unknown) => options
  }
  runInNewContext(readFileSync(path.join(output, `${page}.js`), 'utf8'), {
    require: (specifier: string) => (specifier.endsWith('/common/vendor.js') ? vendor : {}),
    wx: {
      createPage: (options: typeof pageOptions) => {
        pageOptions = options
      }
    },
    exports: {}
  })
  // uni-mp-weixin only exposes these optional native callbacks when the compiler sets their flags
  expect(
    (pageOptions.__runtimeHooks || 0) & 2,
    'onShareAppMessage must reach the native page'
  ).toBe(2)
  expect((pageOptions.__runtimeHooks || 0) & 4, 'onShareTimeline must reach the native page').toBe(
    4
  )
  const configuration = JSON.parse(readFileSync(path.join(output, `${page}.json`), 'utf8'))
  expect(configuration).not.toHaveProperty('enableShareAppMessage')
  expect(configuration).not.toHaveProperty('enableShareTimeline')
})

it('excludes the remote home background and resolves package dependencies without main-to-subpackage imports', () => {
  expect(existsSync(path.join(output, 'static/listening/home-watercolor@3x.jpg'))).toBe(false)
  for (const entry of readdirSync(output, { recursive: true }).map(String)) {
    if (!entry.endsWith('.js')) continue
    const code = readFileSync(path.join(output, entry), 'utf8')
    for (const match of code.matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
      const dependency = path.resolve(output, path.dirname(entry), match[1])
      expect(existsSync(dependency), `${entry} requires missing ${match[1]}`).toBe(true)
      if (!entry.startsWith(`sub-packages${path.sep}`)) {
        expect(path.relative(output, dependency).startsWith(`sub-packages${path.sep}`), entry).toBe(
          false
        )
      }
    }
  }
})

it('keeps the retired contact route as a native redirect without exposing share or login hooks', () => {
  const opened: string[] = []
  let load: (() => void) | undefined
  let options: { setup: () => unknown; __runtimeHooks?: number } | undefined
  const vendor = {
    defineComponent: (value: unknown) => value,
    onLoad: (callback: () => void) => {
      load = callback
    },
    index: {
      switchTab: ({ url }: { url: string }) => {
        opened.push(url)
      }
    }
  }
  runInNewContext(readFileSync(path.join(output, 'sub-packages/account/contact-edit.js'), 'utf8'), {
    require: (specifier: string) => {
      if (specifier.endsWith('/common/vendor.js')) return vendor
      if (specifier.endsWith('/shared/constants/navigation.js'))
        return { Routes: { PROFILE: '/pages/profile/index' } }
      throw new Error(`Unexpected retired contact dependency: ${specifier}`)
    },
    wx: {
      createPage: (value: typeof options) => {
        options = value
      }
    },
    exports: {}
  })
  options?.setup()
  load?.()
  expect(opened).toEqual(['/pages/profile/index'])
  expect(options?.__runtimeHooks || 0).toBe(0)
})

/** 执行当前编译的登录弹窗，替换微信身份与账号端口，保留实际事件处理函数
 * @param statistics 本次明确选择是否允许统计
 */
const runNativeConsentLogin = async (statistics: boolean) => {
  const calls: { login: unknown[]; choices: boolean[]; succeeded: number } = {
    login: [],
    choices: [],
    succeeded: 0
  }
  let owner: string | null = null
  let component!: {
    setup: (
      props: object
    ) => (
      context: object,
      cache: object
    ) => { b: (value: boolean) => Promise<void>; e: { error: string } }
  }
  const vendor = {
    ref,
    watch: () => undefined,
    defineComponent: (value: unknown) => value,
    _export_sfc: (value: unknown) => value,
    unref: (value: unknown) =>
      value && typeof value === 'object' && 'value' in value ? value.value : value,
    e: (...values: object[]) => Object.assign({}, ...values),
    o: (value: unknown) => value,
    p: (value: unknown) => value
  }
  const confirmation = {
    confirmation_id: 'native-confirmation',
    terms_version: 'v1',
    privacy_version: 'v1',
    client_confirmed_at: '2026-11-10T00:00:00Z',
    source: 'account_action'
  }
  const session = { userId: () => owner, invalidate: () => undefined }
  const dependencies: Record<string, unknown> = {
    'vendor.js': vendor,
    'api.js': { session },
    'account-store.js': {
      useAccountStore: () => ({
        login: async (...args: unknown[]) => {
          calls.login.push(args)
          owner = 'learner-1'
        }
      })
    },
    'consent-coordinator.js': {
      automaticConsent: ref(false),
      readingPolicy: ref(false),
      openPolicy: () => undefined
    },
    'login-prompt.js': {
      loginPromptTarget: ref('/sub-packages/listening/article?id=article-1'),
      dismissLoginPrompt: () => undefined
    },
    'login-return.js': {
      loginReturn: {
        begin: () => undefined,
        resumeGuest: () => undefined,
        succeed: () => {
          calls.succeeded++
        }
      }
    },
    'navigation.js': { safeTarget: (value: string) => value, openLogin: () => undefined },
    'privacy.js': {
      privacy: {
        published: () => true,
        confirmed: () => false,
        confirmation: () => confirmation,
        version: () => 'v1',
        block: () => undefined,
        restore: async () => undefined,
        state: ref({ analytics: { enabled: false } }),
        choose: async (enabled: boolean) => {
          calls.choices.push(enabled)
        }
      }
    }
  }
  runInNewContext(
    readFileSync(path.join(output, 'components/app-login-prompt/app-login-prompt.js'), 'utf8'),
    {
      require: (specifier: string) => {
        const dependency = dependencies[path.basename(specifier)]
        if (!dependency) throw new Error(`Unexpected consent dependency: ${specifier}`)
        return dependency
      },
      wx: {
        createComponent: (value: typeof component) => {
          component = value
        }
      },
      console
    }
  )
  const render = component.setup({})
  await render({}, {}).b(statistics)
  return { calls, error: render({}, {}).e.error, confirmation }
}

it.each([true, false])(
  'executes native agreement login with independent statistics=%s',
  async (enabled) => {
    const result = await runNativeConsentLogin(enabled)
    expect(result.error).toBe('')
    expect(result.calls.login).toEqual([
      [
        true,
        {
          agreement_confirmation: result.confirmation,
          analytics_choice: { enabled, scope_version: 'v1' }
        }
      ]
    ])
    expect(result.calls.choices).toEqual([enabled])
    expect(result.calls.succeeded).toBe(1)
  }
)

it.each([false, true])(
  'evaluates native home agreements after restoring session=%s',
  async (loggedIn) => {
    let page!: { setup: (props: object) => unknown }
    let show!: () => void
    let evaluated = 0
    const vendor = {
      ref,
      defineComponent: (value: unknown) => value,
      _export_sfc: (value: unknown) => value,
      onShow: (callback: () => void) => {
        show = callback
      },
      onHide: () => undefined,
      onUnload: () => undefined,
      onShareAppMessage: () => undefined,
      onShareTimeline: () => undefined,
      index: { hideTabBar: () => undefined }
    }
    const dependencies: Record<string, unknown> = {
      'vendor.js': vendor,
      'assets.js': {},
      'listening-service.js': { getListeningHome: async () => ({}) },
      'api.js': { onSessionExpired: () => () => undefined },
      'consent-coordinator.js': {
        considerHomeConsent: async () => {
          evaluated++
        }
      },
      'privacy.js': { privacy: { published: () => true, restore: async () => undefined } },
      'login-prompt.js': { promptLogin: () => undefined },
      'login-return.js': { loginReturn: { register: () => undefined, take: () => null } },
      'navigation.js': { Routes: { HOME: '/pages/home/index' } },
      'page-share.js': {},
      'brand.js': {},
      'home.js': {},
      'account-store.js': {
        useAccountStore: () => ({ restore: async () => (loggedIn ? { id: 'learner-1' } : null) })
      }
    }
    runInNewContext(readFileSync(path.join(output, 'pages/home/index.js'), 'utf8'), {
      require: (specifier: string) => {
        const key = path.basename(specifier)
        if (!(key in dependencies)) throw new Error(`Unexpected home dependency: ${specifier}`)
        return dependencies[key]
      },
      wx: {
        createPage: (value: typeof page) => {
          page = value
        }
      },
      console
    })
    page.setup({})
    show()
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(evaluated).toBe(1)
  }
)
