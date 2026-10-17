import { expect, it } from 'vitest'

import { rebaseIdentity } from '@/features/profile/identity-model'
it('keeps an edited nickname while accepting an untouched avatar updated on another device', () => {
  expect(
    rebaseIdentity(
      { nickname: 'Alice', avatar_id: 'a' },
      { nickname: 'New name', avatar_id: 'a' },
      { nickname: 'Other name', avatar_id: 'b' }
    )
  ).toEqual({ nickname: 'New name', avatar_id: 'b' })
})
it('preserves an explicitly selected avatar even if its old identifier is unchanged', () => {
  expect(
    rebaseIdentity(
      { nickname: 'Alice', avatar_id: 'a' },
      { nickname: 'Alice', avatar_id: 'a' },
      { nickname: 'Other name', avatar_id: 'b' },
      true
    )
  ).toEqual({ nickname: 'Other name', avatar_id: 'a' })
})
