/* global fetch, AbortSignal */
import { URL } from 'node:url'

const expectedOperations = [
  ['post', '/api/v1/scenes/{scene_id}/open'],
  ['post', '/api/v1/favorite-snapshots'],
  ['get', '/api/v1/favorite-snapshots/{favorite_id}/source-resolution'],
  ['post', '/api/v1/pronunciations/{target_id}/resolve'],
  ['get', '/api/v1/pronunciations/tasks/{task_id}'],
  ['post', '/api/v1/short-readings/{identity}/open'],
  ['put', '/api/v1/short-readings/{identity}/progress'],
  ['post', '/api/v1/short-readings/{identity}/complete']
]

/** 判断JSON对象，value为待校验接口数据 */
const isObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value))

/** 检查固定BFF基线最小形状，path为只读接口，data为已解析响应 */
const hasExpectedShape = (path, data) => {
  if (!isObject(data)) return false
  if (path === '/health/ready')
    return (
      data.status === 'ready' &&
      isObject(data.checks) &&
      Object.keys(data.checks).length > 0 &&
      Object.values(data.checks).every((value) => value === true)
    )
  if (path === '/openapi.json')
    return (
      typeof data.openapi === 'string' &&
      data.openapi.startsWith('3.') &&
      isObject(data.paths) &&
      isObject(data.components?.schemas)
    )
  if (path === '/api/v1/learning/modules')
    return (
      Array.isArray(data.items) &&
      data.items.every(
        (item) =>
          isObject(item) &&
          typeof item.enabled === 'boolean' &&
          ['public_id', 'key', 'title'].every(
            (name) => item[name] === null || typeof item[name] === 'string'
          )
      )
    )
  if (path === '/api/v1/learning/catalog')
    return (
      Array.isArray(data.items) &&
      data.items.every(isObject) &&
      typeof data.authorization_pending === 'boolean'
    )
  if (path === '/api/v1/me')
    return (
      ['public_id', 'juya_number', 'status'].every((name) => typeof data[name] === 'string') &&
      typeof data.contact_prompt_eligible === 'boolean'
    )
  return false
}

/** 只读探测，baseValue为确认地址，token为临时身份，request为可注入传输能力 */
export const probeV15Http = async (baseValue, token, request = fetch) => {
  const base = new URL(baseValue)
  const results = []
  let healthReady = false
  let contractReady = false
  let modulesReady = false
  /** 校验只读响应，path为公开路径，authenticated表示是否允许附加身份 */
  const probe = async (path, authenticated = false) => {
    const ready = healthReady && contractReady && modulesReady
    if (authenticated && (!ready || !token)) {
      results.push({
        method: 'GET',
        path,
        result: ready ? 'NOT_RUN_AUTH_REQUIRED' : 'NOT_RUN_SERVICE_OR_CONTRACT_UNAVAILABLE'
      })
      return
    }
    try {
      const response = await request(`${base.href.replace(/\/$/, '')}${path}`, {
        headers: authenticated ? { Authorization: `Bearer ${token}` } : {},
        signal: AbortSignal.timeout(8000),
        redirect: 'error'
      })
      const data = await response.json().catch(() => undefined)
      const requestId = data?.request_id ?? response.headers.get('x-request-id')
      const record = {
        method: 'GET',
        path,
        http_status: response.status,
        request_id: typeof requestId === 'string' ? requestId : undefined,
        fields: isObject(data) ? Object.keys(data) : [],
        result: !response.ok
          ? 'HTTP_ERROR'
          : hasExpectedShape(path, data)
            ? 'HTTP_OK'
            : 'CONTRACT_NOT_READY'
      }
      if (path === '/openapi.json') {
        record.missing_operations = expectedOperations
          .filter(([method, entry]) => !isObject(data?.paths?.[entry]?.[method]))
          .map(([method, entry]) => `${method.toUpperCase()} ${entry}`)
        if (response.ok && record.missing_operations.length) record.result = 'CONTRACT_NOT_READY'
      }
      results.push(record)
      if (path === '/health/ready') healthReady = record.result === 'HTTP_OK'
      if (path === '/openapi.json') contractReady = record.result === 'HTTP_OK'
      if (path === '/api/v1/learning/modules') modulesReady = record.result === 'HTTP_OK'
    } catch {
      results.push({ method: 'GET', path, result: 'NETWORK_ERROR_OR_TIMEOUT' })
    }
  }
  await probe('/health/ready')
  await probe('/openapi.json')
  await probe('/api/v1/learning/modules')
  await probe('/api/v1/me', true)
  await probe('/api/v1/learning/catalog', true)
  return {
    checked_at: new Date().toISOString(),
    base_url: base.href,
    scope: 'READ_ONLY_HTTP_PROBE',
    results
  }
}
