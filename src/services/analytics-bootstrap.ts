// #ifdef MP-WEIXIN
// eslint-disable-next-line import/no-unresolved -- 由构建插件装载隔离官方 SDK 工厂
import createSDK from 'virtual:juya-umeng-sdk'

import { analytics } from '@/services/analytics'

if (createSDK) analytics.attach(createSDK)
// #endif
