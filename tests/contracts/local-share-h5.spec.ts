import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { get } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { createServer } from 'vite'
import { expect, it } from 'vitest'

import { localShareH5Plugin } from '../../build/local-share-h5'

/** 用真实 HTTP Host 头检查域名隔离，避免 fetch 对 Host 的平台改写
 * @param url 本机临时开发服务器地址
 * @param host 要验证的浏览器访问域名
 */
const requestWithHost = (url: string, host: string): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    get(url, { headers: { Host: host } }, (response) => {
      let body = ''
      response.setEncoding('utf8')
      response.on('data', (chunk) => (body += chunk))
      response.on('end', () => resolve({ status: response.statusCode!, body }))
      response.on('error', reject)
    }).on('error', reject)
  })

it('serves H5 through its fixed hostname and rejects unrelated Host headers', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'juya-h5-'))
  await writeFile(path.join(root, 'index.html'), '<h1>Local H5</h1>')
  const server = await createServer({
    configFile: false,
    root,
    plugins: [localShareH5Plugin()],
    server: { host: '127.0.0.1', port: 0 }
  })
  try {
    await server.listen()
    const address = server.httpServer!.address()
    if (!address || typeof address === 'string') throw new Error('Missing test server port')
    const url = `http://127.0.0.1:${address.port}/`
    for (const host of ['dev-h5.juyayingyu.com', 'localhost', '127.0.0.1']) {
      const response = await requestWithHost(url, host)
      expect(response.status).toBe(200)
      expect(response.body).toContain('Local H5')
    }
    const rejected = await requestWithHost(url, 'untrusted.example')
    expect(rejected.status).toBe(403)
    expect(rejected.body).not.toContain('Local H5')
  } finally {
    await server.close()
    await rm(root, { recursive: true, force: true })
  }
})
