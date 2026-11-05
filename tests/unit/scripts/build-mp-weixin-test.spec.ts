import path from 'node:path'

import { expect, it } from 'vitest'

it('publishes only test assets after successful compilation', async () => {
  const { buildTest } = await import(path.resolve('scripts/build-mp-weixin-test.mjs'))
  const events: string[] = []
  await buildTest({
    root: '/fixture',
    build: () => {
      events.push('build')
      return '/fixture/dist/asset-manifest.json'
    },
    publish: ({ environment, manifestFile }: { environment: string; manifestFile: string }) => {
      expect(manifestFile).toBe('/fixture/dist/asset-manifest.json')
      events.push(environment)
    }
  })
  expect(events).toEqual(['build', 'test'])
})
it('never publishes after a failed build and propagates asset publication failures', async () => {
  const { buildTest } = await import(path.resolve('scripts/build-mp-weixin-test.mjs'))
  let published = false
  await expect(
    buildTest({
      root: '/fixture',
      build: () => {
        throw new Error('compile failed')
      },
      publish: () => {
        published = true
      }
    })
  ).rejects.toThrow('compile failed')
  expect(published).toBe(false)
  await expect(
    buildTest({
      root: '/fixture',
      build: () => '/fixture/dist/asset-manifest.json',
      publish: () => {
        throw new Error('assets failed')
      }
    })
  ).rejects.toThrow('assets failed')
})

it('blocks publication if compilation does not return its resource manifest', async () => {
  const { buildTest } = await import(path.resolve('scripts/build-mp-weixin-test.mjs'))
  let published = false
  await expect(
    buildTest({
      root: '/fixture',
      build: () => undefined,
      publish: () => {
        published = true
      }
    })
  ).rejects.toThrow(/未返回资源清单/)
  expect(published).toBe(false)
})
