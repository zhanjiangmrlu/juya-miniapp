import { expect, it } from 'vitest'

import { sceneImageId, sceneThumbnailURL } from '@/services/scene-image'

it('adds the small thumbnail profile without modifying signed query parameters or fragments', () => {
  expect(sceneThumbnailURL('https://mini.example/media/credential')).toBe(
    'https://mini.example/media/credential?thumbnail=list'
  )
  expect(sceneThumbnailURL('https://mini.example/media/credential?signature=a%2Bb#image')).toBe(
    'https://mini.example/media/credential?signature=a%2Bb&thumbnail=list#image'
  )
  expect(sceneThumbnailURL('')).toBe('')
  expect(sceneImageId('thumbnail', 'full', true)).toBe('full')
})
