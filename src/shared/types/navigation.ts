import type { ROUTES } from '@/shared/constants/navigation'
import type { NavigationType } from '@/shared/enums/navigation'

export interface CapsuleRect {
  top: number
  bottom: number
  left: number
  right: number
  width: number
  height: number
}

export interface LegacyRouteInput {
  pageId: string
  sceneId?: string
  sourceLocator?: string
}

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export interface NavigationIntent {
  type: NavigationType
  url: string
}
