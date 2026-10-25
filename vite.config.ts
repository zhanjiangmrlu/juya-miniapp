import { fileURLToPath, URL } from 'node:url'

import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig, loadEnv } from 'vite'

import { localShareH5Plugin } from './build/local-share-h5'
const uniPlugin = (uni as typeof uni & { default?: typeof uni }).default || uni
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const localShareH5 = mode === 'local-share-h5'
  return {
    plugins: [uniPlugin(), ...(localShareH5 ? [localShareH5Plugin()] : [])],
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
