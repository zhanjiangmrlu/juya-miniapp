import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'

import App from './App.vue'
import { i18n } from './i18n'

/** 创建小程序根实例，并集中注册全局状态与国际化能力。 */
export function createApp() {
  const app = createSSRApp(App)

  app.use(createPinia())
  app.use(i18n)

  return {
    app
  }
}
