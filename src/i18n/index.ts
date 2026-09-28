import { createI18n } from 'vue-i18n'

import { zhCN } from './zh-cn'

export const i18n = createI18n({
  fallbackLocale: 'zh-CN',
  legacy: false,
  locale: 'zh-CN',
  messages: { 'zh-CN': zhCN }
})
