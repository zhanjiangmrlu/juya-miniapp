/** 判断是否展示一次资料提示，eligible 为服务端资格，wechatId 为本人当前微信号，seen 为本机已实际曝光标记 */
export const shouldExposeContactPrompt = (
  eligible: boolean,
  wechatId: string | null,
  seen: boolean
) => eligible && !wechatId && !seen
