import { nextTick, onBeforeUnmount, ref } from 'vue'

import { useReadingAnchors } from '@/composables/use-reading-anchors'
import { operations, session } from '@/services/api'
import { readingPositionAt, restoreReadingOffset } from '@/sub-packages/scenes/reading-position'
import { createReadingPositionWriter } from '@/sub-packages/scenes/reading-position-writer'

import type {
  PublishedScene,
  ReadingBlock,
  ReadingPosition,
  ReadingPositionViewPorts
} from '@/shared/types/learning'

/** 按当前设备导航计算可见正文起点 */
const readingHeaderHeight = () => {
  let height = 88
  // #ifdef MP-WEIXIN
  if (typeof uni !== 'undefined' && typeof uni.getMenuButtonBoundingClientRect === 'function') {
    const info =
      typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : uni.getSystemInfoSync()
    const top = info.statusBarHeight || 20,
      capsule = uni.getMenuButtonBoundingClientRect()
    height = top + Math.max(44, capsule.bottom - top + 8)
  }
  // #endif
  return height
}
/** 恢复服务端同版阅读锚点，只为实际滚动保存可信位置
 * @param ports 当前发布正文、稳定卡片编号和子组件测量端口
 */
export const useReadingPosition = (ports: ReadingPositionViewPorts) => {
  const { measureReading } = useReadingAnchors(),
    notice = ref('')
  const writer = createReadingPositionWriter({
    userId: session.userId,
    pending: (action) => operations.pending(action),
    recover: (action) => operations.recover(action),
    run: (action, path, method, body) => operations.run(action, path, method, body)
  })
  let blocks: ReadingBlock[] = [],
    currentScroll = 0,
    restoring = true,
    generation = 0,
    dirty: ReadingPosition | null = null,
    timer: ReturnType<typeof setTimeout> | null = null,
    restoredOffset = 0,
    userScrolled = false,
    snapshotReadonly = false,
    pageOwner: string | null = null
  /** 合并页面与隔离子组件的绝对正文位置 */
  const measure = async () => {
    const values = await Promise.all([
      measureReading(currentScroll),
      ...ports
        .children()
        .map((child) => child?.measureReading?.(currentScroll) || Promise.resolve([]))
    ])
    return [...new Map(values.flat().map((block) => [block.anchor, block])).values()]
  }
  /** 内容展开后重新测量，已有锚点仍以实际块位置为准 */
  const refresh = async () => {
    const run = generation
    await nextTick()
    if (run !== generation) return
    const values = await measure()
    if (run !== generation) return
    blocks = values
    if (userScrolled && ports.scene.value)
      dirty = readingPositionAt(
        blocks,
        currentScroll,
        readingHeaderHeight(),
        ports.scene.value.version_id
      )
  }
  /** 同版本按语义块恢复，新版本明确从顶部开始
   * @param scene 刚由接口或受控预取确认的发布详情
   * @param snapshotScroll 登录前同版本的展示位置，仅在账号无已存位置时恢复且不计为用户滚动
   */
  const restore = async (scene: PublishedScene, snapshotScroll?: number) => {
    const run = ++generation
    pageOwner = session.userId()
    restoring = true
    dirty = null
    userScrolled = false
    snapshotReadonly = typeof snapshotScroll === 'number' && Number.isFinite(snapshotScroll)
    const reset = 'reading_position_reset' in scene && scene.reading_position_reset
    notice.value = reset ? '内容已更新，已从顶部开始阅读' : ''
    await nextTick()
    if (run !== generation) return
    const values = await measure()
    if (run !== generation) return
    blocks = values
    const offset = scene.reading_position
      ? restoreReadingOffset(
          scene.reading_position,
          blocks,
          readingHeaderHeight(),
          scene.version_id
        )
      : typeof snapshotScroll === 'number' && Number.isFinite(snapshotScroll)
        ? Math.max(0, snapshotScroll)
        : 0
    restoredOffset = offset ?? 0
    currentScroll = restoredOffset
    if (typeof uni === 'undefined' || typeof uni.pageScrollTo !== 'function') {
      restoring = false
      return
    }
    uni.pageScrollTo({
      scrollTop: restoredOffset,
      duration: 0,
      complete: () => {
        if (run === generation) restoring = false
      }
    })
  }
  /** 来源回放只在用户实际发起滚动后进入个人保存，裁剪和布局回调保持只读
   * @param event 真实触摸移动、滚轮或键盘滚动输入，不把普通按键和表单编辑当成阅读滚动
   */
  const startUserScroll = (event: Event) => {
    if (!snapshotReadonly || !ports.scene.value) return
    if (event.type === 'keydown') {
      const key = (event as KeyboardEvent).key,
        target = event.target as HTMLElement | null
      if (target?.isContentEditable || /^(?:input|textarea|select)$/i.test(target?.tagName || ''))
        return
      if (target?.tagName === 'BUTTON' && key === ' ') return
      if (!/^(?:Arrow(?:Up|Down|Left|Right)|Page(?:Up|Down)|Home|End| |Spacebar)$/.test(key)) return
    } else if (!['touchmove', 'wheel'].includes(event.type)) return
    snapshotReadonly = false
    restoredOffset = currentScroll
  }
  /** 滚动即时采样已有可信布局，停稳后重新核对实际块位置
   * @param scrollTop uni页面实际报告的滚动距离
   */
  const scroll = (scrollTop: number) => {
    currentScroll = scrollTop
    if (snapshotReadonly) {
      restoredOffset = scrollTop
      return
    }
    if (
      restoring ||
      !ports.scene.value ||
      (!userScrolled && Math.abs(scrollTop - restoredOffset) < 1)
    )
      return
    userScrolled = true
    dirty = readingPositionAt(
      blocks,
      currentScroll,
      readingHeaderHeight(),
      ports.scene.value.version_id
    )
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void refresh()
    }, 160)
  }
  /** 离开前保存最近可信正文锚点，不因测量失败伪造位置 */
  const save = async () => {
    const position = dirty,
      scene = ports.scene.value
    if (
      !position ||
      !scene ||
      position.version_id !== scene.version_id ||
      pageOwner !== session.userId()
    )
      return
    try {
      await writer.save(ports.cardId(), position)
    } catch {
      notice.value = '阅读位置暂未同步，稍后可重试'
    }
  }
  /** 释放滚动采样，禁止旧页面测量回写 */
  const dispose = () => {
    generation++
    if (timer) clearTimeout(timer)
    timer = null
  }
  onBeforeUnmount(dispose)
  return { notice, restore, refresh, scroll, startUserScroll, save, dispose }
}
