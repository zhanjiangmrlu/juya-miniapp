export interface ImagePreviewContext {
  cardId: string
  versionId: string
  imageId: string
  title: string
  onInvalid: (reason: unknown) => void
  onClose: () => void
}
