# 静音模式单词点读修复（2026-11-09）

用户反馈iPhone静音时，场景学习的单词点读无声，要求与整篇音频一样可正常播放。本轮基于最新release `1ae86e9`，在既有隔离工作树的`codex/scene-audio-silent-mode`分支修复。

## 原因与改动

场景及听读点词均由`createAudioPort(true)`创建独立的InnerAudioContext；此前只关闭autoplay，没有设置静音策略，因而沿用默认遵循静音开关的行为。整篇播放器使用独立的背景音频管理器。

共用音频适配层现在在每次微信内部音轨创建前调用`uni.setInnerAudioOption({ obeyMuteSwitch: false })`，同时设置实例同名属性为false；不依赖已弃用实例属性单独生效。设置autoplay=false保持主动点击播放，整篇背景音频分支和H5播放器不变。没有修改音量、强制扬声器路由或学习数据。

[uni-app官方文档](https://uniapp.dcloud.net.cn/api/media/audio-context.html)说明：obeyMuteSwitch默认true，false允许iOS静音模式出声。当前依赖的微信SDK类型同时说明全局setInnerAudioOption接口的能力和限制。

## 已验证

- 回归先执行真实微信编译模块：新增用例在旧代码下失败，首次单词播放未产生预期原生播放结果，原27项通过。
- 修复后全量`pnpm test`：121文件、707项全部通过，含场景／听读播放器、切源隔离、点读互斥及微信测试／生产构建、主包预算检查。
- 新用例在原生API边界模拟静音策略，验证首词可播、切词重建时重新应用策略，加载不自动播放，旧音轨销毁。
- `pnpm check`通过：Prettier、ESLint、Stylelint、TypeScript。
- 隔离H5生产构建通过，输出`dist/silent-audio-h5`，未覆盖原热更新目录。

这些测试验证配置及编译调用链，不能替代真实iPhone声卡验收。新包真机需核对：静音开关开启且媒体音量非零时，点击英文／喇叭、切换单词、整篇与点词切换、返回页面后均可正常出声；耳机连接时继续走系统当前音频输出。

本轮未推送、上传微信新版本、切换体验版或修改远程后端／数据库；现有1.0.2体验包不包含这次修复。
