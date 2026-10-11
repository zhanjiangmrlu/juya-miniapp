import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFavoriteStore } from '@/stores/favorites'
import { useSceneStore } from '@/stores/scene'
import { useSessionStore } from '@/stores/session'

describe('会话失效清理受限资料', () => {
  it('清空学习代次同步使已加载业务缓存失效但保留登录令牌', () => {
    const session = useSessionStore()
    session.saveTokens({ access_token: 'fixture-token', refresh_token: 'fixture-refresh' })
    const favorites = useFavoriteStore()
    favorites.items = [{ id: 'old' } as never]
    session.invalidateLearningData()
    expect(favorites.items).toEqual([])
    expect(session.isAuthenticated).toBe(true)
  })
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('uni', {
      getStorageSync: vi.fn(),
      getStorageInfoSync: vi.fn(() => ({ keys: ['juya.scene-position.private', 'unrelated'] })),
      setStorageSync: vi.fn(),
      removeStorageSync: vi.fn()
    })
  })
  it('刷新失败退出后，不留上一账号收藏或场景正文', () => {
    const session = useSessionStore()
    const favorites = useFavoriteStore()
    const scene = useSceneStore()
    favorites.items = [{ id: 'previous-user-favorite' } as never]
    scene.model = {
      kind: 'FULL',
      sceneId: 'private',
      entries: [{ text: 'private copy' }],
      title: '',
      chineseTitle: '',
      series: '',
      description: ''
    } as never
    session.saveTokens({ access_token: 'fixture-token', refresh_token: 'fixture-refresh' })
    session.clear()
    expect(favorites.items).toEqual([])
    expect(scene.model).toBeUndefined()
    expect(uni.removeStorageSync).toHaveBeenCalledWith('juya.progress-queue')
    expect(uni.removeStorageSync).toHaveBeenCalledWith('juya.scene-position.private')
    expect(uni.removeStorageSync).not.toHaveBeenCalledWith('unrelated')
  })
})
