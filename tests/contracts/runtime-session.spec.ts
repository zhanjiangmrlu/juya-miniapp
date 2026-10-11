import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { ModuleKind, ScriptTarget, transpileModule } from 'typescript'
import { describe, expect, it, vi } from 'vitest'

import { createHttpClient } from '@/services/http/client'
import { ApiError } from '@/services/http/errors'

import type { HttpClient, TransportRequest } from '@/shared/types/http'

describe('运行时账号刷新隔离', () => {
  it.each([false, true])('旧刷新迟到 failed=%s 不保存A令牌也不清B会话', async (failed) => {
    const session = {
      accessToken: 'account-a',
      refreshToken: 'account-a-refresh',
      cleanupGeneration: 0,
      clear: vi.fn(),
      saveTokens: vi.fn()
    }
    const request = vi.fn(async (input: TransportRequest) => {
      if (input.url.endsWith('/session/refresh')) {
        expect(input.body).toEqual({ refresh_token: 'account-a-refresh' })
        session.cleanupGeneration++
        session.accessToken = 'account-b'
        session.refreshToken = 'account-b-refresh'
        if (failed) throw new Error('late-refresh-failure')
        return {
          data: { access_token: 'late-a', refresh_token: 'late-a-refresh' },
          headers: {},
          status: 200
        }
      }
      return { data: null, headers: {}, status: 401 }
    })
    const exports = {} as { getRuntimeServices(): { client: HttpClient } }
    const source = readFileSync('src/services/runtime.ts', 'utf8').replace(
      /import\.meta\.env/g,
      JSON.stringify({ DEV: false, VITE_USE_MOCK_API: 'false' })
    )
    const constructors = Object.fromEntries(
      [
        'createAccountService',
        'createContactService',
        'createEntitlementService',
        'createFavoriteService',
        'createFeedbackService',
        'createHomeService',
        'createCatalogService',
        'createResultService',
        'createMessageService',
        'createProfileService',
        'createSceneService',
        'createShortReadingService'
      ].map((name) => [name, () => ({})])
    )
    runInNewContext(
      transpileModule(source, {
        compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 }
      }).outputText,
      {
        exports,
        /** 提供运行时边界，id为编译后的源码依赖 */
        require: (id: string) => {
          if (id === '@/stores/session') return { useSessionStore: () => session }
          if (id === '@/services/http/client') return { createHttpClient }
          if (id === '@/services/http/errors') return { ApiError }
          if (id === '@/services/api-config')
            return { resolveApiBaseUrl: () => 'https://api.example.test' }
          if (id === '@/services/startup')
            return { configureSessionBootstrap: vi.fn(), ensureSession: async () => true }
          if (id === '@/services/http/uni-transport')
            return {
              UniTransport: class {
                request = request
              }
            }
          return constructors
        }
      }
    )
    await expect(exports.getRuntimeServices().client.get('/private')).rejects.toMatchObject({
      code: 'SESSION_CHANGED'
    })
    expect(request).toHaveBeenCalledTimes(2)
    expect(session.saveTokens).not.toHaveBeenCalled()
    expect(session.clear).not.toHaveBeenCalled()
    expect(session.accessToken).toBe('account-b')
  })
})
