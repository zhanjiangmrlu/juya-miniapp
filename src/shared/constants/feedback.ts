import { FeedbackCategory, FeedbackImageContentType, FeedbackStatus } from '@/shared/enums/feedback'
export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  [FeedbackStatus.IN_PROGRESS]: '处理中',
  [FeedbackStatus.NEEDS_SUPPLEMENT]: '需要补充',
  [FeedbackStatus.PENDING]: '待处理',
  [FeedbackStatus.REOPENED]: '已重开',
  [FeedbackStatus.RESOLVED]: '已处理',
  [FeedbackStatus.SUPPLEMENTED]: '用户已补充',
  [FeedbackStatus.UNRESOLVED_CLOSED]: '无法处理并关闭'
}

export const FEEDBACK_CATEGORIES = [
  { label: '内容问题', value: FeedbackCategory.CONTENT },
  { label: '发音问题', value: FeedbackCategory.PRONUNCIATION },
  { label: '显示问题', value: FeedbackCategory.DISPLAY },
  { label: '功能问题', value: FeedbackCategory.FUNCTION }
] as const

export const FEEDBACK_IMAGE_MIME_TYPES = [
  FeedbackImageContentType.JPEG,
  FeedbackImageContentType.PNG,
  FeedbackImageContentType.WEBP
] as const

export const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024

/** 未提供文件 MIME 时根据扩展名推断，GIF 仍由允许列表拒绝 */
export const FEEDBACK_IMAGE_EXTENSION_TYPES: Record<string, string> = {
  png: FeedbackImageContentType.PNG,
  webp: FeedbackImageContentType.WEBP,
  gif: 'image/gif'
}

export const FEEDBACK_TIMELINE_TITLES = {
  service: '管理员回复',
  initial: '用户提交',
  supplement: '补充说明'
}

export const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  [FeedbackCategory.CONTENT]: '内容问题',
  [FeedbackCategory.PRONUNCIATION]: '发音问题',
  [FeedbackCategory.DISPLAY]: '显示问题',
  [FeedbackCategory.FUNCTION]: '功能问题'
}
export const FEEDBACK_DESCRIPTION_MIN_LENGTH = 1
export const FEEDBACK_DESCRIPTION_MAX_LENGTH = 300
export const FEEDBACK_SCREENSHOT_LIMIT = 1
export const FEEDBACK_REOPEN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const FEEDBACK_REOPEN_LIMIT = 1

/** 固定 Python 3.13 / Unicode 15.1 的 Nd 数字范围，避免 JS Unicode 升级扩大现有政策 */
const FEEDBACK_DECIMAL_DIGIT_PATTERN =
  '[\\u{30}-\\u{39}\\u{660}-\\u{669}\\u{6f0}-\\u{6f9}\\u{7c0}-\\u{7c9}\\u{966}-\\u{96f}\\u{9e6}-\\u{9ef}\\u{a66}-\\u{a6f}\\u{ae6}-\\u{aef}' +
  '\\u{b66}-\\u{b6f}\\u{be6}-\\u{bef}\\u{c66}-\\u{c6f}\\u{ce6}-\\u{cef}\\u{d66}-\\u{d6f}\\u{de6}-\\u{def}\\u{e50}-\\u{e59}\\u{ed0}-\\u{ed9}' +
  '\\u{f20}-\\u{f29}\\u{1040}-\\u{1049}\\u{1090}-\\u{1099}\\u{17e0}-\\u{17e9}\\u{1810}-\\u{1819}\\u{1946}-\\u{194f}\\u{19d0}-\\u{19d9}\\u{1a80}-\\u{1a89}' +
  '\\u{1a90}-\\u{1a99}\\u{1b50}-\\u{1b59}\\u{1bb0}-\\u{1bb9}\\u{1c40}-\\u{1c49}\\u{1c50}-\\u{1c59}\\u{a620}-\\u{a629}\\u{a8d0}-\\u{a8d9}\\u{a900}-\\u{a909}' +
  '\\u{a9d0}-\\u{a9d9}\\u{a9f0}-\\u{a9f9}\\u{aa50}-\\u{aa59}\\u{abf0}-\\u{abf9}\\u{ff10}-\\u{ff19}\\u{104a0}-\\u{104a9}\\u{10d30}-\\u{10d39}\\u{11066}-\\u{1106f}' +
  '\\u{110f0}-\\u{110f9}\\u{11136}-\\u{1113f}\\u{111d0}-\\u{111d9}\\u{112f0}-\\u{112f9}\\u{11450}-\\u{11459}\\u{114d0}-\\u{114d9}\\u{11650}-\\u{11659}\\u{116c0}-\\u{116c9}' +
  '\\u{11730}-\\u{11739}\\u{118e0}-\\u{118e9}\\u{11950}-\\u{11959}\\u{11c50}-\\u{11c59}\\u{11d50}-\\u{11d59}\\u{11da0}-\\u{11da9}\\u{11f50}-\\u{11f59}\\u{16a60}-\\u{16a69}' +
  '\\u{16ac0}-\\u{16ac9}\\u{16b50}-\\u{16b59}\\u{1d7ce}-\\u{1d7ff}\\u{1e140}-\\u{1e149}\\u{1e2f0}-\\u{1e2f9}\\u{1e4f0}-\\u{1e4f9}\\u{1e950}-\\u{1e959}\\u{1fbf0}-\\u{1fbf9}]'

/** 与 Python Unicode 空白类一致，显式范围避免依赖客户端 Unicode 属性转义支持 */
const FEEDBACK_WHITESPACE_PATTERN =
  '\\u0009-\\u000d\\u001c-\\u0020\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000'

/**
 * 仅同步 miniapp-api feedback/content_safety.py 六条既有规则，不代替服务端文本和图片审核
 * Python 的空白包含 U+001C-001F 且不含 BOM，数字为 Unicode 十进制，点号只排除 LF
 * 忽略大小写的 a-z 还接受 İ、ı、ſ、K，显式保持相同联系方式范围
 */
export const FEEDBACK_BLOCKED_TEXT_PATTERNS = [
  /https?:\/\/|www\./iu,
  new RegExp(
    `(?:微信|加微|v信|vx|qq)[${FEEDBACK_WHITESPACE_PATTERN}:：号]*[a-z\\u0130\\u0131\\u017f\\u212a0-9_-]{4,}`,
    'iu'
  ),
  new RegExp(
    `(?:银行卡|卡号|bank[${FEEDBACK_WHITESPACE_PATTERN}]*card)[^\\n]*${FEEDBACK_DECIMAL_DIGIT_PATTERN}{12,19}`,
    'iu'
  ),
  new RegExp(`(?:身份证|证件号)[^\\n]*${FEEDBACK_DECIMAL_DIGIT_PATTERN}{15,18}[0-9x]?`, 'iu'),
  /转账|私下交易|线下交易|付款码|收款码|代付/u,
  /色情|博彩|赌博|刷单|代开发票|辱骂/u
] as const

export const FEEDBACK_CONTENT_BLOCKED_MESSAGE = '内容未通过检查，请修改后重新提交'
