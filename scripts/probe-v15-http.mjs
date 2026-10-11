import { error, log } from 'node:console'
import fs from 'node:fs/promises'
import process from 'node:process'
import { URL } from 'node:url'

import { probeV15Http } from './probe-v15-http-core.mjs'

const baseValue = process.env.JUYA_QA_BASE_URL
if (!baseValue) {
  error('未执行：请设置协调对话确认的 JUYA_QA_BASE_URL，不使用默认服务地址')
  process.exit(2)
}
let base
try {
  base = new URL(baseValue)
} catch {
  error('未执行：BASE_URL无效')
  process.exit(2)
}
if (
  !['http:', 'https:'].includes(base.protocol) ||
  base.username ||
  base.password ||
  base.search ||
  base.hash
) {
  error('未执行：BASE_URL必须是无凭证、无查询参数的HTTP服务地址')
  process.exit(2)
}
const report = await probeV15Http(base.href, process.env.JUYA_QA_ACCESS_TOKEN)
await fs.mkdir('.v15-artifacts.local', { recursive: true })
await fs.writeFile(
  '.v15-artifacts.local/http-contract-probe.json',
  JSON.stringify(report, null, 2) + '\n'
)
log(JSON.stringify(report, null, 2))
process.exitCode = report.results.some((entry) => entry.result !== 'HTTP_OK') ? 1 : 0
