import { afterEach, describe, expect, it, vi } from 'vitest'

import { createHttpClient } from '@/services/http/client'

import type { TransportRequest } from '@/services/http/types'

import { createSessionService } from './session-service'

afterEach(() => vi.unstubAllGlobals())

/** 创建真实请求客户端，requests 用于收集实际发出的会话请求 */
const createAuth = (requests: TransportRequest[]) =>
  createSessionService(
    createHttpClient({
      baseUrl: 'http://localhost:8001',
      clientVersion: '1.3.0',
      session: {
        clear: () => {},
        getAccessToken: () => 'old-token',
        refresh: async () => undefined
      },
      transport: {
        request: async <T>(request: TransportRequest) => {
          requests.push(request)
          return {
            status: 200,
            headers: {},
            data: { access_token: 'access', refresh_token: 'refresh' } as T
          }
        }
      }
    })
  )

describe('微信会话请求契约', () => {
  it('登录请求包含服务端必填的设备描述，且不携带旧令牌', async () => {
    vi.stubGlobal('uni', {
      getDeviceInfo: () => ({ platform: 'windows', model: 'Windows x64', system: 'Windows 11' })
    })
    const requests: TransportRequest[] = []
    await createAuth(requests).loginWithWechat('temporary-code')
    expect(requests[0]).toMatchObject({
      method: 'POST',
      url: 'http://localhost:8001/api/v1/session/wechat',
      body: { code: 'temporary-code', device: 'windows / Windows x64 / Windows 11' }
    })
    expect(requests[0].headers.Authorization).toBeUndefined()
  })

  it.each([
    {},
    {
      getDeviceInfo: () => {
        throw new Error('SDK unavailable')
      }
    }
  ])('无法获取设备信息时仍发送非空设备描述', async (sdk) => {
    vi.stubGlobal('uni', sdk)
    const requests: TransportRequest[] = []
    await createAuth(requests).loginWithWechat('temporary-code')
    expect(requests[0].body).toEqual({ code: 'temporary-code', device: 'unknown-device' })
  })

  it('设备描述不会超过服务端允许的 200 字符', async () => {
    vi.stubGlobal('uni', { getDeviceInfo: () => ({ model: 'a'.repeat(220) }) })
    const requests: TransportRequest[] = []
    await createAuth(requests).loginWithWechat('temporary-code')
    expect(requests[0].body).toEqual({ code: 'temporary-code', device: 'a'.repeat(200) })
  })
})
