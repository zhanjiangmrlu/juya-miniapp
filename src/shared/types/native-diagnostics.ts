export interface NativeDiagnosticFields {
  delta?: number
  elapsed?: number
  rate?: number
  previous?: number
  requested?: number
  position?: number
  revision?: number
  errCode?: number
  status?: number
  width?: number
  height?: number
  paused?: boolean
  bound?: boolean
  starting?: boolean
  holding?: boolean
  pausing?: boolean
  local?: boolean
  ok?: boolean
  surface?: 'list' | 'detail'
  error?: string
}
