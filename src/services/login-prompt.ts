import { ref } from 'vue'

import { analytics } from '@/services/analytics'
import { AnalyticsEvent } from '@/shared/enums/analytics'

export const loginPromptTarget = ref('')
/** 个人动作只提出登录选择，不排队或自动执行原动作
 * @param target 登录成功后只读恢复的安全来源页面
 */
export const promptLogin = (target: string) => {
  if (!loginPromptTarget.value) analytics.track(AnalyticsEvent.LOGIN_PROMPT)
  loginPromptTarget.value = target
}
/** 取消提示保留当前游客页面 */
export const dismissLoginPrompt = () => {
  loginPromptTarget.value = ''
}
