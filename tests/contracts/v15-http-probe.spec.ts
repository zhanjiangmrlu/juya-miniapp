import { describe, expect, it, vi } from 'vitest'

import openapi from '../fixtures/contracts/v15-3f9207a/openapi.json'

const corePath = '../../scripts/probe-v15-http-core.mjs'
const { probeV15Http } = await import(corePath)
const payloads: Record<string, unknown> = {
  '/health/ready': { status: 'ready', checks: { database: true } },
  '/openapi.json': openapi,
  '/api/v1/learning/modules': {
    items: [{ public_id: null, key: null, title: null, enabled: false }]
  },
  '/api/v1/me': {
    public_id: 'private-user-value',
    juya_number: 'private-number-value',
    status: 'active',
    contact_prompt_eligible: false,
    contact: { wechat_id: 'private-contact-value' },
    avatar_url: 'https://media.example.test/avatar?signature=private-signature-value'
  },
  '/api/v1/learning/catalog': { items: [], authorization_pending: false }
}

describe('真实HTTP准备探测的内存传输校验', () => {
  it('有效固定契约才发送身份请求，报告不包含token/本人值/签名', async () => {
    const request = vi.fn(async (url: string) =>
      Response.json(payloads[new URL(url).pathname], {
        headers: { 'x-request-id': 'fixture-request' }
      })
    )
    const report = await probeV15Http('https://api.example.test', 'private-token-value', request)
    expect(report.results.every((entry: { result: string }) => entry.result === 'HTTP_OK')).toBe(
      true
    )
    expect(request).toHaveBeenCalledTimes(5)
    expect(request.mock.calls[3]).toEqual([
      'https://api.example.test/api/v1/me',
      expect.objectContaining({ headers: { Authorization: 'Bearer private-token-value' } })
    ])
    expect(JSON.stringify(report)).not.toMatch(/private-[a-z-]+-value/)
  })
  it('200 HTML不冒充就绪，契约失败前不发送凭证', async () => {
    const request = vi.fn(async () => new Response('<html>Proxy login</html>'))
    const report = await probeV15Http('https://api.example.test', 'fixture-token', request)
    expect(request).toHaveBeenCalledTimes(3)
    expect(report.results[0].result).toBe('CONTRACT_NOT_READY')
    expect(report.results[3].result).toBe('NOT_RUN_SERVICE_OR_CONTRACT_UNAVAILABLE')
  })
  it('仅路径存在但缺方法仍拒绝，缺失记录同时包含方法与路径', async () => {
    const request = vi.fn(async (url: string) =>
      Response.json(
        new URL(url).pathname === '/openapi.json'
          ? {
              ...openapi,
              paths: Object.fromEntries(Object.keys(openapi.paths).map((path) => [path, {}]))
            }
          : payloads[new URL(url).pathname]
      )
    )
    const report = await probeV15Http('https://api.example.test', 'fixture-token', request)
    expect(report.results[1]).toMatchObject({
      result: 'CONTRACT_NOT_READY',
      missing_operations: expect.arrayContaining(['PUT /api/v1/short-readings/{identity}/progress'])
    })
    expect(request).toHaveBeenCalledTimes(3)
  })
  it.each([
    ['/health/ready', { status: 'ready', checks: {} }],
    ['/api/v1/learning/modules', { items: [{ enabled: 'true' }] }],
    ['/api/v1/me', {}],
    ['/api/v1/learning/catalog', { items: [], authorization_pending: 'false' }]
  ])('拒绝%s的错误最小形状', async (path, payload) => {
    const request = vi.fn(async (url: string) =>
      Response.json(new URL(url).pathname === path ? payload : payloads[new URL(url).pathname])
    )
    const report = await probeV15Http('https://api.example.test', 'fixture-token', request)
    expect(report.results.find((entry: { path: string }) => entry.path === path).result).toBe(
      'CONTRACT_NOT_READY'
    )
  })
  it('未提供token只报告身份未执行，不默认放行', async () => {
    const request = vi.fn(async (url: string) => Response.json(payloads[new URL(url).pathname]))
    const report = await probeV15Http('https://api.example.test', undefined, request)
    expect(report.results[3].result).toBe('NOT_RUN_AUTH_REQUIRED')
    expect(request).toHaveBeenCalledTimes(3)
  })
})
