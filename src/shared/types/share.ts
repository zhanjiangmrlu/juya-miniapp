import type { components } from '@/shared/contracts/generated/mini-api'
import type { ShareTarget } from '@/shared/enums/share'
import type { SendRequest } from '@/shared/types/runtime'
import type { Ref } from 'vue'

export type SafeShareTarget =
  { target: typeof ShareTarget.LEARNING } | { target: typeof ShareTarget.SCENE; id: string }
export type PublicShareImage = components['schemas']['PublicShareImage']
export type PublicSceneShare = components['schemas']['PublicSceneShare']
export interface FriendsShare {
  title: string
  path: string
  imageUrl: string
}
export interface TimelineShare {
  title: string
  query: string
  imageUrl: string
}
export interface ShareChannelState {
  ready: boolean
  busy: boolean
  error: string
}
export interface SharePorts {
  send: SendRequest
  resource: (path: string) => string
  prepareImage?: (path: string, width: number, height: number) => Promise<string>
}
export interface RuntimeOptions {
  apiCategory?: unknown
  scene?: unknown
}
export interface RuntimeModePorts {
  category: () => string | undefined
}
export interface NativeCategoryAPI {
  getApiCategory?: () => string
  onApiCategoryChange?: (callback: (result: RuntimeOptions) => void) => void
}
export interface NativeShareMenuAPI {
  showShareMenu?: (options: { withShareTicket: boolean; menus: string[] }) => unknown
  hideShareMenu?: (options: { menus: string[] }) => unknown
}
export interface ShareMenuChannels {
  friends: boolean
  timeline: boolean
}
export interface SharePresentation {
  summary: Ref<PublicSceneShare | null>
  ready: Ref<boolean>
  busy: Ref<boolean>
  error: Ref<string>
}
