// @vitest-environment happy-dom

import { enableAutoUnmount, shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PageHeader from '@/components/page-header/page-header.vue'
import EntryPageShell from '@/features/learning/components/entry-page-shell.vue'
import TabPageLayout from '@/layouts/tab-page-layout.vue'

enableAutoUnmount(afterEach)
afterEach(() => vi.unstubAllGlobals())

describe('新版窗口 API 的导航布局兼容', () => {
  beforeEach(() => {
    vi.stubGlobal('uni', {
      getWindowInfo: () => ({
        statusBarHeight: 44,
        windowWidth: 390,
        screenHeight: 844,
        safeArea: { bottom: 810 }
      }),
      getMenuButtonBoundingClientRect: () => ({
        top: 52,
        bottom: 84,
        left: 280,
        right: 367,
        width: 87,
        height: 32
      })
    })
  })

  it('只提供新版 API 时导航栏仍避让状态栏与微信胶囊', () => {
    const wrapper = shallowMount(PageHeader, { props: { title: '我的学习档案' } })

    expect(wrapper.attributes('style')).toContain('padding-top: 44px')
    expect(wrapper.attributes('style')).toContain('--navigation-height: 48px')
    expect(wrapper.attributes('style')).toContain('--capsule-reserve: 110px')
  })

  it('只提供新版 API 时页面保留实际导航和底部安全区空间', () => {
    const wrapper = shallowMount(TabPageLayout, { props: { active: 'profile' } })

    expect(wrapper.attributes('style')).toContain('--navigation-offset: 14px')
    expect(wrapper.attributes('style')).toContain('--safe-bottom-extra: 15px')
  })

  it('只提供新版 API 时入口页预留完整导航高度', () => {
    const wrapper = shallowMount(EntryPageShell, { props: { active: 'learning' } })

    expect(wrapper.attributes('style')).toContain('--entry-header-reserve: 92px')
  })

  it('窗口 API 不可用时导航栏仍使用原有参考布局', () => {
    vi.stubGlobal('uni', {})
    const wrapper = shallowMount(PageHeader, { props: { title: '我的学习档案' } })

    expect(wrapper.attributes('style')).toContain('padding-top: 30px')
    expect(wrapper.attributes('style')).toContain('--navigation-height: 48px')
  })
})
