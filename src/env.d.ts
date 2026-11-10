/// <reference types="@dcloudio/types" />
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_REMOTE_FONTS?: string
  readonly VITE_STATIC_ASSET_BASE_URL?: string
}
interface Uni {
  readonly env: { readonly USER_DATA_PATH: string }
}
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

declare const __JUYA_ASSET_MANIFEST__: import('./shared/types/assets').AssetManifest

declare const wx: Record<string, unknown>

declare const __JUYA_ANALYTICS_CONFIG__: import('./shared/types/analytics').AnalyticsConfig
declare module 'virtual:juya-umeng-sdk' {
  const sdk: import('./shared/types/analytics').AnalyticsSDKFactory | null
  export default sdk
}
