import OSS from 'ali-oss'

/** 创建固定环境的OSS存储端口，bucket 为受控桶名，credentials 为私有访问凭据 */
export const createOssStore = ({ bucket, credentials }) => {
  const client = new OSS({
    region: 'oss-cn-shenzhen',
    bucket,
    secure: true,
    accessKeyId: credentials.accessKeyId,
    accessKeySecret: credentials.accessKeySecret,
    timeout: 20000
  })
  return {
    /** 读取对象内容，key 为静态前缀内的资源路径 */
    get: async (key) => {
      try {
        return (await client.get(key)).content
      } catch (error) {
        if (error.code === 'NoSuchKey') return undefined
        throw error
      }
    },
    /** 仅创建不存在的对象，asset 包含已校验的字节和响应类型 */
    put: async (asset) => {
      await client.put(asset.key, asset.body, {
        mime: asset.contentType,
        headers: {
          'x-oss-forbid-overwrite': 'true',
          'x-oss-meta-sha256': asset.sha256,
          'Cache-Control': asset.cacheControl
        }
      })
    }
  }
}
