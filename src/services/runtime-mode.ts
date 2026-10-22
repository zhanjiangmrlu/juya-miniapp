import { readonly, ref } from 'vue'

import { ApiCategory } from '@/shared/enums/share'

import type { NativeCategoryAPI, RuntimeModePorts, RuntimeOptions } from '@/shared/types/share'

import { ApiError } from './errors'

/** 读取微信官方能力类别，H5 不通过查询参数模拟平台模式 */
const nativeAPI = () => (globalThis as typeof globalThis & { wx?: NativeCategoryAPI }).wx
/** 同步读取当前官方类别，兼容尚无此能力的旧基础库 */
const nativeCategory = () => {
  try {
    return nativeAPI()?.getApiCategory?.()
  } catch {
    return undefined
  }
}
/** 创建全局运行模式边界，场景编号不承担权限判断
 * @param ports 官方能力类别读取端口
 */
export const createRuntimeMode = (ports: RuntimeModePorts) => {
  const category = ref(ports.category() || ApiCategory.DEFAULT)
  const browseOnly = ref(category.value === ApiCategory.BROWSE_ONLY)
  const revision = ref(0)
  /** 优先接受明确官方事件，再同步核对当前平台类别
   * @param options App 生命周期或类别变更的官方参数
   */
  const update = (options: RuntimeOptions = {}) => {
    const value = typeof options.apiCategory === 'string' ? options.apiCategory : ports.category()
    if (value && category.value !== value) {
      category.value = value
      revision.value++
    }
    browseOnly.value = category.value === ApiCategory.BROWSE_ONLY
    return browseOnly.value
  }
  /** 私有操作每次重新核对平台模式，不依据缓存会话放行 */
  const assertPrivate = () => {
    if (update()) throw new ApiError('browse_only', '当前为分享摘要，请打开完整小程序后继续')
  }
  return {
    category: readonly(category),
    browseOnly: readonly(browseOnly),
    revision: readonly(revision),
    update,
    assertPrivate
  }
}
export const runtimeMode = createRuntimeMode({ category: nativeCategory })
let listening = false
/** 在 App 启动及重新显示前识别运行模式并只注册一次官方监听
 * @param options 当前 App 生命周期的官方参数
 */
export const syncRuntimeMode = (options: RuntimeOptions = {}) => {
  runtimeMode.update(options)
  if (!listening && nativeAPI()?.onApiCategoryChange) {
    nativeAPI()!.onApiCategoryChange!((result) => runtimeMode.update(result))
    listening = true
  }
}
