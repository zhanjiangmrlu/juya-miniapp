import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

import { initPreContext, preJs } from '@dcloudio/uni-cli-shared'
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript'
import { describe, expect, it, vi } from 'vitest'

/** 按目标平台编译会话入口，platform 为运行端，development/localMode 为构建环境开关 */
const compileSession = (platform: 'h5' | 'mp-weixin', development: boolean, localMode: boolean) => {
  const filename = resolve('src/services/startup.ts')
  initPreContext(platform)
  const source = preJs(readFileSync(filename, 'utf8'), filename).replaceAll(
    'import.meta.env',
    JSON.stringify({ DEV: development, VITE_LOCAL_DEV_MODE: String(localMode) })
  )
  const login = vi.fn().mockResolvedValue({ access_token: 'access', refresh_token: 'refresh' })
  const wechatLogin = vi.fn(({ success }) => success({ code: 'wechat-code' }))
  const session = {
    restore: vi.fn(),
    isAuthenticated: false,
    refreshToken: undefined,
    saveTokens: vi.fn(),
    clear: vi.fn()
  }
  const exports = {} as {
    configureSessionBootstrap: (client: unknown) => void
    ensureSession: () => Promise<boolean>
  }
  runInNewContext(
    transpileModule(source, {
      compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 }
    }).outputText,
    {
      exports,
      uni: { login: wechatLogin },
      /** 提供会话入口的依赖，id 为编译后的业务模块路径 */
      require: (id: string) =>
        id === '@/stores/session'
          ? { useSessionStore: () => session }
          : { createSessionService: () => ({ loginWithWechat: login, refresh: vi.fn() }) }
    }
  )
  exports.configureSessionBootstrap({})
  return { ensureSession: exports.ensureSession, login, wechatLogin }
}

describe.each(['h5', 'mp-weixin'] as const)('%s 登录构建边界', (platform) => {
  it.each([
    [true, true, 'local-development-code'],
    [true, false, 'wechat-code'],
    [false, true, 'wechat-code']
  ] as const)('development=%s localMode=%s', async (development, localMode, expectedCode) => {
    const runtime = compileSession(platform, development, localMode)
    expect(await runtime.ensureSession()).toBe(true)
    expect(runtime.login).toHaveBeenCalledWith(expectedCode)
    expect(runtime.wechatLogin).toHaveBeenCalledTimes(expectedCode === 'wechat-code' ? 1 : 0)
  })
})
