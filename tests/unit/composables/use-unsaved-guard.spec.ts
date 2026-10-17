// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, type Ref, ref } from 'vue'
const { backTo, onBackPress } = vi.hoisted(() => ({ backTo: vi.fn(), onBackPress: vi.fn() }))
vi.mock('@dcloudio/uni-app', () => ({ onBackPress }))
vi.mock('@/services/navigation', () => ({ backTo }))
import { useUnsavedGuard } from '@/composables/use-unsaved-guard'
import { LeaveChoice } from '@/shared/enums/profile'

const mountGuard = (dirty: Ref<boolean>, busy: Ref<boolean>, save: () => Promise<boolean>) => {
  let guard!: ReturnType<typeof useUnsavedGuard>
  const page = mount(
    defineComponent({
      setup() {
        guard = useUnsavedGuard(dirty, busy, save, '/profile')
        return () => null
      }
    })
  )
  return { page, guard }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

it('keeps the page when native close acknowledgement is missing and disallows unsupported editing', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('uni', { canIUse: () => true, showToast: vi.fn() })
  const { page, guard } = mountGuard(ref(true), ref(false), async () => true)
  const leaving = guard.choose(LeaveChoice.DISCARD)
  await vi.advanceTimersByTimeAsync(3100)
  await leaving
  expect(backTo).not.toHaveBeenCalled()
  expect(guard.nativeShow.value).toBe(true)
  page.unmount()
  vi.stubGlobal('uni', { canIUse: () => false, showToast: vi.fn() })
  const unsupported = mountGuard(ref(false), ref(false), async () => true)
  expect(unsupported.guard.canEdit.value).toBe(false)
  unsupported.page.unmount()
})

it('rearms native interception after a system return and keeps the three-choice dialog on the same page', async () => {
  vi.stubGlobal('uni', { canIUse: () => true, showToast: vi.fn() })
  const dirty = ref(true),
    busy = ref(false),
    save = vi.fn().mockResolvedValue(false)
  const { page, guard } = mountGuard(dirty, busy, save)
  expect(guard.nativeShow.value).toBe(true)
  guard.nativeBeforeLeave()
  await guard.nativeAfterLeave()
  expect(guard.open.value).toBe(true)
  expect(guard.nativeShow.value).toBe(true)
  await guard.choose(LeaveChoice.CONTINUE)
  expect(guard.open.value).toBe(false)
  expect(backTo).not.toHaveBeenCalled()
  guard.requestBack()
  await guard.choose(LeaveChoice.SAVE)
  expect(save).toHaveBeenCalledOnce()
  expect(backTo).not.toHaveBeenCalled()
  expect(dirty.value).toBe(true)
  page.unmount()
})

it('waits for native afterleave before navigating and never navigates twice for a late event', async () => {
  vi.stubGlobal('uni', { canIUse: () => true, showToast: vi.fn() })
  const dirty = ref(true),
    busy = ref(false)
  const { page, guard } = mountGuard(dirty, busy, async () => {
    dirty.value = false
    return true
  })
  const leaving = guard.choose(LeaveChoice.SAVE)
  await nextTick()
  await nextTick()
  expect(guard.nativeShow.value).toBe(false)
  expect(backTo).not.toHaveBeenCalled()
  await guard.nativeAfterLeave()
  await leaving
  expect(backTo).toHaveBeenCalledOnce()
  await guard.nativeAfterLeave()
  expect(backTo).toHaveBeenCalledOnce()
  page.unmount()
})
