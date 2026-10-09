import { describe, expect, it } from 'vitest'

import type { FavoriteItem } from '@/shared/contracts/favorites'
import type { HomeResponse } from '@/shared/contracts/home'
import type { LearningCatalogResponse, SceneOpenResponse } from '@/shared/contracts/learning'
import type { SessionResponse } from '@/shared/contracts/session'

import { createIntegrationClient } from './mock-client'

describe('learning flow integration', () => {
  it('covers login, open scene, favorite, completion, result, and review', async () => {
    const client = createIntegrationClient()
    const session = await client.post<SessionResponse>(
      '/api/v1/session/wechat',
      { code: 'e2e-code' },
      { auth: false }
    )
    expect(session.access_token).toBeTruthy()

    const home = await client.get<HomeResponse>('/api/v1/home')
    const catalog = await client.get<LearningCatalogResponse>('/api/v1/learning/catalog')
    const sceneId = catalog.items[0]?.scene_id
    expect(home.today_task).toBeTruthy()
    expect(sceneId).toBeTruthy()

    const scene = await client.post<SceneOpenResponse>(`/api/v1/scenes/${sceneId}/open`)
    expect(scene.access).toBe('OPEN')
    const entry = scene.scene?.entries.find((item) => item.entry_type === 'VOCABULARY')
    expect(entry).toBeTruthy()

    const favorite = await client.post<FavoriteItem>('/api/v1/favorites', {
      entry_stable_id: entry?.entry_id,
      entry_type: entry?.entry_type,
      scene_id: sceneId,
      source_locator: entry?.source_locator,
      text: entry?.text
    })
    expect(favorite.id).toBeTruthy()

    await client.post(`/api/v1/scenes/${sceneId}/complete`)
    const result = await client.get<{ completed_scenes: number }>(
      `/api/v1/scenes/${sceneId}/result`
    )
    expect(result.completed_scenes).toBeGreaterThan(0)

    const review = await client.post<{ id: string }>('/api/v1/reviews')
    const completion = await client.post<{ created: boolean }>(
      `/api/v1/reviews/${review.id}/complete`
    )
    expect(completion.created).toBe(true)
  })
})
