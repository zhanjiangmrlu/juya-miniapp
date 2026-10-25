import { computed, reactive } from 'vue'

import { STATIC_ASSET_BASE_URL } from '@/shared/constants/brand'
import { DESIGN_FONT_FACES, REMOTE_FONTS_ENABLED } from '@/shared/constants/fonts'

import type { CSSProperties } from 'vue'

const loaded = reactive(new Set<string>())
let started = false

/** 仅选用已成功加载的字体，避免未完成的字体请求让文字暂时不可见 */
export const remoteFontStyles = computed<CSSProperties>(() => {
  if (!REMOTE_FONTS_ENABLED) return {}
  return {
    fontFamily: [
      loaded.has(DESIGN_FONT_FACES.latin.file) ? "'DM Sans'" : '',
      loaded.has(DESIGN_FONT_FACES.chinese.file) ? "'Juya UI Chinese'" : '',
      "'PingFang SC'",
      "'Microsoft YaHei'",
      'sans-serif'
    ]
      .filter(Boolean)
      .join(', '),
    '--app-latin-font': loaded.has(DESIGN_FONT_FACES.latin.file)
      ? "'DM Sans', sans-serif"
      : 'sans-serif',
    '--app-serif-font': loaded.has(DESIGN_FONT_FACES.serif.file)
      ? 'Fraunces, Georgia, serif'
      : 'Georgia, serif',
    '--app-serif-italic-font': loaded.has(DESIGN_FONT_FACES.serifItalic.file)
      ? 'Fraunces, Georgia, serif'
      : 'Georgia, serif'
  }
})

/** 启动全局字体异步加载，失败保留系统字体，不阻塞页面或业务初始化 */
export const loadRemoteFonts = () => {
  if (
    started ||
    !REMOTE_FONTS_ENABLED ||
    !STATIC_ASSET_BASE_URL.startsWith('https://') ||
    typeof uni.loadFontFace !== 'function'
  )
    return
  started = true
  for (const face of Object.values(DESIGN_FONT_FACES)) {
    try {
      uni.loadFontFace({
        global: true,
        family: face.family,
        source: `url("${STATIC_ASSET_BASE_URL}/fonts/${face.file}")`,
        desc: { style: face.style, weight: '100 900', variant: 'normal' },
        success: () => loaded.add(face.file),
        fail: () => undefined
      })
    } catch {
      // 部分旧基础库会同步抛错，其他字体与页面初始化仍需继续
    }
  }
}
