/** 独立短文位置更新的防抖时长 */
export const SHORT_READING_PROGRESS_DELAY_MS = 800

/** 已知的当前访问失效状态，拒绝后丢弃短文待提交写入 */
export const SHORT_READING_DENIED_STATUSES = [401, 403, 404, 409, 410, 423]

/** 服务端安全白名单之外不接收预览正文、译文、音频和精确位置 */
export const SHORT_READING_LIST_TITLE = '把英语读进生活'
export const SHORT_READING_LIST_INTRO = '生活小事，也可以成为阅读素材。'
