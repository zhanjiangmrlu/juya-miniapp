import { describe, expect, it, vi } from 'vitest'

import { createPronunciationService } from '@/features/audio/pronunciation-service'

describe('发音请求降级', () => {
  it.each(['RUNNING', 'RETRY', 'RECOVER'])(
    '后台%s仍进入同位等待且不触发重复收费请求',
    async (status) => {
      const client = {
        post: async () => ({
          status,
          task_id: 'existing-task',
          error_code: null,
          next_retry_at: 123
        }),
        get: vi.fn()
      }
      const result = await createPronunciationService(client as never).resolve(
        { target_id: 'word' },
        { favorite_id: 'owned' }
      )
      expect(result).toMatchObject({ status: 'PREPARING', task_id: 'existing-task' })
    }
  )
  it('后台未知收费结果只显示失败，不自行开放再次合成', async () => {
    const client = {
      post: async () => ({
        status: 'UNKNOWN',
        task_id: 'uncertain-task',
        error_code: 'PROVIDER_TIMEOUT'
      }),
      get: vi.fn()
    }
    const result = await createPronunciationService(client as never).resolve(
      { target_id: 'word' },
      { favorite_id: 'owned' }
    )
    expect(result).toMatchObject({ status: 'FAILED', code: 'PROVIDER_TIMEOUT', can_retry: false })
  })
  it.each(['PRONUNCIATION_UNAVAILABLE', 'TTS_DISABLED', 'TTS_TEXT_LIMIT'])(
    '服务端%s只降级发音，不冒泡为原文失权',
    async (code) => {
      const client = {
        post: async () => {
          throw { code, status: 404 }
        },
        get: vi.fn()
      }
      const result = await createPronunciationService(client as never).resolve(
        { target_id: 'word' },
        { favorite_id: 'owned' }
      )
      expect(result).toMatchObject({ status: 'UNAVAILABLE', can_retry: false, code })
    }
  )
  it('失权错误仍交给播放器停止，不能被降级掩盖', async () => {
    const denied = { code: 'PRONUNCIATION_FORBIDDEN', status: 403 }
    const client = {
      post: async () => {
        throw denied
      },
      get: vi.fn()
    }
    await expect(
      createPronunciationService(client as never).resolve(
        { target_id: 'word' },
        { favorite_id: 'other-user' }
      )
    ).rejects.toEqual(denied)
  })
})
