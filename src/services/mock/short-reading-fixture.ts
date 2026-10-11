import { ApiError } from '@/services/http/errors'
import { HttpMethod } from '@/shared/enums/http'
import { ShortReadingAccess, ShortReadingKind } from '@/shared/enums/short-reading'

import type {
  ShortReadingPositionRequest,
  ShortReadingWireCompletion,
  ShortReadingWireDetail,
  ShortReadingWirePreview,
  ShortReadingWireProgress
} from '@/shared/contracts/short-reading'
import type { TransportRequest } from '@/shared/types/http'

const readings: ShortReadingWireDetail[] = [
  {
    content_id: 'reading-small-favor',
    content_type: ShortReadingKind.CONTENT,
    content_version: 2,
    revision_id: 'reading-favor-r2',
    schema_version: 2,
    title_en: 'A Small Favor',
    title_zh: '一个小忙',
    category: '生活短文',
    topic: '邻里',
    level: 'A2',
    introduction: '一次帮助，让邻里关系更近。',
    cover_url: null,
    access: ShortReadingAccess.TRIAL,
    paragraphs_en: [
      {
        paragraph_id: 'favor-p1',
        english: 'I was about to leave when my neighbor knocked on the door.'
      },
      {
        paragraph_id: 'favor-p2',
        english: 'She asked if I could water her plants while she was away.'
      },
      {
        paragraph_id: 'favor-p3',
        english: 'It took only a few minutes, but the small favor made us feel closer.'
      }
    ],
    translation_zh:
      '我正准备离开，邻居就敲响了门。她问我，能不能在她不在的时候帮她给植物浇水。只花了几分钟，这个小小的帮助却让我们觉得更亲近。',
    whole_audio: null,
    progress: null
  },
  {
    content_id: 'reading-walk-audio',
    content_type: ShortReadingKind.CONTENT,
    content_version: 1,
    revision_id: 'reading-walk-r1',
    schema_version: 2,
    title_en: 'Making Time for a Walk',
    title_zh: '给散步留一点时间',
    category: '生活短文',
    topic: '日常习惯',
    level: 'A2',
    introduction: '从忙碌日常里留出一点空隙。',
    cover_url: null,
    access: ShortReadingAccess.FORMAL,
    paragraphs_en: [
      { paragraph_id: 'walk-p1', english: 'I used to think I was too busy to go for a walk.' },
      {
        paragraph_id: 'walk-p2',
        english: 'One afternoon, I put my phone away and stepped outside for ten minutes.'
      },
      {
        paragraph_id: 'walk-p3',
        english:
          'A short break helped me notice the trees, the sky, and the quiet sounds of my neighborhood.'
      }
    ],
    translation_zh:
      '以前，我总觉得自己忙得没有时间散步。一天下午，我把手机收起来，走出门散步了十分钟。这短暂的休息让我注意到了树木、天空和邻里安静的声音。',
    whole_audio: { target_id: 'reading-walk-whole', resource_version: '1', duration_ms: 66000 },
    progress: null
  },
  {
    content_id: 'reading-urban-gardens',
    content_type: ShortReadingKind.CONTENT,
    content_version: 1,
    revision_id: 'reading-gardens-r1',
    schema_version: 2,
    title_en: 'Urban Gardens',
    title_zh: '城市花园',
    category: '雅思风格短文',
    topic: '城市生活',
    level: 'B1',
    introduction: '了解小型花园如何改变城市空间。',
    cover_url: null,
    access: ShortReadingAccess.PREVIEW,
    paragraphs_en: [
      {
        paragraph_id: 'gardens-p1',
        english: 'Restricted English must never be returned in a safe preview.'
      }
    ],
    translation_zh: '受限译文不能返回安全预览',
    whole_audio: null,
    progress: null
  }
]
const progress = new Map<string, ShortReadingWireProgress>()
const completionReplays = new Map<string, ShortReadingWireCompletion>()

/** 仅返回安全预览白名单，reading 为本地发布样本，位置与全文不进入列表 */
const preview = (reading: ShortReadingWireDetail): ShortReadingWirePreview => ({
  content_id: reading.content_id,
  content_type: ShortReadingKind.CONTENT,
  title_en: reading.title_en,
  title_zh: reading.title_zh,
  category: reading.category,
  topic: reading.topic,
  level: reading.level,
  introduction: reading.introduction,
  cover_url: reading.cover_url,
  access: reading.access,
  progress_summary: progress.get(reading.content_id)?.completed_at
    ? { completed_at: progress.get(reading.content_id)!.completed_at }
    : null
})

/** 按本地样本初始化独立进度，reading 为当前版本短文 */
const currentProgress = (reading: ShortReadingWireDetail): ShortReadingWireProgress =>
  progress.get(reading.content_id) ?? {
    content_id: reading.content_id,
    saved_content_version: reading.content_version,
    paragraph_id: null,
    offset: 0,
    client_sequence: 0,
    started_at: new Date().toISOString(),
    last_read_at: new Date().toISOString(),
    completed_at: null
  }

/** 处理纯阅读开发fixture，request 为共享HttpClient发出的真实请求，仅本地Mock模式调用 */
export const handleShortReadingMock = (request: TransportRequest): unknown | undefined => {
  const url = new URL(request.url)
  if (request.method === HttpMethod.GET && url.pathname === '/api/v1/short-readings')
    return { items: readings.map(preview), has_more: false, next_cursor: null }
  const matched =
    /^\/api\/v1\/short-readings\/([^/]+)\/(preview|open|progress|complete|resources\/([^/]+)\/signed-url)$/.exec(
      url.pathname
    )
  if (!matched) return undefined
  const id = decodeURIComponent(matched[1])
  const reading = readings.find((item) => item.content_id === id)
  if (!reading) throw new ApiError('SHORT_READING_NOT_FOUND', '短文不存在', 404)
  const operation = matched[2]
  if (request.method === HttpMethod.GET && operation === 'preview') return preview(reading)
  if (reading.access === ShortReadingAccess.PREVIEW)
    throw new ApiError('SHORT_READING_NO_ACCESS', '当前账号暂未开通此内容', 403)
  if (request.method === HttpMethod.POST && operation === 'open') {
    const value = currentProgress(reading)
    progress.set(id, value)
    return { ...reading, progress: value }
  }
  if (request.method === HttpMethod.PUT && operation === 'progress') {
    const body = request.body as ShortReadingPositionRequest
    if (body.content_version !== reading.content_version)
      throw new ApiError('CONTENT_VERSION_CONFLICT', '短文已更新', 409)
    const current = currentProgress(reading)
    if (body.client_sequence > (current.client_sequence ?? 0))
      progress.set(id, {
        ...current,
        paragraph_id: body.paragraph_id,
        offset: body.offset,
        client_sequence: body.client_sequence,
        last_read_at: new Date().toISOString()
      })
    return progress.get(id) ?? current
  }
  if (request.method === HttpMethod.POST && operation === 'complete') {
    if ((request.body as { content_version: number })?.content_version !== reading.content_version)
      throw new ApiError('CONTENT_VERSION_CONFLICT', '短文已更新', 409)
    const replayKey = `${id}:${reading.content_version}:${request.headers['Idempotency-Key']}`
    const replay = completionReplays.get(replayKey)
    if (replay) return replay
    const current = currentProgress(reading)
    const created = !current.completed_at
    const completed = {
      ...current,
      completed_at: current.completed_at ?? new Date().toISOString(),
      last_read_at: new Date().toISOString()
    }
    progress.set(id, completed)
    const response = { progress: completed, created }
    completionReplays.set(replayKey, response)
    return response
  }
  if (request.method === HttpMethod.GET && operation.startsWith('resources/')) {
    if (
      !reading.whole_audio ||
      decodeURIComponent(matched[3]) !== reading.whole_audio.target_id ||
      url.searchParams.get('revision_id') !== reading.revision_id
    )
      throw new ApiError('SHORT_READING_RESOURCE_INVALID', '短文音频不存在', 404)
    return {
      resource_id: reading.whole_audio.target_id,
      url: '/static/fixtures/silence.wav',
      expires_at: '2099-01-01T00:00:00Z'
    }
  }
  return undefined
}
