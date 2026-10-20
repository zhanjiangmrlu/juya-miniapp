# 修订12小程序视觉资源

来源为工作区中的 `句芽英语-原型与设计稿/本地设计预览`、`assets` 与 `fonts`，未重新设计品牌图形。2026-10-17 的修正只涉及小程序。

- `src/static/brand/u00-botanical-watercolor@3x.webp` 来自已确认的 `assets/u00-botanical-watercolor.png`，按390逻辑像素的三倍尺寸生成1170×780透明WebP，使用无损编码。登录页优先显示原WebP；图片加载失败时切换同尺寸透明PNG，并关闭该图片的WebP解析开关，不反复重试。2026-10-20新增的PNG兜底使用同源图像，以256色透明调色板控制包体积，显示尺寸与构图保持原样；PNG属于量化后的兼容资源，不宣称与原图逐像素相同。真机显示仍需使用新预览包或更新体验版后复核。
- 登录与导航字标PNG使用原型实际字体和排版在浏览器中以3倍分辨率渲染：Cormorant Garamond Italic 的 juya、NotoSerifSC-brand 的句芽英语、宋体标语。显示尺寸记录在 `src/static/brand/brand-metrics.json`。图片保留透明背景，没有将整个登录页做成图片。
- 正文使用 DM Sans 和 Noto Sans SC，英文标题及数字使用 Fraunces。WOFF从设计包的TTF裁剪生成，中文子集覆盖当前界面的静态文案，动态姓名与内容使用系统字体补缺。`src/styles/design-fonts.scss` 内嵌这些字体，避免小程序依赖本机字体或外部字体请求。
- 字体许可原文保存在本目录 `font-licenses/`。宋体只用于本机渲染既有标语，没有分发宋体字体文件。

设计包仍是资源源头；若字标文案、字号或字体更改，应按原型重新渲染PNG，并同步更新显示尺寸。修改UI文案后应核查中文子集与系统回退的实际显示。
