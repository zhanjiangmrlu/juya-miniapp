/** 应用启动结果状态 */
export const BootstrapStatus = {
  READY: 'ready',
  NETWORK_ERROR: 'network-error'
} as const

export type BootstrapStatus = (typeof BootstrapStatus)[keyof typeof BootstrapStatus] & string
