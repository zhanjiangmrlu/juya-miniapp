import { describe, expect, it } from 'vitest'

import { chooseSheetEntry, openSheet } from '@/features/vocabulary-sheet/sheet-controller'

import type { StablePosition } from '@/shared/contracts/common'
import type { SceneEntry } from '@/shared/contracts/learning'

const position: StablePosition = { entry_id: 'sentence-2', offset: 14 }
const vocabulary: SceneEntry = {
  entry_id: 'word-1',
  entry_type: 'VOCABULARY',
  source_locator: 'sentence-2',
  text: 'together'
}
const phrase: SceneEntry = {
  entry_id: 'phrase-1',
  entry_type: 'PHRASE',
  source_locator: 'sentence-2',
  text: 'put together'
}

describe('sheet controller', () => {
  it('多个命中项优先展示语块', () => {
    expect(chooseSheetEntry([vocabulary, phrase])).toEqual(phrase)
  })

  it('关闭弹层返回打开前的稳定阅读位置', () => {
    const sheet = openSheet(vocabulary, position)

    expect(sheet.close()).toEqual(position)
    expect(sheet.snapshot.open).toBe(false)
  })
})
