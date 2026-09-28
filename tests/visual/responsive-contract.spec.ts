import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { VISUAL_CASES, VISUAL_VIEWPORTS } from './visual-cases'

describe('visual regression contract', () => {
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

  it('defines a shared tablet breakpoint and wrapped heading behavior', () => {
    const mixins = readFileSync(resolve(process.cwd(), 'src/styles/mixins.scss'), 'utf8')
    const header = readFileSync(
      resolve(process.cwd(), 'src/components/page-header/page-header.vue'),
      'utf8'
    )
    expect(mixins).toContain('@mixin tablet')
    expect(header).toContain('white-space: normal')
  })
})
