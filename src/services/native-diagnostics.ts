import type { NativeDiagnosticFields } from '@/shared/types/native-diagnostics'

let lastTime = 0
/** 优先使用单调计时，缺少性能时钟时防止系统时间回拨影响采样 */
export const nativeDiagnosticNow = () => {
  const value =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now()
  lastTime = Math.max(lastTime, value)
  return lastTime
}

export const nativeDiagnosticsEnabled = import.meta.env.VITE_NATIVE_DIAGNOSTICS === 'true'
const started = nativeDiagnosticsEnabled ? nativeDiagnosticNow() : 0,
  probes = new Set<string>()
let sequence = 0,
  timer: ReturnType<typeof setTimeout> | undefined
const queue: Record<string, unknown>[] = []
const instances = { port: new WeakMap<object, number>(), controller: new WeakMap<object, number>() }
const instanceSequence = { port: 0, controller: 0 }
/** 为本次进程的诊断对象建立自增序号，不包含任何内容或账号身份
 * @param kind 音轨或控制器边界
 * @param value 只在内存中关联的对象
 */
export const nativeDiagnosticInstance = (kind: 'port' | 'controller', value: object) => {
  const existing = instances[kind].get(value)
  if (existing) return existing
  const id = ++instanceSequence[kind]
  instances[kind].set(value, id)
  return id
}
const events = new Set([
  'port-state',
  'controller-state',
  'native-play',
  'native-pause',
  'native-stop',
  'native-ended',
  'native-time',
  'native-error',
  'port-play',
  'port-pause',
  'rate-write',
  'rate-stage',
  'rate-read',
  'resume-start',
  'resume-end',
  'image-load',
  'image-error',
  'image-info',
  'image-download'
])
const numbers = [
  'port',
  'controller',
  'discardedStops',
  'pendingRate',
  'stagedRate',
  'delta',
  'elapsed',
  'rate',
  'previous',
  'requested',
  'position',
  'revision',
  'errCode',
  'status',
  'width',
  'height'
]
const booleans = [
  'paused',
  'bound',
  'starting',
  'holding',
  'pausing',
  'local',
  'ok',
  'active',
  'alive',
  'running',
  'guardPaused',
  'fullIntent',
  'fullStarting',
  'ratePausing',
  'rateRebinding'
]
const labels = {
  operation: [
    'create',
    'toggle',
    'set-rate',
    'native-play',
    'native-pause',
    'native-stop',
    'refresh',
    'pause',
    'suspend',
    'start',
    'notify'
  ],
  phase: ['before', 'after'],
  branch: [
    'inactive',
    'native-paused',
    'native-playing',
    'start-ack',
    'duplicate-play',
    'held-external',
    'command-pause',
    'discard-stop',
    'forward'
  ],
  audioStatus: ['idle', 'loading', 'playing', 'paused', 'ended', 'error']
}
const errorWords = [
  'image',
  'download',
  'load',
  'fail',
  'network',
  'domain',
  'permission',
  'denied',
  'timeout',
  'decode',
  'format',
  'unsupported',
  'http',
  'https',
  'ssl',
  'certificate',
  'not found',
  'invalid',
  'audio',
  'system'
]
/** 批量上报当前临时诊断事件，不经过业务请求层且失败不重试 */
const flush = () => {
  timer = undefined
  if (!queue.length) return
  const data = queue.splice(0, 30)
  uni.request({
    url: import.meta.env.VITE_NATIVE_DIAGNOSTICS_ENDPOINT,
    method: 'POST',
    data,
    timeout: 3000
  })
  if (queue.length) timer = setTimeout(flush, 500)
}
/** 仅保留原生错误的有限已知词和数字码，绝不透传原始错误文本
 * @param reason 平台回调的原始错误，仅在本函数内部读取
 */
export const nativeErrorFields = (reason: unknown): NativeDiagnosticFields => {
  const value = reason as { errMsg?: string; errCode?: number; errno?: number } | undefined,
    message = String(value?.errMsg || '')
      .toLowerCase()
      .replace(/https?:\/\/\S+|(?:wxfile|file):\/\/\S+|\/\S+/g, '')
  return {
    error: errorWords.filter((word) => message.includes(word)).join(','),
    errCode: value?.errCode ?? value?.errno
  }
}
/** 仅临时构建记录白名单字段，最多三百条事件、每批三十条，无地址和业务身份
 * @param event 固定诊断事件名称
 * @param fields 当前边界的数字、布尔值和有限枚举
 */
export const recordNativeDiagnostic = (event: string, fields: NativeDiagnosticFields = {}) => {
  if (
    !nativeDiagnosticsEnabled ||
    !import.meta.env.VITE_NATIVE_DIAGNOSTICS_ENDPOINT ||
    sequence >= 300 ||
    !events.has(event)
  )
    return
  const safe: Record<string, unknown> = {
      seq: ++sequence,
      ms: nativeDiagnosticNow() - started,
      event
    },
    values = fields as Record<string, unknown>
  for (const key of numbers)
    if (typeof values[key] === 'number' && Number.isFinite(values[key])) safe[key] = values[key]
  for (const key of booleans) if (typeof values[key] === 'boolean') safe[key] = values[key]
  for (const key of ['pendingRate', 'stagedRate']) if (values[key] === null) safe[key] = null
  for (const [key, allowed] of Object.entries(labels))
    if (typeof values[key] === 'string' && allowed.includes(values[key] as string))
      safe[key] = values[key]
  if (fields.surface === 'list' || fields.surface === 'detail') safe.surface = fields.surface
  if (fields.error)
    safe.error = fields.error
      .split(',')
      .filter((word) => errorWords.includes(word))
      .join(',')
  queue.push(safe)
  if (!timer) timer = setTimeout(flush, 500)
}
/** 在相同缩略图上比较远程和下载临时文件的原生解码边界，仅诊断不改变产品图片
 * @param source 本次已获授权的缩略图，仅用于本地调用不写日志
 * @param surface 当前列表或详情边界
 */
export const probeNativeImage = (source: string, surface: 'list' | 'detail') => {
  if (!nativeDiagnosticsEnabled || !source || probes.has(source) || probes.size >= 4) return
  probes.add(source)
  /** 记录原生解码结果，不记录临时路径
   * @param src 当前对照图片的内存地址
   * @param local 是否使用下载后的临时文件
   * @param complete 本地临时文件的清理回调
   */
  const inspect = (src: string, local: boolean, complete?: () => void) =>
    uni.getImageInfo({
      src,
      success: (result) =>
        recordNativeDiagnostic('image-info', {
          surface,
          local,
          ok: true,
          width: result.width,
          height: result.height
        }),
      fail: (reason) =>
        recordNativeDiagnostic('image-info', {
          surface,
          local,
          ok: false,
          ...nativeErrorFields(reason)
        }),
      complete
    })
  inspect(source, false)
  uni.downloadFile({
    url: source,
    timeout: 10000,
    success: (result) => {
      recordNativeDiagnostic('image-download', { surface, status: result.statusCode })
      if (result.statusCode === 200)
        inspect(result.tempFilePath, true, () => {
          uni.getFileSystemManager().unlink({ filePath: result.tempFilePath, fail: () => {} })
        })
    },
    fail: (reason) =>
      recordNativeDiagnostic('image-download', { surface, ok: false, ...nativeErrorFields(reason) })
  })
}
