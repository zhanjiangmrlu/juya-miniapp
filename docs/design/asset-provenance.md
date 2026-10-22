# 修订12小程序视觉资源

来源为工作区中的 `句芽英语-原型与设计稿/本地设计预览`、`assets` 与 `fonts`，未重新设计品牌图形。2026-10-17 的修正只涉及小程序。

- `src/static/brand/u00-botanical-watercolor@3x.png` 来自已确认的 `assets/u00-botanical-watercolor.png`，按390逻辑像素的三倍尺寸生成1170×780透明图片。2026-10-20按用户要求改为直接使用PNG，移除WebP背景及格式切换逻辑。PNG由原无损WebP转换并进行无损压缩，已逐像素核对RGBA数据一致，保持原画面、透明度和显示尺寸。真机显示仍需使用新预览包或更新体验版后复核。
- 登录与导航字标PNG使用原型实际字体和排版在浏览器中以3倍分辨率渲染：Cormorant Garamond Italic 的 juya、NotoSerifSC-brand 的句芽英语、宋体标语。显示尺寸记录在 `src/static/brand/brand-metrics.json`。图片保留透明背景，没有将整个登录页做成图片。
- 正文使用 DM Sans 和 Noto Sans SC，英文标题及数字使用 Fraunces。WOFF从设计包的TTF裁剪生成，中文子集覆盖当前界面的静态文案，动态姓名与内容使用系统字体补缺。`src/styles/design-fonts.scss` 内嵌这些字体，避免小程序依赖本机字体或外部字体请求。
- 字体许可原文保存在本目录 `font-licenses/`。宋体只用于本机渲染既有标语，没有分发宋体字体文件。

设计包仍是资源源头；若字标文案、字号或字体更改，应按原型重新渲染PNG，并同步更新显示尺寸。修改UI文案后应核查中文子集与系统回退的实际显示。

## 修订15批1

- `src/static/design/refresh.svg`：Figma `lf1bnYzDAZt9eLtdLT0HM3`，U01-normal `275:645` 内刷新图标 `275:719`，经 `get_design_context` 提供的素材下载地址获取；20×20 SVG，用于学习列表“刷新列表”的20×20逻辑像素槽位
- 独立学习记录入口复用现有 `calendar.svg`、`chevron.svg`；结束弹窗无新增静态图片。场景卡缩略图与详情图片继续由接口提供

## 修订15批2

- `src/static/design/dictionary-close.svg`：Figma `lf1bnYzDAZt9eLtdLT0HM3`，通用词典弹窗 `284:3679` 内关闭图标 `284:4072`，经设计上下文提供的SVG素材地址获取；20×20逻辑像素
- `src/static/design/dictionary-speaker.svg`：同一弹窗内喇叭图标 `284:4081`，经设计上下文提供的SVG素材地址获取；20×20逻辑像素
- 已对照本篇释义 `283:14119`、通用词典 `284:3679`、词形关联 `284:4086`、查无结果 `284:4495`、加载失败 `284:4900` 的设计上下文与截图实现居中弹窗；背景、字体、颜色复用现有设计变量，正文图片继续由接口提供
