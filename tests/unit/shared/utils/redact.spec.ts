import { describe, expect, it, vi } from 'vitest'

import { createSafeLogger, redactSensitive } from '@/shared/utils/redact'

describe('redactSensitive', () => {
  it('微信号不会进入 logger 参数', () => {
    const sink = { info: vi.fn() }
    const logger = createSafeLogger(sink)

    logger.info('保存联系方式', { kind: 'wechat_id', value: 'secret_wechat_123' })

    expect(JSON.stringify(sink.info.mock.calls)).not.toContain('secret_wechat_123')
    expect(sink.info).toHaveBeenCalledWith('保存联系方式', {
      kind: 'wechat_id',
      value: '[已脱敏]'
    })
  })

  it('直接脱敏敏感值时不保留首尾字符', () => {
    expect(redactSensitive('secret_wechat_123', 'wechat_id')).toBe('[已脱敏]')
  })
})
