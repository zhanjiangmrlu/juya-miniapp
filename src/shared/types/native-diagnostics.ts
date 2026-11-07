export type NativeDiagnosticOperation =
  | 'create'
  | 'toggle'
  | 'set-rate'
  | 'native-play'
  | 'native-pause'
  | 'native-stop'
  | 'refresh'
  | 'pause'
  | 'suspend'
  | 'start'
  | 'notify'

export interface NativeDiagnosticFields {
  port?: number
  controller?: number
  discardedStops?: number
  pendingRate?: number | null
  stagedRate?: number | null
  active?: boolean
  alive?: boolean
  running?: boolean
  guardPaused?: boolean
  fullIntent?: boolean
  fullStarting?: boolean
  ratePausing?: boolean
  rateRebinding?: boolean
  operation?: NativeDiagnosticOperation
  phase?: 'before' | 'after'
  branch?:
    | 'inactive'
    | 'native-paused'
    | 'native-playing'
    | 'start-ack'
    | 'duplicate-play'
    | 'held-external'
    | 'command-pause'
    | 'discard-stop'
    | 'forward'
  audioStatus?: 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

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
