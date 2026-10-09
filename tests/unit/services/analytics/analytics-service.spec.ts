import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAnalyticsService } from '@/services/analytics/analytics-service'

/** 创建隔离统计服务，granted 表示启动前已经保存用户同意 */
const makeService = (granted = false) => {
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
  if (granted) values.set('juya.analytics.consent', { version: '1', state: 'granted' })
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

describe('分享回流授权边界', () => {
  const entry = {
    path: 'sub-packages/scene/detail',
    query: { share_channel: 'friend', share_target: 'scene', sceneId: 'coffee', token: 'secret' }
  }

  it('已授权冷启动只在 SDK 就绪后记当前分享回流，完整 query 不交给 SDK', async () => {
    const { service, driver } = makeService(true)
    service.appShow(entry)
    service.shareLanding(entry)
    expect(driver.track).not.toHaveBeenCalled()
    await service.start()
    expect(driver.track).toHaveBeenCalledWith(
      'share_landing',
      expect.objectContaining({
        page_code: 'sub-packages/scene/detail',
        share_channel: 'friend',
        share_target: 'scene',
        content_scene_id: 'coffee'
      })
    )
    expect(driver.resume).toHaveBeenCalledWith(expect.objectContaining({ query: {} }))
  })

  it('未知或拒绝时不保留回流，新同意不补报；热启动每次进入记一次', async () => {
    const { service, driver } = makeService()
    service.shareLanding(entry)
    await service.setConsent(true)
    expect(driver.track).not.toHaveBeenCalled()
    service.appHide()
    service.appShow()
    service.shareLanding(entry)
    expect(driver.track).toHaveBeenCalledTimes(1)
    service.appHide()
    service.appShow()
    service.shareLanding(entry)
    expect(driver.track).toHaveBeenCalledTimes(2)
    await service.setConsent(false)
    service.shareLanding(entry)
    await service.setConsent(true)
    expect(driver.track).toHaveBeenCalledTimes(2)
  })

  it('初始化中撤回或退后台丢弃回流，不在重新开启后补发', async () => {
    const { service, driver } = makeService(true)
    let resolve!: () => void
    driver.start.mockImplementationOnce(() => new Promise<void>((done) => (resolve = done)))
    service.shareLanding(entry)
    const starting = service.start()
    await service.setConsent(false)
    resolve()
    await starting
    await service.setConsent(true)
    expect(driver.track).not.toHaveBeenCalled()
    const hidden = makeService(true)
    hidden.service.shareLanding(entry)
    hidden.service.appHide()
    await hidden.service.start()
    expect(hidden.driver.track).not.toHaveBeenCalled()
    const left = makeService(true)
    left.service.shareLanding(entry)
    left.service.pageHide('sub-packages/scene/detail')
    await left.service.start()
    expect(left.driver.track).not.toHaveBeenCalled()
  })

  it('仅接收支持页面及固定渠道，拒绝私有路径、伪造目标、URL 型内容 ID', async () => {
    const { service, driver } = makeService(true)
    await service.start()
    service.shareLanding({ ...entry, path: 'sub-packages/profile/contact-edit' })
    service.shareLanding({ ...entry, query: { ...entry.query, share_target: 'home' } })
    service.shareLanding({ ...entry, query: { ...entry.query, share_channel: 'unknown' } })
    service.shareLanding({
      ...entry,
      query: { ...entry.query, sceneId: 'https://private?token=secret' }
    })
    expect(driver.track).not.toHaveBeenCalled()
    service.shareLanding({
      path: 'pages/home/index',
      query: { share_channel: 'timeline', share_target: 'home' }
    })
    expect(driver.track).toHaveBeenCalledWith(
      'share_landing',
      expect.objectContaining({ share_target: 'home', share_channel: 'timeline' })
    )
    service.appHide()
    service.appShow(entry)
    expect(driver.track).toHaveBeenCalledTimes(1)
  })
})
