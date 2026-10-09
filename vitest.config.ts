import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

import { isolatedUmengSdk } from './build/umeng-sdk'

export default defineConfig({
  // Vitest 3 bundles Vite 7 types while uni-app is pinned to Vite 5.
  // The Vue plugin supports both versions; only their duplicated type identities differ.
  plugins: [vue() as never, isolatedUmengSdk() as never],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts']
  }
})
