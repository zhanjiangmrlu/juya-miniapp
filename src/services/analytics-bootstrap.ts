// #ifdef MP-WEIXIN
// eslint-disable-next-line import/no-unresolved -- 由构建插件装载受控的官方 SDK
import sdk from 'virtual:juya-umeng-sdk'

import { analytics } from '@/services/analytics'

if (sdk) analytics.attach(sdk)
// #endif
