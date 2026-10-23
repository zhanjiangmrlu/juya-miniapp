import { Routes } from '@/shared/constants/navigation'

import type { QueueSource } from '@/shared/enums/learning'

import { runtimeMode } from './runtime-mode'
import { parseShareTarget, shareTargetURL } from './share-service'
import { openSourceScene } from './source-queue'

/** 将登录返回目标限制在本期页面，资料编辑失效后回到只读资料
 * @param target 本站页面路径
 */
export const safeTarget = (target: string) => {
  const path = target.split('?')[0]
  if (path === Routes.CONTACT || path === Routes.IDENTITY) return Routes.PROFILE
  if (
    !Object.values(Routes).includes(path as (typeof Routes)[keyof typeof Routes]) ||
    path === Routes.LOGIN
  )
    return Routes.LEARNING
  const query = (target.split('?')[1] || '').split('#')[0]
  if (path === Routes.SCENE || path === Routes.LEARNING) {
    const values: Record<string, string> = {}
    try {
      for (const item of query.split('&')) {
        const [key, value = ''] = item.split('=')
        if (key === 'target' || key === 'id') values[key] = decodeURIComponent(value)
      }
    } catch {
      return Routes.LEARNING
    }
    const shared = parseShareTarget(values)
    if (shared) return shareTargetURL(shared)
  }
  if (path === Routes.FEEDBACK_CREATE && query) {
    try {
      const values = ['card_id', 'version_id'].map((name) =>
        decodeURIComponent(
          query
            .split('&')
            .find((item) => item.startsWith(`${name}=`))
            ?.slice(name.length + 1) || ''
        )
      )
      return values.every((value) => /^[A-Za-z0-9-]{1,64}$/.test(value))
        ? `${path}?card_id=${encodeURIComponent(values[0]!)}&version_id=${encodeURIComponent(values[1]!)}`
        : Routes.FEEDBACK
    } catch {
      return Routes.FEEDBACK
    }
  }
  if (path === Routes.SCENE || path === Routes.FEEDBACK_DETAIL) {
    const raw =
      query
        .split('&')
        .find((item) => item.startsWith('id='))
        ?.slice(3) || ''
    let id = ''
    try {
      id = decodeURIComponent(raw)
    } catch {
      return Routes.LEARNING
    }
    return /^[A-Za-z0-9-]{1,64}$/.test(id)
      ? `${path}?id=${encodeURIComponent(id)}`
      : Routes.LEARNING
  }
  if (path === Routes.RECORDS && query.split('&').includes('tab=checkins'))
    return `${path}?tab=checkins`
  return path!
}
/** 主动登录完成后恢复安全目标
 * @param target 页面返回路径
 */
export const openTarget = (target: string) => {
  const safe = safeTarget(target)
  if (safe.split('?')[0] === Routes.LEARNING || safe === Routes.FAVORITES)
    uni.switchTab({ url: safe.split('?')[0]! })
  else uni.reLaunch({ url: safe })
}
let loginNavigationPending = false

/** 只有确认会话失效时返回主动登录入口
 * @param target 重新登录后的安全页面
 */
export const openLogin = (target: string) => {
  if (runtimeMode.update()) return
  const pages = getCurrentPages()
  if (loginNavigationPending || pages[pages.length - 1]?.route === Routes.LOGIN.slice(1)) return
  loginNavigationPending = true
  uni.reLaunch({
    url: `${Routes.LOGIN}?return=${encodeURIComponent(safeTarget(target))}`,
    complete: () => {
      loginNavigationPending = false
    }
  })
}
/** 二级页面返回其原生页面栈，无来源则回到指定入口
 * @param fallback 没有来源栈时的安全入口
 */
export const backTo = (fallback: string = Routes.LEARNING) => {
  if (getCurrentPages().length > 1) uni.navigateBack()
  else openTarget(fallback)
}
/** 打开当前发布卡或本人历史摘要
 * @param id 稳定卡片编号
 * @param source 点击卡片所在的来源列表
 * @param day 打卡来源的日期
 */
export const openScene = async (id: string, source?: QueueSource, day?: string) => {
  if (!source) {
    uni.navigateTo({ url: `${Routes.SCENE}?id=${encodeURIComponent(id)}` })
    return
  }
  try {
    await openSourceScene(source, id, day)
  } catch (reason) {
    uni.showToast({
      title: reason instanceof Error ? reason.message : '来源列表暂未获取，请重试',
      icon: 'none'
    })
  }
}
