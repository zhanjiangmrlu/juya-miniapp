/// <reference types="@dcloudio/types" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_CLIENT_VERSION: string
  readonly VITE_USE_MOCK_API: 'false' | 'true'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
