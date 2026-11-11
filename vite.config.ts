import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig, loadEnv } from 'vite'

import { localDesignAssetsPlugin } from './build/local-design-assets'
import { localShareH5Plugin } from './build/local-share-h5'
import { resolveAnalyticsConfig } from './src/services/analytics-config'
const uniPlugin = (uni as typeof uni & { default?: typeof uni }).default || uni
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const localShareH5 = mode === 'local-share-h5'
  const analytics = resolveAnalyticsConfig(mode, process.env.UNI_PLATFORM || '', env)
  const inputRoot = process.env.UNI_INPUT_DIR || fileURLToPath(new URL('./src', import.meta.url))
  const { initPreContext } = createRequire(import.meta.url)(
    '@dcloudio/uni-cli-shared'
  ) as typeof import('@dcloudio/uni-cli-shared')
  initPreContext((process.env.UNI_PLATFORM || 'h5') as Parameters<typeof initPreContext>[0], {
    JUYA_ANALYTICS: analytics.enabled
  })
  return {
    define: {
      __JUYA_ANALYTICS_CONFIG__: JSON.stringify(analytics),
      ...(command === 'build'
        ? {
            'import.meta.env.VITE_NATIVE_DIAGNOSTICS': JSON.stringify(
              env.VITE_NATIVE_DIAGNOSTICS === 'true' ? 'true' : ''
            ),
            'import.meta.env.VITE_NATIVE_DIAGNOSTICS_ENDPOINT': JSON.stringify(
              env.VITE_NATIVE_DIAGNOSTICS_ENDPOINT || ''
            )
          }
        : {})
    },
    plugins: [
      {
        name: 'juya-analytics-environment',
        enforce: 'pre',
        /** uni 编译器会将别名预解析为绝对路径，因此在实际加载边界替换关闭实现
         * @param id Vite 已解析的源码模块路径
         */
        resolveId: (id) =>
          id === 'virtual:juya-umeng-sdk' ? '\0virtual:juya-umeng-sdk' : undefined,
        /** 各构建固定返回空SDK工厂，旧开关不能装载真实SDK源码
         * @param id 当前待加载的模块路径
         */
        load: (id) => {
          if (id === '\0virtual:juya-umeng-sdk') {
            return 'export default null'
          }
          if (
            !analytics.enabled &&
            id.split('?')[0] === path.join(inputRoot, 'services/analytics.ts')
          )
            return readFileSync(
              fileURLToPath(new URL('./src/services/analytics-disabled.ts', import.meta.url)),
              'utf8'
            )
          if (
            !analytics.enabled &&
            id.split('?')[0] === path.join(inputRoot, 'services/analytics-operations.ts')
          )
            return 'export const operationAnalytics = () => null'
          return undefined
        }
      },
      localDesignAssetsPlugin(),
      uniPlugin(),
      ...(localShareH5 ? [localShareH5Plugin()] : [])
    ],
    cacheDir: localShareH5 ? 'node_modules/.vite-local-share-h5' : undefined,
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `$use-remote-fonts: ${env.VITE_REMOTE_FONTS === 'true'};`
        }
      }
    },
    server: {
      host: '127.0.0.1',
      port: localShareH5 ? 4174 : 5174,
      strictPort: localShareH5,
      proxy: { '/api': { target: env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:8002' } }
    }
  }
})
