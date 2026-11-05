export interface AssetMetadata {
  file: string
  bytes: number
  width?: number
  height?: number
  legacy?: boolean
}
export interface PublishAsset extends AssetMetadata {
  source: string
  key: string
  sha256: string
  body: Buffer
  contentType: string
  cacheControl: string
}
export interface AssetCatalog {
  assets: PublishAsset[]
  map: Record<string, AssetMetadata>
  sources: Record<string, string>
}
export const collectAssetCatalog: (root: string) => AssetCatalog
export const writeBuildManifest: (
  root: string,
  file: string,
  catalog?: AssetCatalog
) => AssetCatalog['map']
export const assertBuildManifest: (catalog: AssetCatalog, file: string) => void
