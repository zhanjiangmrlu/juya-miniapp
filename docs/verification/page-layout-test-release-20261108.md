# 整合08页面布局与文案测试发布记录

2026年11月8日，按用户本轮授权，功能源码de8a07d已推送远程test，并通过统一测试流程上传微信开发版 **1.5.0-test.20261108.224957**。官方CLI退出成功并返回有效包体回执，结果success。体验版由用户手动切换，未提交审核或正式发布。

本轮仅小程序代码变化。测试API及管理后台沿用整合08已部署版本，无需重新部署API、后台或Worker；没有数据库迁移、业务数据或生产环境操作。上传后双测试API的ready均200且角色/environment正确，匿名首页与场景列表200、游客个人统计为空，测试后台入口200。

## 发布验证

- 发布前重新执行check：格式、ESLint、Stylelint、TypeScript全部通过
- 完整Vitest：121文件706测试通过，含test/production主包450KiB断言
- 先推送并核对远程test为de8a07d，再执行pnpm release:mp-weixin:test
- 测试编译的18页面配置、三Tab、主入口共享音频及包体校验通过，主包源码459323B
- 测试OSS新增0、复用13，统一流程完成公网资源验证
- 包内为test-api.juyayingyu.com及测试OSS，未包含生产API、本地后端地址、私有项目配置或凭据配置文件
- 隔离input源码除测试版manifest版本号外，与固定功能源码逐文件一致
- 生产版本记录release/wechat-version.json及源码src/manifest.json的SHA256前后完全一致
- 原本地开发构建目录保留，测试输出使用独立任务目录

官方包体数据与无密钥公网核验见[JSON回执](page-layout-test-release-20261108.json)。原始官方回执保留在本工作树dist/test-release/77c41c4f-dec1-440f-967d-001bde087965/，不重复上传成功版本。

页面改动及13组浏览器状态证据见[开发验收](page-layout-20261108.md)。微信原生PDF、系统音频及完整iOS/Android交互仍按该记录保留待真机复验，上传成功不替代真机验收。
