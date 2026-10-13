import type { InjectionKey } from 'vue'

/** 当前页面及其发音组件共享的播放所有者 */
export const AUDIO_PAGE_OWNER_KEY: InjectionKey<symbol> = Symbol('audio-page-owner')
