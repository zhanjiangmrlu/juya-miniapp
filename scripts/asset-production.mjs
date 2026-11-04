import { readFileSync } from 'node:fs'

import { Client } from 'ssh2'

/** 构造固定生产资源发布程序，不从配置接收命令或目标路径 */
export const productionProgram = () =>
  readFileSync(new URL('./asset-production.py', import.meta.url), 'utf8')
/** 同步生产静态镜像，assets 为已校验资源，config 为私有SSH配置 */
export const mirrorProductionAssets = async ({ assets, config }) => {
  if (
    !config?.host ||
    !config.username ||
    !Array.isArray(config.hostKeys) ||
    !config.hostKeys.length ||
    config.hostKeys.some((key) => !/^[a-f0-9]{64}$/.test(key))
  )
    throw new Error('缺少生产镜像SSH配置或已信任主机指纹')
  let privateKey
  try {
    privateKey = config.privateKeyFile ? readFileSync(config.privateKeyFile) : undefined
  } catch {
    throw new Error('无法读取生产SSH私钥文件')
  }
  if (!privateKey && !config.password) throw new Error('缺少生产SSH认证配置')
  const payload = JSON.stringify(
    assets.map((asset) => ({
      file: asset.file,
      sha256: asset.sha256,
      contentType: asset.contentType,
      data: asset.body.toString('base64')
    }))
  )
  if (Buffer.byteLength(payload) > 32 * 1024 * 1024)
    throw new Error('生产静态资源同步批次超过32MiB')
  const program = productionProgram()
  // 程序来自版本化文件，资源只经过stdin JSON传递，不拼入shell命令
  const command = "python3 -c '" + program.replaceAll("'", "'\\''") + "'"
  await new Promise((resolve, reject) => {
    const client = new Client()
    let settled = false
    /** 结束本次连接，error 为脱敏后的同步错误 */
    const finish = (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      client.end()
      if (error) reject(error)
      else resolve()
    }
    const timer = setTimeout(() => finish(new Error('生产静态镜像同步超时')), 120000)
    client.on('error', () => finish(new Error('生产静态镜像SSH连接失败')))
    client.on('ready', () =>
      client.exec(command, (error, channel) => {
        if (error) {
          finish(new Error('生产静态镜像命令启动失败'))
          return
        }
        let output = ''
        channel.on('data', (data) => {
          if (output.length < 65536) output += data.toString()
        })
        channel.stderr.resume()
        channel.on('error', () => finish(new Error('生产静态镜像传输失败')))
        channel.on('close', (code) => {
          try {
            if (code !== 0 || JSON.parse(output).ok !== true) throw new Error('remote failed')
            finish()
          } catch {
            finish(new Error('生产静态镜像校验或Nginx配置失败，已尝试回滚配置'))
          }
        })
        channel.end(payload)
      })
    )
    try {
      client.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        privateKey,
        hostHash: 'sha256',
        hostVerifier: (key) => config.hostKeys.includes(key),
        readyTimeout: 20000
      })
    } catch {
      finish(new Error('生产静态镜像SSH配置无效'))
    }
  })
}
