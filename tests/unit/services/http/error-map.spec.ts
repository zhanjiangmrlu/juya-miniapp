import { describe, expect, it } from 'vitest'

import { mapApiError } from '@/services/http/error-map'

describe('真实BFF错误契约', () => {
  it('保留业务码、HTTP状态与安全request_id用于联调关联', () => {
    expect(
      mapApiError(422, {
        code: 'VALIDATION_ERROR',
        message: '参数无效',
        request_id: 'fixture-request',
        details: {
          errors: [{ type: 'missing', loc: ['body', 'content_version'], msg: 'Field required' }]
        }
      })
    ).toMatchObject({ status: 422, code: 'VALIDATION_ERROR', requestId: 'fixture-request' })
  })
  it('外部错误码不继承对象原型中的映射', () => {
    expect(mapApiError(503, { code: 'constructor', message: '内容暂不可用' }).message).toBe(
      '内容暂不可用'
    )
  })
  it('非标准响应保留响应头标识，标准响应优先使用正文标识', () => {
    expect(mapApiError(503, undefined, 'header-request')).toMatchObject({
      code: 'REQUEST_FAILED',
      requestId: 'header-request'
    })
    expect(
      mapApiError(
        422,
        { code: 'VALIDATION_ERROR', message: '参数无效', request_id: 'body-request' },
        'header-request'
      ).requestId
    ).toBe('body-request')
  })
})
