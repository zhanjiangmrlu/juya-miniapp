/// <reference types="@dcloudio/types" />

interface ImportMetaEnv {
  readonly DEV: boolean
  readonly VITE_API_BASE_URL: string
  readonly VITE_CLIENT_VERSION: string
  readonly VITE_USE_MOCK_API: 'false' | 'true'
  readonly VITE_LOCAL_DEV_MODE?: 'false' | 'true'
  readonly VITE_ANALYTICS_ENABLED?: 'false' | 'true'
  readonly VITE_UMENG_APP_KEY?: string
}

declare module 'virtual:juya-umeng-sdk' {
  const factory: import('@/shared/types/analytics').UmengSdkFactory
  export default factory
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare module '*.svg' {
  const url: string
  export default url
}
