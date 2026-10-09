import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import type { Plugin } from 'vite'

const SDK_SHA256 = '221849e944767b5a00df30cef6833ab39677a5f5b2a44fb1201be6b69f54b50a'
const VIRTUAL_ID = 'virtual:juya-umeng-sdk'

/** 包装原版 SDK，source 为锁定的 npm 内容；屏蔽全局挂接并注入可撤回的能力 */
export const wrapUmengSource = (source: string): string => {
  if (createHash('sha256').update(source).digest('hex') !== SDK_SHA256)
    throw new Error('友盟 SDK 内容改变，请重新验证授权隔离后更新指纹')
  return `export default (scope) => {
    const { wx, setTimeout, clearTimeout, setInterval, clearInterval } = scope;
    let App = () => {}, Page = () => {}, Component = () => {};
    const module = { exports: {} };
    ${source}
    return module.exports;
  };`
}

/** 提供静态 SDK 工厂，只有微信小程序导入虚拟模块时才编译 SDK */
export const isolatedUmengSdk = (): Plugin => ({
  name: 'juya-isolated-umeng-sdk',
  /** 解析隔离模块，id 为 Vite 导入标识 */
  resolveId: (id) => (id === VIRTUAL_ID ? `\0${VIRTUAL_ID}` : undefined),
  /** 加载已核验 SDK，id 为隔离模块标识 */
  load: (id) => {
    if (id !== `\0${VIRTUAL_ID}`) return undefined
    const require = createRequire(import.meta.url)
    return wrapUmengSource(readFileSync(require.resolve('umtrack-wx'), 'utf8'))
  }
})
