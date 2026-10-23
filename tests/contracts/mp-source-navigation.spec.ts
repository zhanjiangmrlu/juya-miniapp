import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'

import { afterAll, beforeAll, expect, it } from 'vitest'
import { readonly, ref } from 'vue'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = mkdtempSync(path.join(tmpdir(), 'juya-mp-navigation-'))
const require = createRequire(import.meta.url)

beforeAll(() => {
  const cli = path.join(
    path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json')),
    'bin/uni.js'
  )
  const result = spawnSync(
    process.execPath,
    [cli, 'build', '-p', 'mp-weixin', '--mode', 'local-share'],
    {
      cwd: root,
      env: { ...process.env, UNI_OUTPUT_DIR: output },
      encoding: 'utf8'
    }
  )
  expect(result.status, result.stdout + result.stderr).toBe(0)
}, 60000)

afterAll(() => rmSync(output, { recursive: true, force: true }))

/** 执行真实微信CommonJS产物，只替换原生界面及业务网络边界 */
const nativeRuntime = () => {
  const opened: string[] = [],
    toasts: string[] = [],
    requests: { path: string; options: unknown }[] = [],
    stored = new Map<string, unknown>(),
    modules = new Map<string, { exports: Record<string, unknown> }>()
  const native = {
    navigateTo: ({ url, success }: { url: string; success: () => void }) => {
      opened.push(url)
      success()
    },
    showToast: ({ title }: { title: string }) => toasts.push(title)
  }
  /** 加载实际编译模块，缓存语义与小程序require一致
   * @param filename 编译目录内模块的绝对路径
   */
  const load = (filename: string): Record<string, unknown> => {
    const cached = modules.get(filename)
    if (cached) return cached.exports
    const module = { exports: {} as Record<string, unknown> }
    modules.set(filename, module)
    if (filename === path.join(output, 'common/vendor.js')) {
      module.exports = { index: native, readonly, ref }
    } else if (filename === path.join(output, 'services/api.js')) {
      const session = {
        userId: () => 'receiver',
        request: async (requestPath: string, options: { body: { source: string } }) => {
          requests.push({ path: requestPath, options })
          if (requestPath !== '/api/mini/v1/learning-queues') throw new Error('Unexpected request')
          return { id: 'native-queue', source: options.body.source, total: 3 }
        }
      }
      const createOperations = load(path.join(output, 'services/operation-service.js'))
        .createOperationService as (ports: unknown) => unknown
      module.exports = {
        session,
        operations: createOperations({
          session,
          key: () => 'native-operation',
          storage: {
            get: (key: string) => stored.get(key),
            set: (key: string, value: unknown) => stored.set(key, value),
            remove: (key: string) => stored.delete(key)
          }
        }),
        onSessionExpired: () => () => undefined
      }
    } else {
      runInNewContext(
        readFileSync(filename, 'utf8'),
        {
          exports: module.exports,
          require: (specifier: string) => load(path.resolve(path.dirname(filename), specifier)),
          Error,
          console
        },
        { filename }
      )
    }
    return module.exports
  }
  return { load, opened, toasts, requests }
}

it.each([
  ['learning', undefined],
  ['favorites', undefined],
  ['records', undefined],
  ['day', '2026-10-23']
])('opens a card from %s using an executable native source queue', async (source, day) => {
  const runtime = nativeRuntime()
  const openScene = runtime.load(path.join(output, 'services/navigation.js')).openScene as (
    id: string,
    source?: string,
    day?: string
  ) => Promise<void>
  await openScene('card-1', source, day)
  expect(runtime.opened).toEqual(['/sub-packages/scenes/detail?id=card-1&queue=native-queue'])
  expect(runtime.toasts).toEqual([])
  expect(runtime.requests).toEqual([
    {
      path: '/api/mini/v1/learning-queues',
      options: {
        method: 'POST',
        key: 'native-operation',
        body: { source, card_id: 'card-1', ...(day ? { day } : {}) }
      }
    }
  ])
})
