import { describe, expect, it, vi } from 'vitest'

import { createSceneService } from './scene-service'

describe('发布资源接口', () => {
  it('原图和整段音频签名均限定场景修订，编码路径和查询参数', async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValue({ url: '/audio.wav', resource_id: 'audio', expires_at: '2099-01-01' }),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }
    const service = createSceneService(client)
    await service.getResource('scene/1', 'image/1', 'rev/2')
    expect(client.get).toHaveBeenLastCalledWith(
      '/api/v1/scenes/scene%2F1/resources/image%2F1/signed-url?revision_id=rev%2F2'
    )
    const signed = await service.getSignedUrl({
      scene_id: 'scene/1',
      revision_id: 'rev/2',
      target_id: 'audio',
      target_type: 'scene',
      version_id: 'v2'
    })
    expect(signed.target_id).toBe('audio')
    expect(client.post).not.toHaveBeenCalled()
    expect(client.get).toHaveBeenLastCalledWith(
      '/api/v1/scenes/scene%2F1/resources/audio/signed-url?revision_id=rev%2F2'
    )
  })
})
