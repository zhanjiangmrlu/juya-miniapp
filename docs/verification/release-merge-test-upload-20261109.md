# 整合08合并release与测试开发版上传记录

2026年11月9日，按用户本轮授权，将小程序远程test的9c4c51c合并到release。合并提交为785a34fd727652cdc4c33b308085a050c80c1b8f，父提交分别为原release的ddbb5ff与test的9c4c51c，无冲突，已推送origin/release。原本地运行目录和其他项目保持。

合并后与test的差异仅release/wechat-version.json及src/manifest.json：保留release原有1.0.1/101生产版本记录，业务源码与已验收整合08测试版本一致。合并后完整121文件706测试、格式、ESLint、Stylelint及TypeScript检查全部通过。

从该release提交执行pnpm release:mp-weixin:test，固定使用测试API和测试OSS。微信开发版 **1.5.0-test.20261109.134644** 已获官方CLI成功回执，status为success。体验版由用户手动切换，未提审或正式发布。

## 发布核验

- 18页面、三Tab及主入口共享音频校验通过；主包源码459323B，原450KiB约束保持
- 测试OSS新增0、复用13；资源公网验证由既定发布器完成
- 包内测试API/OSS域名核对通过，无生产API、本地后端地址、私有项目或凭据配置
- 隔离input源码除测试版manifest外与固定合并提交逐文件一致
- 上传前后release生产版本记录及源码manifest的SHA256完全一致
- 本轮API、后台、Worker无源码变化，沿用已部署整合08测试服务；上传后测试双API就绪、匿名首页/场景列表及后台入口均200，环境为test、游客个人统计为空
- 未操作生产服务、数据库、体验版切换、审核或正式发布

完整无密钥回执及官方包体数据见[JSON记录](release-merge-test-upload-20261109.json)。原始官方回执保留在本工作树dist/test-release/b05762a6-7844-4018-80b9-f16cdace2408/，无需重复上传此成功版本。

页面与真机边界沿用[页面验收](page-layout-20261108.md)：浏览器13组状态及自动化通过，不以上传成功代替iOS/Android原生PDF和系统音频真机复验。
