import { afterEach, expect, it, vi } from 'vitest'

import { listPageSize } from '@/services/list-page-size'

afterEach(() => vi.unstubAllGlobals())
it('requests only rows fitting the viewport and clamps missing or invalid device metrics', () => {
  vi.stubGlobal('uni', { getWindowInfo: () => ({ windowWidth: 375, windowHeight: 812 }) })
  expect(listPageSize(268, 400)).toBe(4)
  expect(listPageSize(190, 400)).toBe(6)
  vi.stubGlobal('uni', { getWindowInfo: () => ({ windowWidth: 375, windowHeight: 320 }) })
  expect(listPageSize(268, 900)).toBe(1)
  vi.stubGlobal('uni', { getWindowInfo: () => ({ windowWidth: 0, windowHeight: Number.NaN }) })
  expect(listPageSize(268, 400)).toBe(3)
})
