import { describe, expect, it } from 'vitest'

import { createDevApiProxy, resolveApiBaseUrl } from '@/services/api-config'

describe('用户端开发 API 配置', () => {
  it('默认连接小程序 API 的 8001 端口，不连接管理端 8000', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://127.0.0.1:8001')
    expect(createDevApiProxy(undefined)['/api/v1'].target).toBe('http://127.0.0.1:8001')
  })

  it('H5 开发请求经过当前网页的同源代理', () => {
    expect(
      resolveApiBaseUrl('http://127.0.0.1:8001', { developmentOrigin: 'http://localhost:5174' })
    ).toBe('http://localhost:5174')
    expect(createDevApiProxy('http://127.0.0.1:8001')['/api/v1'].target).toBe(
      'http://127.0.0.1:8001'
    )
  })

  it('小程序和生产构建保留配置的 API 地址', () => {
    expect(resolveApiBaseUrl('https://api.example.test')).toBe('https://api.example.test')
  })

  it('mock 继续接收绝对 API 地址，避免解析相对路径失败', () => {
    expect(
      resolveApiBaseUrl('http://127.0.0.1:8001', {
        developmentOrigin: 'http://localhost:5174',
        mock: true
      })
    ).toBe('http://127.0.0.1:8001')
  })
})
