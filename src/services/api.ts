import { createOperationService } from './operation-service'
import { operationKey, sendRequest, storage, wechatLogin } from './platform'
import { createSessionService } from './session-service'
const expiryListeners = new Set<() => void>()
export const session = createSessionService({
  storage,
  send: sendRequest,
  wechatLogin,
  key: operationKey,
  onExpired: () => {
    for (const callback of expiryListeners) callback()
  }
})
export const operations = createOperationService({ session, storage, key: operationKey })
/** 监听已认证会话失效，不在后台重新发起微信登录
 * @param callback 敏感界面清理函数
 */
export const onSessionExpired = (callback: () => void) => {
  expiryListeners.add(callback)
  return () => expiryListeners.delete(callback)
}
