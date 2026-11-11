import { ref } from 'vue'

import { analytics } from '@/services/analytics'
import { AnalyticsEvent } from '@/shared/enums/analytics'
import { ConsentAction } from '@/shared/enums/privacy'

export const loginPromptTarget = ref('')
export const loginPromptAction = ref<ConsentAction>(ConsentAction.ACCOUNT)
/** 个人动作只提出登录选择，不排队或自动执行原动作
 * @param target 登录成功后只读恢复的安全来源页面
 * @param action 用户刚才主动触发的账号操作
 */
export const promptLogin = (target: string, action: ConsentAction = ConsentAction.ACCOUNT) => {
  if (loginPromptTarget.value) return
  analytics.track(AnalyticsEvent.LOGIN_PROMPT)
  loginPromptAction.value = action
  loginPromptTarget.value = target
}
/** 取消提示保留当前游客页面 */
export const dismissLoginPrompt = () => {
  loginPromptTarget.value = ''
  loginPromptAction.value = ConsentAction.ACCOUNT
}
