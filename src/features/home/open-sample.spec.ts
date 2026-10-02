import { describe, expect, it } from 'vitest'

import type { SceneOpenResponse } from '@/shared/contracts/learning'

import { resolveOpenSample } from './open-sample'
/** 构造授权响应，access 为服务端判定，text 为当前发布正文 */
const response = (access: SceneOpenResponse['access'], text: string): SceneOpenResponse => ({
  access,
  activated_at: null,
  authorization_pending: false,
  earliest_expires_at: null,
  sources: [],
  scene: {
    access: access ?? 'PREVIEW',
    scene_id: 'dynamic',
    chinese_title: '后台场景',
    title: 'Server Scene',
    series: '后台系列',
    tags: [],
    entries: [{ entry_id: 's1', entry_type: 'DIALOGUE', source_locator: 's1', text }]
  }
})
describe('首次进入动态试学句', () => {
  it('使用当前开放场景授权正文，不写死咖啡示例', () => {
    expect(resolveOpenSample(response('OPEN', 'A server sentence.'))).toBe('A server sentence.')
  })
  it('预览和待确认权限均不返回试学正文', () => {
    expect(resolveOpenSample(response('PREVIEW', 'Secret'))).toBeNull()
    expect(
      resolveOpenSample({ ...response('OPEN', 'Secret'), authorization_pending: true })
    ).toBeNull()
  })
})
