export interface ReturnBarrierProps {
  show: boolean
}
export type ReturnBarrierEvents = {
  beforeleave: []
  afterleave: []
}

export interface ProfileLogoutDialogProps {
  busy: boolean
  error?: string
}

export interface ProfilePageProps {
  primary?: boolean
}
