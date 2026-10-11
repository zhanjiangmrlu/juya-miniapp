import { ApiError } from '@/services/http/errors'
import publishedScene from '@/services/mock/published-scene.json'
import { FavoriteSourceStatus, FavoriteType } from '@/shared/enums/favorites'
import { HttpMethod } from '@/shared/enums/http'

import type {
  FavoriteReference,
  FavoriteSnapshot,
  FavoriteSourceResolution
} from '@/shared/contracts/favorites'
import type { TransportRequest } from '@/shared/types/http'

/** 复制隔离演示响应，value 为内存契约资料 */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
/** 获取稳定来源身份键，reference 为确认内容引用 */
const identity = (reference: FavoriteReference) =>
  JSON.stringify([
    reference.content_type,
    reference.content_id,
    reference.entry_id,
    reference.sense_id,
    reference.source_id
  ])

/** 创建本次预览独占的收藏状态，不连接或修改任何真实账户 */
export const createFavoriteSnapshotMock = () => {
  const scene = publishedScene.scene
  const records = new Map<string, FavoriteSnapshot>()
  const confirmed = new Map<string, FavoriteSnapshot>()
  const commands = new Map<string, { hash: string; result: unknown }>()
  const reviews = new Map<string, { card_ids: string[]; completed: boolean }>()
  let reviewSequence = 0
  const entries = [
    ...scene.content.vocabulary.map((entry) => ({ ...entry, entry_type: FavoriteType.VOCABULARY })),
    ...scene.content.chunks.map((entry) => ({ ...entry, entry_type: FavoriteType.PHRASE }))
  ]
  for (const entry of entries) {
    const snapshot: FavoriteSnapshot = {
      favorite_id: `mock-favorite-${entry.entry_id}`,
      active: true,
      content_type: 'dialogue',
      content_id: scene.scene_id,
      content_version: scene.content_version,
      entry_id: entry.entry_id,
      sense_id: `sense-${entry.entry_id}`,
      source_id: entry.source_sentence_ids[0] || entry.entry_id,
      entry_type: entry.entry_type === FavoriteType.PHRASE ? 'chunk' : 'word',
      snapshot_version: 1,
      saved_content_version: scene.content_version,
      english: entry.english,
      phonetic: 'phonetic' in entry ? entry.phonetic : undefined,
      meaning_zh: entry.entry_id === 'word-medium' ? '中杯' : entry.chinese,
      explanation: entry.explanation,
      source_sentence: scene.content.dialogue
        .filter((sentence) => entry.source_sentence_ids.includes(sentence.id))
        .map((sentence) => sentence.english)
        .join('\n'),
      source_title: scene.content.title_zh,
      source_locator: { sentence_id: entry.source_sentence_ids[0] },
      favorited_at: '2026-10-11T00:00:00Z',
      last_reviewed_at: null,
      pronunciation: entry.audio_target_id
        ? {
            target_id: entry.audio_target_id,
            resource_version: entry.audio_version_id,
            can_prepare: true
          }
        : undefined
    }
    records.set(snapshot.favorite_id, snapshot)
    confirmed.set(identity(snapshot), copy(snapshot))
  }
  const medium: FavoriteSnapshot = {
    favorite_id: 'mock-favorite-medium-adjective',
    active: true,
    content_type: 'dialogue',
    content_id: scene.scene_id,
    content_version: 1,
    entry_id: 'word-medium-adjective',
    sense_id: 'sense-medium-adjective',
    source_id: 'source-medium-adjective',
    entry_type: 'word',
    snapshot_version: 1,
    saved_content_version: 1,
    english: 'medium',
    phonetic: '/ˈmiː.di.əm/',
    meaning_zh: '中等的',
    explanation: '表示大小、程度或数量介于两者之间。',
    source_sentence: 'It is a medium-sized bag.',
    source_title: '日常物品',
    favorited_at: '2026-10-11T00:00:00Z',
    last_reviewed_at: null,
    pronunciation: {
      target_id: 'word-medium-adjective',
      resource_version: 'word-audio-v1',
      can_prepare: true
    }
  }
  const receipt: FavoriteSnapshot = {
    ...medium,
    favorite_id: 'mock-favorite-receipt',
    entry_id: 'word-receipt',
    sense_id: 'sense-receipt',
    source_id: 'source-receipt',
    english: 'receipt',
    phonetic: '/rɪˈsiːt/',
    meaning_zh: '收据',
    explanation: '购物付款后获得的凭据。',
    source_sentence: 'Could I have a receipt, please?',
    source_title: '在超市',
    pronunciation: null
  }
  const rainCheck: FavoriteSnapshot = {
    ...medium,
    favorite_id: 'mock-favorite-rain-check',
    entry_id: 'chunk-rain-check',
    sense_id: 'sense-rain-check',
    source_id: 'source-rain-check',
    entry_type: 'chunk',
    english: 'take a rain check on something',
    phonetic: null,
    meaning_zh: '这次先不了，改天再约。',
    explanation: '用委婉语气暂时谢绝邀请，保留以后再约的意思。',
    source_sentence: 'Can I take a rain check on dinner?',
    source_title: '周末计划',
    pronunciation: {
      target_id: 'chunk-rain-check',
      resource_version: 'chunk-audio-v1',
      can_prepare: true
    }
  }
  const longPhrase: FavoriteSnapshot = {
    ...rainCheck,
    favorite_id: 'mock-favorite-long-phrase',
    entry_id: 'chunk-long-phrase',
    sense_id: 'sense-long-phrase',
    source_id: 'source-long-phrase',
    english:
      'Could you let me know whether we can reschedule the meeting for next Friday afternoon, after everyone has had enough time to review the documents?',
    meaning_zh: '可以请你告诉我，在大家有足够时间看完资料之后，我们是否能把会议改到下周五下午吗？',
    explanation: '礼貌询问能否改期，并补充资料准备的条件。',
    source_sentence:
      'Could you let me know whether we can reschedule the meeting for next Friday afternoon, after everyone has had enough time to review the documents?',
    pronunciation: { target_id: 'chunk-long-phrase', can_prepare: true }
  }
  for (const snapshot of [medium, receipt, rainCheck, longPhrase]) {
    records.set(snapshot.favorite_id, snapshot)
    confirmed.set(identity(snapshot), copy(snapshot))
  }
  /** 执行隔离命令并按固定键重放，request 为预览请求，action 为内存状态更新 */
  const command = (request: TransportRequest, action: () => unknown) => {
    const key = request.headers['Idempotency-Key'] || request.headers['idempotency-key']
    if (!key) throw new ApiError('IDEMPOTENCY_KEY_REQUIRED', '演示命令缺少幂等键', 422)
    const url = new URL(request.url)
    const scope = `${request.method}:${url.pathname}:${key}`
    const hash = JSON.stringify(request.body ?? null)
    const previous = commands.get(scope)
    if (previous) {
      if (previous.hash !== hash)
        throw new ApiError('IDEMPOTENCY_KEY_CONFLICT', '同一幂等键不能提交不同资料', 409)
      return copy(previous.result)
    }
    const result = action()
    commands.set(scope, { hash, result: copy(result) })
    return copy(result)
  }
  /** 分页返回有效完整快照，url 为包含limit与cursor的查询 */
  const page = (url: URL) => {
    const items = [...records.values()].filter((item) => item.active)
    const start = Math.max(0, Number(url.searchParams.get('cursor') || 0))
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)))
    const visible = items.slice(start, start + limit)
    const hasMore = start + limit < items.length
    return {
      items: copy(visible),
      has_more: hasMore,
      next_cursor: hasMore ? String(start + limit) : null
    }
  }
  /** 返回本次演示收藏状态，request 为统一Transport请求；无匹配时交给其他fixture */
  const handle = (request: TransportRequest): unknown | undefined => {
    const url = new URL(request.url)
    const path = url.pathname
    if (request.method === HttpMethod.GET && path === '/api/v1/favorite-snapshots') return page(url)
    if (
      request.method === HttpMethod.GET &&
      path === '/api/v1/reviews/queue' &&
      url.searchParams.get('snapshot_schema') === '2'
    )
      return page(url)
    if (request.method === HttpMethod.POST && path === '/api/v1/favorite-snapshots')
      return command(request, () => {
        const reference = request.body as FavoriteReference
        const allowed = [
          'content_type',
          'content_id',
          'content_version',
          'entry_id',
          'sense_id',
          'source_id'
        ]
        if (!reference || Object.keys(reference).some((key) => !allowed.includes(key)))
          throw new ApiError('FAVORITE_REFERENCE_INVALID', '收藏只提交确认资料引用', 422)
        const source = confirmed.get(identity(reference))
        if (!source) throw new ApiError('FAVORITE_REFERENCE_NOT_FOUND', '演示确认条目不存在', 404)
        if (reference.content_version !== source.saved_content_version)
          throw new ApiError('CONTENT_VERSION_CONFLICT', '内容已更新，请刷新', 409)
        const previous = records.get(source.favorite_id)!
        if (previous.active) return copy(previous)
        const restored = {
          ...copy(source),
          active: true,
          snapshot_version: previous.snapshot_version + 1
        }
        records.set(source.favorite_id, restored)
        return restored
      })
    const match = path.match(/^\/api\/v1\/favorite-snapshots\/([^/]+)(\/source-resolution)?$/)
    if (match) {
      const id = decodeURIComponent(match[1]!)
      const snapshot = records.get(id)
      if (!snapshot) throw new ApiError('FAVORITE_NOT_FOUND', '演示收藏不存在', 404)
      if (request.method === HttpMethod.DELETE && !match[2])
        return command(request, () => {
          snapshot.active = false
          return { favorite_id: id, active: false, snapshot_version: snapshot.snapshot_version }
        })
      if (request.method === HttpMethod.GET && !snapshot.active)
        throw new ApiError('FAVORITE_NOT_FOUND', '演示收藏已取消', 404)
      if (request.method === HttpMethod.GET && match[2]) {
        const denied = id === receipt.favorite_id
        const exact = snapshot.source_locator && snapshot.source_id !== medium.source_id
        const result: FavoriteSourceResolution = {
          content_type: snapshot.content_type,
          content_id: snapshot.content_id,
          saved_content_version: snapshot.saved_content_version,
          target_content_version: denied ? null : scene.content_version,
          status: denied
            ? FavoriteSourceStatus.NO_ACCESS
            : exact
              ? FavoriteSourceStatus.EXACT
              : FavoriteSourceStatus.UPDATED_OR_UNRESOLVED,
          locator: !denied && exact ? snapshot.source_locator! : null,
          safe_summary: { title: snapshot.source_title }
        }
        return result
      }
      if (request.method === HttpMethod.GET) return copy(snapshot)
    }
    if (
      request.method === HttpMethod.POST &&
      path === '/api/v1/reviews' &&
      (request.body as { snapshot_schema?: number })?.snapshot_schema === 2
    )
      return command(request, () => {
        const ids = (request.body as { card_ids: string[] }).card_ids
        if (
          !ids?.length ||
          new Set(ids).size !== ids.length ||
          ids.some((id) => !records.get(id)?.active)
        )
          throw new ApiError('REVIEW_CARDS_INVALID', '演示队列含无效收藏', 422)
        const id = `mock-snapshot-review-${++reviewSequence}`
        reviews.set(id, { card_ids: [...ids], completed: false })
        return {
          id,
          card_count: ids.length,
          card_ids: [...ids],
          cards: copy(ids.map((id) => records.get(id)!)),
          started_at: '2026-10-11T00:00:00Z'
        }
      })
    const review = path.match(/^\/api\/v1\/reviews\/(mock-snapshot-review-[^/]+)\/complete$/)
    if (request.method === HttpMethod.POST && review)
      return command(request, () => {
        const session = reviews.get(review[1]!)
        if (!session) throw new ApiError('REVIEW_NOT_FOUND', '演示复习不存在', 404)
        const created = !session.completed
        session.completed = true
        for (const id of session.card_ids) {
          const item = records.get(id)
          if (item?.active) item.last_reviewed_at = '2026-10-11T00:05:00Z'
        }
        return {
          id: review[1],
          created,
          completed_at: '2026-10-11T00:05:00Z',
          checkin_date: '2026-10-11'
        }
      })
    return undefined
  }
  return { handle }
}
