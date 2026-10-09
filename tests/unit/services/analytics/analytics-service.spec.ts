import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAnalyticsService } from '@/services/analytics/analytics-service'

const makeService = () => {
  const driver = {
    start: vi.fn(async () => {}),
    stop: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
    pageStart: vi.fn(),
    pageEnd: vi.fn(),
    track: vi.fn()
  }
  const values = new Map<string, unknown>()
  const service = createAnalyticsService({
    enabled: true,
    clientVersion: '1.3.0',
    storage: {
      read: (key) => values.get(key),
      write: (key, value) => values.set(key, value)
    },
    driver
  })
  return { driver, service, values }
}

beforeEach(() => vi.clearAllMocks())

describe('统计同意与成功事件', () => {
  it('未知或拒绝授权均不创建 SDK，也不补报同意前的行为', async () => {
    const { service, driver } = makeService()
    service.pageShow('pages/home/index')
    service.track('scene_click', { content_scene_id: 'coffee' })
    expect(driver.start).not.toHaveBeenCalled()
    await service.setConsent(false)
    expect(service.needsPrompt()).toBe(false)
    await service.setConsent(true)
    expect(driver.start).toHaveBeenCalledOnce()
    expect(driver.track).not.toHaveBeenCalled()
    expect(driver.pageStart).toHaveBeenCalledWith('pages/home/index')
  })

  it('隐藏再销毁只结束一次，返回页面重新开始，子组件不参与', async () => {
    const { service, driver } = makeService()
    await service.setConsent(true)
    service.pageShow('sub-packages/scene/dialogue')
    service.pageHide('sub-packages/scene/dialogue')
    service.pageHide('sub-packages/scene/dialogue')
    expect(driver.pageEnd).toHaveBeenCalledTimes(1)
    service.pageShow('sub-packages/scene/dialogue')
    expect(driver.pageStart).toHaveBeenCalledTimes(2)
  })

  it('热启动使用最新场景和来源，清洗后再交给 SDK，而不是沿用冷启动信息', async () => {
    const { service, driver } = makeService()
    service.appShow({ scene: 1001, path: 'pages/home/index', query: { token: 'secret' } })
    await service.setConsent(true)
    service.appHide()
    service.appShow({
      scene: 1011,
      path: 'sub-packages/scene/detail',
      referrerInfo: { appId: 'wx1234' },
      query: { wechat_id: 'private' }
    })
    expect(driver.resume).toHaveBeenLastCalledWith({
      scene: 1011,
      path: 'sub-packages/scene/detail',
      referrerInfo: { appId: 'wx1234' },
      query: {}
    })
  })

  it('初始化期间撤回后不开始页面或接收迟到业务事件', async () => {
    const { service, driver } = makeService()
    let resolve!: () => void
    driver.start.mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)))
    service.pageShow('pages/home/index')
    const starting = service.setConsent(true)
    await service.setConsent(false)
    resolve()
    await starting
    service.track('scene_click', { content_scene_id: 'coffee' })
    expect(driver.stop).toHaveBeenCalled()
    expect(driver.pageStart).not.toHaveBeenCalled()
    expect(driver.track).not.toHaveBeenCalled()
    expect(service.capture()).toBeUndefined()
  })

  it('重新授权不接受旧授权期间启动的请求结果，同一成功键只记一次', async () => {
    const { service, driver } = makeService()
    await service.setConsent(true)
    const old = service.capture()
    await service.setConsent(false)
    await service.setConsent(true)
    service.track('learn_complete_success', { content_scene_id: 'coffee' }, { token: old })
    const token = service.capture()
    service.track('review_complete_success', {}, { token, once: 'review-1' })
    service.track('review_complete_success', {}, { token, once: 'review-1' })
    expect(driver.track).toHaveBeenCalledTimes(1)
  })

  it('非法事件、额外字段、URL、对象与非有限数不能上传', async () => {
    const { service, driver } = makeService()
    await service.setConsent(true)
    service.track('scene_click', { content_scene_id: 'coffee', wechat_id: 'secret' } as never)
    service.track('scene_click', { content_scene_id: 'https://oss.test/private?token=secret' })
    service.track('scene_click', { content_scene_id: {} } as never)
    service.track('scene_click', { content_scene_id: Number.NaN } as never)
    service.track('unexpected' as never, {})
    expect(driver.track).not.toHaveBeenCalled()
    service.track('scene_click', { content_scene_id: 'coffee' })
    expect(driver.track).toHaveBeenCalledWith(
      'scene_click',
      expect.objectContaining({
        content_scene_id: 'coffee',
        client_version: '1.3.0',
        event_schema_version: '1'
      })
    )
  })

  it('缺配置和 SDK 异常静默降级，保存拒绝状态失败时不启用采集', async () => {
    const { service, driver } = makeService()
    driver.start.mockRejectedValueOnce(new Error('SDK unavailable'))
    await expect(service.setConsent(true)).resolves.toBeUndefined()
    expect(service.capture()).toBeUndefined()
    await service.setConsent(false)
    expect(service.needsPrompt()).toBe(false)
  })
})
