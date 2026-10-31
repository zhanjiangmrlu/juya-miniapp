import { nextTick } from 'vue'

/** 保存列表页面阅读位置并隔离换账号或销毁后的恢复请求
 * @param userId 当前私人列表所属账号
 * @param restore 列表容器的位置恢复操作，省略时恢复页面滚动
 */
export const useListPosition = (
  userId: () => string | null,
  restore: (top: number) => void = (top) => uni.pageScrollTo({ scrollTop: top, duration: 0 })
) => {
  let top = 0,
    generation = 0,
    owner = userId()
  /** 记录原生页面滚动距离
   * @param value 当前页面距顶部的像素距离
   */
  const scroll = (value: number) => {
    top = value
  }
  /** 清除上一账号位置和待恢复任务 */
  const reset = () => {
    generation++
    top = 0
    owner = userId()
  }
  /** 页面销毁后禁止迟到恢复 */
  const dispose = () => {
    generation++
  }
  /** 刷新已读范围后在 DOM 更新完成时恢复进入详情前的位置
   * @param task 当前列表的保留刷新操作
   */
  const preserve = async (task: () => Promise<void>) => {
    if (owner !== userId()) reset()
    const run = ++generation,
      accountId = userId(),
      target = top
    await task()
    await nextTick()
    if (run === generation && accountId === userId() && target > 0) restore(target)
  }
  return { scroll, reset, dispose, preserve }
}
