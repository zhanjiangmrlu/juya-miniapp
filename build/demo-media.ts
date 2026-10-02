import { existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'

import type { Plugin } from 'vite'

/** 从真实接口构建移除联调大文件，mockEnabled 表示是否打包离线模拟素材 */
export const excludeDemoMedia = (mockEnabled: boolean): Plugin => {
  let outputDirectory = ''
  return {
    name: 'juya:exclude-demo-media',
    apply: 'build',
    enforce: 'post',
    /** 记录当前构建目录，config 为 Vite 已解析的独立输出配置 */
    configResolved: (config) => {
      outputDirectory = resolve(config.root, config.build.outDir)
    },
    /** 保留原始素材，仅从当前真实接口产物中移除未被页面使用的演示文件 */
    closeBundle: () => {
      if (mockEnabled) return
      for (const name of [
        'static/fixtures/coffee-original.png',
        'static/fixtures/silence.wav',
        'static/home/coffee-home.png',
        'static/images/castle-card.png'
      ]) {
        const target = resolve(outputDirectory, name)
        if (existsSync(target)) unlinkSync(target)
      }
    }
  }
}
