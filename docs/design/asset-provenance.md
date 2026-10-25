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

## 修订15批3

- `feedback-plus.svg`：Figma `lf1bnYzDAZt9eLtdLT0HM3`，U10 `285:4806` 提交入口、U11 `285:5006` 添加截图与U12追加表单均为20×20；已下载并核对U10/U11素材哈希相同
- `feedback-source.svg`：U12 `285:5346`、U11 `285:5041` 的来源书本图标16×20；已下载并核对两处素材哈希相同，展示仍保留16×20比例
- `feedback-message.svg`：U07 `278:2944`、U03 `283:14495` 的反馈入口图标20×20；两处原素材哈希相同，复用一份本地文件
- `feedback-error.svg`：U11失败提示 `285:5309`，16×16；`feedback-chevron.svg`：U10列表箭头 `285:4821`，20×20。以上均来自对应高保真设计上下文提供的SVG地址，未重绘
- U10空态 `285:4872` 的25×25图标与现有 `empty-book.svg` 哈希相同，复用原文件并置于50×50圆形背景。U11删除截图 `285:5123` 的20×20图标与 `dictionary-close.svg` 哈希相同，复用原文件。截图内容由本人选择并通过受控接口上传，不使用设计示例截图替代动态附件

## 修订15批4

- `brand-share.png`、`brand-share-square.png`直接复制修订15设计包`assets`内同名PNG，分别600×480与600×600，未缩放或重绘。SHA256分别为`39aa4a5f35cc8b6461e6cfe6e16d58fe6c4a00069b922f725065299e708bcd96`、`b9e3e653cc8ca5d235857acba0fbbb495c62315a3d0c0017f3e725854ca15fc9`
- `share.svg`来自Figma `lf1bnYzDAZt9eLtdLT0HM3`，U01分享入口`292:5615`提供的20×20素材，保留原路径及描边，展示20×20逻辑像素；弹窗关闭复用既有`dictionary-close.svg`
- 分享预览及安全摘要使用接口当前发布双标题和公开派生图片，未将示例场景图或整屏截图打包为真实内容。好友图5:4、朋友圈图1:1使用接口派生封面；品牌资源只用于学习页及安全兜底

## 修订15测试发布包体

- 植物PNG再次无损重压缩，1170×780完整RGBA数据保持相同，文件减少79,908字节
- DM Sans、Fraunces正体与中文WOFF仅无损重压缩，原字体表及全部原有字符映射保持；Fraunces斜体仅按固定导航字标与十进制统计数字裁剪，动态英文正文和标题的正体字形保留完整原子集
- 来源使用点、字体表及80组逐像素核对见 [包体修复验证](../verification/revision15-package-budget.md)，字体许可继续保留原文件

## 2026-10-25 登录背景 OSS 迁移

- 登录植物 PNG 原文件迁至 `resources/oss/brand/u00-botanical-watercolor@3x.png`，不再放在会整体复制到应用包的 `src/static` 中。文件仍为 894,101 字节，SHA256 为 `bbab68ffff925bab6e8b3cbe2ccb6e0c0a5d6a8eaa582dc00c65007d933c06d0`，未重采样、压缩或修改像素
- 页面通过 `VITE_STATIC_ASSET_BASE_URL` 读取已上传的 `brand/u00-botanical-watercolor@3x.png`，测试与开发使用 `juya-test/miniapp/static`，生产使用 `juya/miniapp/static`。其他品牌图、分享图、导航图标与内嵌字体继续本地打包
- 测试桶中用户已上传的图片为 417,598 字节的调色板 PNG，仍为 1170×780，SHA256 为 `9700e8b314e1926625de6caf5333f0b0a827e89a1b9f29a45a69cf48fdc19d45`。它与仓库原图并非字节或像素完全相同，本次按“复用已上传文件”的要求直接引用该版本，没有覆盖或重新上传任何图片
- 装饰图请求失败时只隐藏该图片，布局、品牌文字、隐私说明和登录操作保持可用。远程图片访问及包体实测见 [OSS 静态资源验证](../verification/oss-static-assets.md)
