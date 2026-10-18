import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('../', import.meta.url))
const output = path.join(root, 'dist/local-share/mp-weixin')
const cli = path.join(
  path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
  'bin/uni.js'
)
const env = {
  ...process.env,
  UNI_OUTPUT_DIR: output,
  VITE_API_BASE_URL: 'https://dev-api.juyayingyu.com'
}
for (const args of [
  [cli, 'build', '-p', 'mp-weixin', '--mode', 'local-share'],
  [path.join(root, 'scripts/verify-mp-page-meta.mjs')]
]) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' })
  if (result.error || result.status !== 0) process.exit(result.status || 1)
}
console.info(`Local sharing build: ${output}`)
