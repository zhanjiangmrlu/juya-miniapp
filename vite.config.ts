import { fileURLToPath, URL } from 'node:url'

import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig, loadEnv } from 'vite'

import { excludeDemoMedia } from './build/demo-media'
import { isolatedUmengSdk } from './build/umeng-sdk'
import { createDevApiProxy } from './src/services/api-config'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      uni(),
      isolatedUmengSdk(),
      excludeDemoMedia((process.env.VITE_USE_MOCK_API ?? environment.VITE_USE_MOCK_API) === 'true')
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: createDevApiProxy(environment.VITE_API_BASE_URL)
    }
  }
})
