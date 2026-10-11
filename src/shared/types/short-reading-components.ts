import type {
  ShortReadingDetail,
  ShortReadingPosition,
  ShortReadingSummary
} from '@/shared/contracts/short-reading'
import type { AudioStatus } from '@/shared/enums/audio'

export interface ShortReadingPageViewProps {
  reading: ShortReadingDetail
  translationVisible: boolean
  categorySelected: boolean
  levelSelected: boolean
  completing: boolean
  audioStatus?: AudioStatus
  errorMessage?: string
  position?: ShortReadingPosition
  initialPosition?: ShortReadingPosition
  sourceParagraphId?: string
}

export interface ShortReadingPreviewProps {
  summary: ShortReadingSummary
}

export interface ShortReadingLayoutProps {
  title: string
}

export interface ShortReadingGeometry {
  top?: number
  bottom?: number
  height?: number
}
