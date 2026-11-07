import { ref } from 'vue'

export const loginPromptTarget = ref('')
/** 个人动作只提出登录选择，不排队或自动执行原动作
 * @param target 登录成功后只读恢复的安全来源页面
 */
export const promptLogin = (target: string) => {
  loginPromptTarget.value = target
}
/** 取消提示保留当前游客页面 */
export const dismissLoginPrompt = () => {
  loginPromptTarget.value = ''
}
