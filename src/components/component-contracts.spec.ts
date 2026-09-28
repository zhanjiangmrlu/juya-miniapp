// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import AppButton from './app-button/app-button.vue'
import AppState from './app-state/app-state.vue'
import BottomActionBar from './bottom-action-bar/bottom-action-bar.vue'

describe('公共组件契约', () => {
  it('禁用按钮不会触发业务点击', async () => {
    const wrapper = mount(AppButton, {
      props: {
        disabled: true,
        label: '继续学习'
      }
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('press')).toBeUndefined()
    expect(wrapper.get('button').attributes('aria-disabled')).toBe('true')
  })

  it('底部操作栏始终声明安全区样式', () => {
    const wrapper = mount(BottomActionBar, {
      slots: {
        default: '<button>完成学习</button>'
      }
    })

    expect(wrapper.classes()).toContain('bottom-action-bar--safe')
    expect(wrapper.text()).toContain('完成学习')
  })

  it('状态反馈同时提供图标文字和状态文案', () => {
    const wrapper = mount(AppState, {
      props: {
        description: '请检查网络后重新连接',
        iconLabel: '网络连接异常',
        title: '暂时无法连接'
      }
    })

    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('网络连接异常')
    expect(wrapper.get('[role="status"]').text()).toContain('暂时无法连接')
    expect(wrapper.get('[role="status"]').text()).toContain('请检查网络后重新连接')
  })
})
