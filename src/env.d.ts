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
