import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { presentFavorites } from '@/features/favorites/favorite-presenter'
import { createFavoriteService } from '@/features/favorites/favorite-service'
import { adaptFavoriteSnapshot } from '@/features/favorites/favorite-snapshot-response'
import { presentSourceResolution } from '@/features/favorites/source-resolution'
import { useFavoriteStore } from '@/stores/favorites'

import type {
  FavoriteItem,
  FavoriteReference,
  FavoriteSnapshot,
  StoredFavoriteSnapshot
} from '@/shared/contracts/favorites'
import type { FavoriteService } from '@/shared/types/favorites'
import type { HttpClient } from '@/shared/types/http'

const reference = {
  content_type: 'dialogue',
  content_id: 'cafe',
  content_version: 1,
  entry_id: 'medium-cup',
  sense_id: 'cup',
  source_id: 'sentence-2'
} satisfies FavoriteReference

/** 构造同英文不同义项的完整快照，id 为收藏ID，meaning 为本篇保存释义 */
const snapshot = (id: string, meaning = '中杯'): FavoriteItem => ({
  id,
  favorite_id: id,
  active: true,
  snapshot_version: 1,
  saved_content_version: 1,
  ...reference,
  entry_id: id,
  entry_stable_id: id,
  entry_type: 'VOCABULARY',
  english: 'medium',
  chinese: meaning,
  normalized_key: 'medium',
  explanation: '完整保存解释',
  favorited_at: '',
  last_reviewed_at: null,
  sources: [
    {
      scene_id: 'cafe',
      scene_title: '咖啡店',
      sentence_snapshot: 'A medium cup, please.',
      source_locator: 'sentence-2',
      original_link: null
    }
  ]
})

beforeEach(() => setActivePinia(createPinia()))

describe('V1.5 独立收藏快照', () => {
  it('取消响应之后旧GET快照不能复活银行，更高修订的重新收藏仍可同步', async () => {
    const store = useFavoriteStore()
    const old = snapshot('card')
    store.remember(old)
    await store.remove('card', {
      remove: async () => ({ favorite_id: 'card', active: false, snapshot_version: 1 })
    } as unknown as FavoriteService)
    store.remember(old)
    expect(store.items).toEqual([])
    store.remember({ ...old, snapshot_version: 2, chinese: '明确重新收藏的资料' })
    expect(store.items[0]?.chinese).toBe('明确重新收藏的资料')
    store.remember(old)
    expect(store.items[0]?.snapshot_version).toBe(2)
  })
  it('同账号重复进入银行时等待当前分页读取完成，不把未完成列表当已加载', async () => {
    const store = useFavoriteStore()
    let finish!: (page: unknown) => void
    const list = vi.fn(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const service = { list } as unknown as FavoriteService
    const first = store.load(service, true)
    let secondFinished = false
    const second = store.load(service, true).then(() => {
      secondFinished = true
    })
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect(secondFinished).toBe(false)
    finish({ items: [snapshot('card')], has_more: false, next_cursor: null })
    await Promise.all([first, second])
    expect(list).toHaveBeenCalledOnce()
    expect(store.items).toHaveLength(1)
  })
  it('真实BFF public_snapshot扁平DTO的对象来源位置和nullable发音版本可直接适配', () => {
    const raw: FavoriteSnapshot = {
      ...reference,
      schema_version: 2,
      favorite_id: 'real-flat',
      active: true,
      entry_type: 'word',
      snapshot_version: 1,
      saved_content_version: 1,
      english: 'medium',
      meaning_zh: '中杯',
      phonetic: '',
      explanation: '',
      source_sentence: 'A medium coffee, please.',
      source_title: '咖啡店',
      source_locator: { sentence_id: 's1', paragraph_id: null },
      image_asset_id: 'saved-image',
      pronunciation: { target_id: 'medium', resource_version: null, can_prepare: true },
      favorited_at: '2026-10-11T00:00:00Z',
      last_reviewed_at: null
    }
    expect(adaptFavoriteSnapshot(raw)).toMatchObject({
      id: 'real-flat',
      chinese: '中杯',
      sources: [{ source_locator: 's1' }],
      pronunciation: { target_id: 'medium', resource_version: undefined }
    })
  })
  it('BFF内部ConfirmedSnapshot嵌套data样本保留固定引用，不把新版本替换旧义项', () => {
    const raw: StoredFavoriteSnapshot = {
      favorite_id: 'stored',
      active: true,
      snapshot_version: 3,
      saved_content_version: 1,
      favorited_at: '',
      last_reviewed_at: null,
      schema_version: 2,
      data: {
        reference: { ...reference, entry_type: 'word' },
        revision_id: 'saved-revision',
        english: 'medium',
        meaning_zh: '中杯',
        phonetic: '',
        explanation: '当时解释',
        source_sentence: 'A medium coffee, please.',
        source_title: '咖啡店',
        source_locator: { sentence_id: 's1' },
        pronunciation: null
      }
    }
    expect(adaptFavoriteSnapshot(raw)).toMatchObject({
      id: 'stored',
      entry_id: 'medium-cup',
      sense_id: 'cup',
      chinese: '中杯',
      snapshot_version: 3,
      explanation: '当时解释',
      sources: [{ source_locator: 's1', revision_id: 'saved-revision' }]
    })
  })
  it('schema2完整资料直接恢复保存释义、解释、来源和独立发音引用', () => {
    const raw: FavoriteSnapshot = {
      ...reference,
      favorite_id: 'cup',
      active: true,
      entry_type: 'word',
      snapshot_version: 2,
      saved_content_version: 1,
      english: 'medium',
      meaning_zh: '中杯',
      phonetic: '/ˈmiː.di.əm/',
      explanation: '完整旧快照解释',
      source_sentence: 'A medium, please.',
      source_title: '咖啡店',
      favorited_at: '',
      last_reviewed_at: null,
      pronunciation: { target_id: 'fixed', resource_version: 'audio-v1', can_prepare: true }
    }
    expect(adaptFavoriteSnapshot(raw)).toMatchObject({
      id: 'cup',
      entry_type: 'VOCABULARY',
      chinese: '中杯',
      explanation: '完整旧快照解释',
      saved_content_version: 1,
      pronunciation: { target_id: 'fixed', resource_version: 'audio-v1' },
      sources: [{ sentence_snapshot: 'A medium, please.', original_link: null }]
    })
  })
  it('相同英文不同义项和来源始终是独立银行卡', () => {
    const groups = presentFavorites([snapshot('cup'), snapshot('size', '中等的')])
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([['cup'], ['size']])
  })
  it('只提交稳定引用并使用schema2，取消采用真实返回状态', async () => {
    const client = {
      post: vi.fn().mockResolvedValue(snapshot('cup')),
      delete: vi.fn().mockResolvedValue({ favorite_id: 'cup', active: false }),
      get: vi.fn()
    }
    const service = createFavoriteService(client as unknown as HttpClient)
    await service.create(reference, 'create-key')
    expect(client.post).toHaveBeenCalledWith('/api/v1/favorite-snapshots', reference, {
      idempotencyKey: 'create-key'
    })
    expect(await service.remove('cup', 'remove-key')).toEqual({ favorite_id: 'cup', active: false })
    expect(client.delete).toHaveBeenCalledWith('/api/v1/favorite-snapshots/cup', undefined, {
      idempotencyKey: 'remove-key'
    })
    await service.createReview(['cup', 'size'], 'review-key')
    expect(client.post).toHaveBeenLastCalledWith(
      '/api/v1/reviews',
      { card_ids: ['cup', 'size'], snapshot_schema: 2 },
      { idempotencyKey: 'review-key' }
    )
  })
  it('收藏请求共享处理中状态，失败恢复且重试复用幂等键', async () => {
    const store = useFavoriteStore()
    store.seedState(reference, { is_favorited: false, favorite_id: null })
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(snapshot('cup'))
    const service = { create } as unknown as FavoriteService
    await expect(store.create(reference, service)).rejects.toThrow('offline')
    expect(store.stateFor(reference)).toMatchObject({ is_favorited: false, pending: false })
    await store.create(reference, service)
    expect(create.mock.calls[0]?.[1]).toBe(create.mock.calls[1]?.[1])
    expect(store.stateFor(reference)).toMatchObject({
      is_favorited: true,
      favorite_id: 'cup',
      pending: false
    })
  })
  it('取消仅移除选中ID和后续队列，保留其他同英文卡与正确索引', async () => {
    const store = useFavoriteStore()
    store.items = [snapshot('cup'), snapshot('size', '中等的')]
    store.updateTabState('VOCABULARY', {
      review: {
        cardIds: ['cup', 'size'],
        index: 1,
        face: 'BACK',
        session: { id: 'old', card_count: 2, started_at: '' }
      }
    })
    await store.remove('cup', {
      remove: vi.fn().mockResolvedValue({ favorite_id: 'cup', active: false })
    } as unknown as FavoriteService)
    expect(store.items.map((item) => item.id)).toEqual(['size'])
    expect(store.tabState.VOCABULARY.review).toMatchObject({ cardIds: ['size'], index: 0 })
    expect(store.tabState.VOCABULARY.review?.session).toBeUndefined()
  })
  it('分页请求中的旧卡不能覆盖其间取消成功的状态', async () => {
    const store = useFavoriteStore()
    store.items = [snapshot('cup')]
    let finish!: (value: unknown) => void
    const request = store.load(
      {
        list: () =>
          new Promise((resolve) => {
            finish = resolve
          })
      } as unknown as FavoriteService,
      true
    )
    await store.remove('cup', {
      remove: vi.fn().mockResolvedValue({ favorite_id: 'cup', active: false })
    } as unknown as FavoriteService)
    finish({ items: [snapshot('cup')], has_more: false, next_cursor: null })
    await request
    expect(store.items).toEqual([])
  })
  it('同一目标的并发点击共享请求且保留可信状态，版本冲突不变更旧意思', async () => {
    const store = useFavoriteStore()
    let reject!: (reason: unknown) => void
    const create = vi.fn(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail
        })
    )
    const service = { create } as unknown as FavoriteService
    const first = store.create(reference, service)
    const second = store.create(reference, service)
    expect(create).toHaveBeenCalledOnce()
    expect(store.stateFor(reference).pending).toBe(true)
    store.seedState(reference, { is_favorited: true, favorite_id: 'stale' })
    expect(store.stateFor(reference).is_favorited).toBe(false)
    reject({ code: 'CONTENT_VERSION_CONFLICT' })
    await Promise.allSettled([first, second])
    expect(store.stateFor(reference)).toMatchObject({
      is_favorited: false,
      pending: false,
      error: '内容已更新，请重新加载后收藏'
    })
  })
  it('切换账号后旧收藏响应不能恢复任何银行或目标状态', async () => {
    const store = useFavoriteStore()
    let finish!: (value: FavoriteItem) => void
    const request = store.create(reference, {
      create: () =>
        new Promise((resolve) => {
          finish = resolve
        })
    } as unknown as FavoriteService)
    store.clear()
    finish(snapshot('cup'))
    await request
    expect(store.items).toEqual([])
    expect(store.stateFor(reference)).toMatchObject({
      is_favorited: false,
      favorite_id: null,
      pending: false
    })
  })
  it('同账号收藏创建期间刷新银行仍应用成功响应，读取代次不充当账号代次', async () => {
    const store = useFavoriteStore()
    let finishCreate!: (value: FavoriteItem) => void
    let finishList!: (value: unknown) => void
    const service = {
      create: () =>
        new Promise((resolve) => {
          finishCreate = resolve
        }),
      list: () =>
        new Promise((resolve) => {
          finishList = resolve
        })
    } as unknown as FavoriteService
    const creating = store.create(reference, service)
    const loading = store.load(service, true)
    finishCreate(snapshot('cup'))
    await creating
    finishList({ items: [], has_more: false, next_cursor: null })
    await loading
    expect(store.items.map((item) => item.id)).toEqual(['cup'])
    expect(store.stateFor(reference)).toMatchObject({
      is_favorited: true,
      favorite_id: 'cup',
      pending: false
    })
  })
  it('取消接口未确认最终无效时保留卡片及真实已收藏状态', async () => {
    const store = useFavoriteStore()
    store.items = [snapshot('cup')]
    store.seedState(reference, { is_favorited: true, favorite_id: 'cup' })
    await expect(
      store.remove('cup', {
        remove: async () => ({ favorite_id: 'cup', active: true })
      } as unknown as FavoriteService)
    ).rejects.toThrow('取消收藏状态未确认')
    expect(store.items).toHaveLength(1)
    expect(store.stateFor(reference)).toMatchObject({
      is_favorited: true,
      favorite_id: 'cup',
      pending: false
    })
  })
})

describe('当前版本来源解析', () => {
  const base = {
    content_type: 'dialogue',
    content_id: 'cafe',
    saved_content_version: 1,
    target_content_version: 3,
    safe_summary: { title: '咖啡店' }
  }
  it('EXACT只定位当前版，不携带收藏旧版本或修订ID', () => {
    const result = presentSourceResolution({ ...base, status: 'EXACT', locator: 'sentence-9' })
    expect(result.route).toBe(
      '/sub-packages/scene/detail?sceneId=cafe&sourceLocator=sentence-9&contentVersion=3'
    )
    expect(result.message).toBe('')
  })
  it('短文使用实际contentId入口并仅传当前版本的段落定位', () => {
    const result = presentSourceResolution({
      ...base,
      content_type: 'short_reading',
      content_id: 'reading/one',
      status: 'EXACT',
      locator: { paragraph_id: 'paragraph-2', sentence_id: null }
    })
    expect(result.route).toBe(
      '/sub-packages/short-reading/detail?contentId=reading%2Fone&sourceLocator=paragraph-2&contentVersion=3'
    )
  })
  it('真实SourceLocator对象只提取当前句ID，不把对象序列化为无效位置', () => {
    const result = presentSourceResolution({
      ...base,
      status: 'EXACT',
      locator: { sentence_id: 's1', paragraph_id: null }
    })
    expect(result.route).toBe(
      '/sub-packages/scene/detail?sceneId=cafe&sourceLocator=s1&contentVersion=3'
    )
    expect(result.route).not.toContain('object')
  })
  it('来源变化有权从顶部打开，不能使用旧定位', () => {
    const result = presentSourceResolution({
      ...base,
      status: 'UPDATED_OR_UNRESOLVED',
      locator: null
    })
    expect(result.route).toBe('/sub-packages/scene/detail?sceneId=cafe&contentVersion=3')
    expect(result.message).toBe('来源内容已更新')
  })
  it('无权不生成任何完整原文入口', () => {
    expect(presentSourceResolution({ ...base, status: 'NO_ACCESS', locator: null })).toMatchObject({
      route: null
    })
  })
  it('未知来源状态不能产生授权入口', () => {
    expect(
      presentSourceResolution({ ...base, status: 'FUTURE' as never, locator: 'old' }).route
    ).toBeNull()
  })
})
