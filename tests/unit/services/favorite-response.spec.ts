import { describe, expect, it } from 'vitest'

import { adaptFavoriteItem } from '@/services/favorite-response'

import type { FavoriteItem } from '@/shared/contracts/favorites'

describe('收藏固定快照', () => {
  it('保留失效来源的释义且使用其修订签发可选发音', () => {
    const favorite = {
      normalized_key: 'latte',
      entry_type: 'VOCABULARY',
      sources: [
        {
          scene_id: 'coffee',
          revision_id: 'revision-1',
          entry_snapshot: {
            english: 'latte',
            chinese: '拿铁咖啡',
            phonetic: '/latte/',
            audio_target_id: 'word-audio',
            audio_version_id: 'audio-1'
          }
        }
      ]
    } as FavoriteItem
    expect(adaptFavoriteItem(favorite)).toMatchObject({
      english: 'latte',
      chinese: '拿铁咖啡',
      audio: { scene_id: 'coffee', revision_id: 'revision-1', resource_id: 'word-audio' }
    })
  })
})
