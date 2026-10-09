import type { AppMetadata } from '@/shared/types/app'

export const APP_META = {
  description: '从真实场景开始，自然开口说英语',
  name: '句芽英语'
} as const satisfies Readonly<AppMetadata>
