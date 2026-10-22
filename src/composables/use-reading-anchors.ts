import { getCurrentInstance } from 'vue'

import type { ReadingAnchorRect, ReadingBlock } from '@/shared/types/learning'

/** 在各自uni组件作用域测量正文，兼容小程序组件隔离与H5布局 */
export const useReadingAnchors = () => {
  const instance = getCurrentInstance()
  /** 返回当前组件正文块的页面绝对坐标
   * @param scrollTop 本次测量时的真实页面滚动距离
   */
  const measureReading = (scrollTop: number): Promise<ReadingBlock[]> =>
    new Promise((resolve) => {
      if (typeof uni === 'undefined' || typeof uni.createSelectorQuery !== 'function') {
        resolve([])
        return
      }
      let query = uni.createSelectorQuery()
      if (instance?.proxy) query = query.in(instance.proxy)
      query
        .selectAll('.reading-anchor')
        .fields({ dataset: true, rect: true, size: true }, (result) => {
          const rows = Array.isArray(result) ? (result as ReadingAnchorRect[]) : []
          resolve(
            rows.flatMap((row) => {
              const anchor = row.dataset?.readingAnchor || row.dataset?.readinganchor
              return anchor && typeof row.top === 'number' && typeof row.height === 'number'
                ? [{ anchor, top: row.top + scrollTop, height: row.height }]
                : []
            })
          )
        })
        .exec()
    })
  return { measureReading }
}
