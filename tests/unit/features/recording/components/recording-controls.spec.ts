// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import RecordingControls from '@/features/recording/components/recording-controls.vue'

describe('录音提示优先级', () => {
  it('录音和回听呈现实际设备状态，处理期间不允许再次启动', async () => {
    const wrapper = mount(RecordingControls, {
      props: {
        sentence: { entry_id: 's1', source_locator: 's1', entry_type: 'DIALOGUE', text: 'Hello' },
        snapshot: { selectedSentenceId: 's1', recordingDisabled: false, status: 'RECORDING' }
      }
    })
    expect(wrapper.get('.recording-hint').text()).toContain('录音中')
    await wrapper.setProps({
      snapshot: {
        selectedSentenceId: 's1',
        recordingDisabled: false,
        status: 'PLAYBACK',
        hasRecording: true
      }
    })
    expect(wrapper.get('.recording-hint').text()).toContain('正在回听当次录音')
    await wrapper.setProps({
      snapshot: {
        selectedSentenceId: 's1',
        recordingDisabled: false,
        status: 'IDLE',
        processing: true
      }
    })
    expect((wrapper.findAll('button')[0].element as HTMLButtonElement).disabled).toBe(true)
    expect(wrapper.get('.recording-hint').text()).toContain('正在准备录音')
    wrapper.unmount()
  })
  it('权限禁用优先于失败，属性恢复后同步提示和操作', async () => {
    const snapshot = {
      recordingDisabled: true,
      selectedSentenceId: 's1',
      status: 'FAILED' as const
    }
    const wrapper = mount(RecordingControls, {
      props: {
        sentence: { entry_id: 's1', source_locator: 's1', entry_type: 'DIALOGUE', text: 'Hello' },
        snapshot
      }
    })
    expect(wrapper.get('.recording-hint').text()).toBe('录音权限未开启，仍可播放原音')
    expect((wrapper.get('button').element as HTMLButtonElement).disabled).toBe(true)
    await wrapper.setProps({ snapshot: { ...snapshot, recordingDisabled: false } })
    expect(wrapper.get('.recording-hint').text()).toBe('录音暂不可用，请重试')
    await wrapper.setProps({ snapshot: { ...snapshot, recordingDisabled: false, status: 'IDLE' } })
    expect(wrapper.get('.recording-hint').text()).toBe('录音仅保留本次回听，不评分')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('start')).toEqual([[]])
    wrapper.unmount()
  })
})
