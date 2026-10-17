import { fileURLToPath, URL } from 'node:url'

import uni from '@dcloudio/vite-plugin-uni'
import { defineConfig, loadEnv } from 'vite'
const uniPlugin = (uni as typeof uni & { default?: typeof uni }).default || uni
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [uniPlugin()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: '127.0.0.1',
      port: 5174,
      proxy: { '/api': { target: env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:8002' } }
    }
  }
})
