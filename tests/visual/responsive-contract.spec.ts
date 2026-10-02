import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { VISUAL_CASES, VISUAL_VIEWPORTS } from './visual-cases'

describe('visual regression contract', () => {
  it('covers 69 unique Figma states and fixes explore and history routes', () => {
    expect(VISUAL_CASES).toHaveLength(69)
    expect(new Set(VISUAL_CASES.map((item) => item.nodeId)).size).toBe(69)
    expect(VISUAL_CASES.find((item) => item.design === 'M06')?.path).toContain('/learning/explore')
    expect(VISUAL_CASES.find((item) => item.design === 'M25')?.path).toContain('/favorites/history')
  })
  it('keeps the three required screenshot viewports', () => {
    expect(VISUAL_VIEWPORTS.map((item) => `${item.width}x${item.height}`)).toEqual([
      '375x812',
      '390x844',
      '768x1024'
    ])
  })

  it('registers every critical visual route in pages.json', () => {
    const pages = readFileSync(resolve(process.cwd(), 'src/pages.json'), 'utf8')
    for (const visualCase of VISUAL_CASES) {
      expect(pages).toContain(visualCase.path.split('?')[0]?.replace(/^\//, ''))
    }
  })

  it('defines a shared tablet breakpoint and single-line scene navigation', () => {
    const mixins = readFileSync(resolve(process.cwd(), 'src/styles/mixins.scss'), 'utf8')
    const header = readFileSync(
      resolve(process.cwd(), 'src/components/page-header/page-header.vue'),
      'utf8'
    )
    expect(mixins).toContain('@mixin tablet')
    expect(header).toContain('white-space: nowrap')
    expect(header).toContain('text-overflow: ellipsis')
  })
})
