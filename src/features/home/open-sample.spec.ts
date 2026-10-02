import { describe, expect, it } from 'vitest'

import type { SceneSummary } from '@/shared/contracts/learning'

import { resolveOpenSample } from './open-sample'
/** 构造只读目录摘要，access 为访问权限，text 为后台安全试学句 */
const summary = (access: SceneSummary['access'], text?: string) => ({
  access,
  scene_id: 'dynamic',
  chinese_title: '后台场景',
  title: 'Server Scene',
  series: '后台系列',
  tags: [],
  trial_sentence: text
})

describe('首次进入动态试学句', () => {
  it('使用只读OPEN摘要，不写死咖啡示例', () => {
    expect(
      resolveOpenSample({
        authorization_pending: false,
        items: [summary('OPEN', 'A server sentence.')]
      })
    ).toEqual({ text: 'A server sentence.', sceneTitle: '后台场景' })
  })
  it('预览和待确认权限均不返回试学正文', () => {
    expect(
      resolveOpenSample({ authorization_pending: false, items: [summary('PREVIEW', 'Secret')] })
    ).toBeNull()
    expect(
      resolveOpenSample({ authorization_pending: true, items: [summary('OPEN', 'Secret')] })
    ).toBeNull()
  })
  it('未提供安全试学句时使用无正文兜底', () => {
    expect(resolveOpenSample({ authorization_pending: false, items: [summary('OPEN')] })).toBeNull()
  })
})
