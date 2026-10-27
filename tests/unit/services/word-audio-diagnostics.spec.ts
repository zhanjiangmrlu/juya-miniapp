import { afterEach, expect, it, vi } from 'vitest'

import {
  clearWordAudioDiagnostics,
  readWordAudioDiagnostics,
  recordWordAudio
} from '@/services/word-audio-diagnostics'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  clearWordAudioDiagnostics()
})

it('keeps bounded test-only timing and codes without recording raw error text or signed URLs', () => {
  vi.stubEnv('MODE', 'test')
  vi.spyOn(console, 'info').mockImplementation(() => {})
  for (let n = 0; n < 110; n++)
    recordWordAudio('native', Date.now() - 5, 'error', {
      errCode: 10002,
      errMsg: 'https://api/private/secret-token?user=123'
    })
  const entries = readWordAudioDiagnostics()
  expect(entries).toHaveLength(100)
  expect(entries.at(-1)).toMatchObject({ stage: 'native', outcome: 'error', code: '10002' })
  expect(JSON.stringify(entries)).not.toMatch(/secret|https|user|errMsg/)
  vi.stubEnv('MODE', 'production')
  clearWordAudioDiagnostics()
  recordWordAudio('native', Date.now(), 'error', { errCode: 10002 })
  expect(readWordAudioDiagnostics()).toEqual([])
})
