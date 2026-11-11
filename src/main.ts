import { createPinia } from 'pinia'
import { createSSRApp } from 'vue'

import App from './App.vue'

import './services/analytics-bootstrap'

/** 初始化小程序应用与统一本人状态 */
export const createApp = () => {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
