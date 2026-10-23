import { expect, it, vi } from 'vitest'

import { useListPosition } from '@/composables/use-list-position'

it('restores after content settles and rejects late restoration after owner change or disposal', async () => {
  const pageScrollTo = vi.fn()
  vi.stubGlobal('uni', { pageScrollTo })
  let owner = 'one',
    finish: () => void = () => undefined
  const position = useListPosition(() => owner)
  position.scroll(780)
  await position.preserve(async () => undefined)
  expect(pageScrollTo).toHaveBeenLastCalledWith({ scrollTop: 780, duration: 0 })
  const pending = position.preserve(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  )
  owner = 'two'
  finish()
  await pending
  expect(pageScrollTo).toHaveBeenCalledTimes(1)
  position.reset()
  position.scroll(300)
  const late = position.preserve(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      })
  )
  position.dispose()
  finish()
  await late
  expect(pageScrollTo).toHaveBeenCalledTimes(1)
  vi.unstubAllGlobals()
})

it('does not apply the previous account position when another owner starts the next refresh', async () => {
  const pageScrollTo = vi.fn()
  vi.stubGlobal('uni', { pageScrollTo })
  let owner = 'one'
  const position = useListPosition(() => owner)
  position.scroll(900)
  owner = 'two'
  await position.preserve(async () => undefined)
  expect(pageScrollTo).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})
