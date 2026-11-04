export interface AssetMetadata {
  file: string
  bytes: number
  width?: number
  height?: number
  legacy?: boolean
}
export type AssetManifest = Readonly<Record<string, AssetMetadata>>
