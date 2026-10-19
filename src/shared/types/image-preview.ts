export interface ImagePreviewContext {
  cardId: string
  versionId: string
  imageId: string
  title: string
  loadSource?: () => Promise<string>
  initialSrc?: string
  onInvalid: (reason: unknown) => void
  onClose: () => void
}

export interface ImageScaleEvent {
  detail: { scale: number }
}
