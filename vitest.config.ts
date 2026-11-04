import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

import { collectAssetCatalog } from './scripts/asset-manifest.mjs'
export default defineConfig({
  define: {
    __JUYA_ASSET_MANIFEST__: JSON.stringify(
      collectAssetCatalog(fileURLToPath(new URL('./', import.meta.url))).map
    )
  },
  plugins: [vue() as never],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', include: ['tests/**/*.spec.ts'] }
})
