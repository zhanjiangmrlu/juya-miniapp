import { afterEach, expect, it, vi } from 'vitest'

import { uploadWithUni } from './upload-service'

afterEach(() => vi.unstubAllGlobals())

it('sends OSS V4 fields and the signed MIME without legacy V1 fields', async () => {
  const uploadFile = vi.fn((options) => options.success({ statusCode: 200 }))
  vi.stubGlobal('uni', { uploadFile })
  await uploadWithUni(
    { path: '/tmp/a.png', mimeType: 'image/png', size: 2 },
    {
      access_key_id: 'test-id',
      content_type: 'image/png',
      expires_at: '2026-09-30',
      host: 'https://juya-test.oss-cn-shenzhen.aliyuncs.com',
      key: 'feedback/user/a.png',
      max_bytes: 1024,
      policy: 'test-policy',
      signature: 'test-signature',
      fields: {
        key: 'feedback/user/a.png',
        policy: 'test-policy',
        'Content-Type': 'image/png',
        'x-oss-signature-version': 'OSS4-HMAC-SHA256',
        'x-oss-signature': 'test-signature',
        'x-oss-security-token': 'test-token'
      }
    }
  )
  const data = uploadFile.mock.calls[0]?.[0].formData
  expect(data['x-oss-signature-version']).toBe('OSS4-HMAC-SHA256')
  expect(data['x-oss-security-token']).toBe('test-token')
  expect(data['Content-Type']).toBe('image/png')
  expect(data).not.toHaveProperty('OSSAccessKeyId')
  expect(data).not.toHaveProperty('signature')
})
