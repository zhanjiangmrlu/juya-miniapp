export interface ImagePreviewContext {
  cardId: string
  versionId: string
  imageId: string
  title: string
  loadSource?: (renew?: boolean) => Promise<string>
  initialSrc?: string
  onInvalid: (reason: unknown) => void
  onClose: () => void
}

export interface ImageScaleEvent {
  detail: { scale: number }
}
