import { expect, it } from 'vitest'

import { parseShareTarget, shareTargetURL } from '@/services/share-service'

it('whitelists only target and stable card ID, stripping sender and queue data', () => {
  const target = parseShareTarget({
    target: 'scene',
    id: 'card-1',
    queue: 'foreign',
    version_id: 'old',
    token: 'secret'
  })
  expect(target).toEqual({ target: 'scene', id: 'card-1' })
  expect(shareTargetURL(target!)).toBe('/sub-packages/scenes/detail?target=scene&id=card-1')
  expect(parseShareTarget({ target: 'scene', id: '../me' })).toBeNull()
  expect(parseShareTarget({ target: 'unknown', id: 'card-1' })).toBeNull()
  expect(parseShareTarget({ target: 'learning', id: 'injected' })).toEqual({ target: 'learning' })
})
