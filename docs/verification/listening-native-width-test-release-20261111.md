# 听读原生正文横向溢出修复与测试上传

2026-11-11，按用户本轮授权，功能源码 `c8efb29ae6a80d3c6c535983e9fc00820d8a2b93` 已推送远程 test。标准 `pnpm release:mp-weixin:test` 上传微信测试开发版本 **1.5.0-test.20261111.195719**，退出0且官方JSON回执与result.json一致。体验版由用户手动切换，未提审或正式发布。

## 根因与改动

此前页面overflow隐藏/裁剪未解决真实原生布局。微信glass-easel DOM实测：390屏宽的正文嵌套selectable text受父级CSS text-indent影响，右边界到398，页面scrollWidth398，13个元素越界。仅将缩进移入text仍越界。

本轮移除正文CSS首行缩进，段落左对齐，外层selectable text使用block及100%宽度约束；保留段间距、原文、系统选词、词锚点及静态重点色带。移除此前page横向隐藏和根容器clip，以实际布局边界验证修复。

## 验证与交付

- 提交前完整check通过，140文件/844测试通过；原生页面新鲜复验390屏宽、scrollWidth390、越界元素0。
- 本地H5常规及长内容320/390/430宽度验证通过，横向位置0、纵向滚动与固定导航正常。
- 标准构建20页/三Tab、主包预算通过；测试OSS新增0/复用13。
- 实际上传隔离input与两处功能源码逐字节相同；编译产物含paragraph-text宽度约束，无text-indent及旧overflow-x裁剪，仅测试API，更新协调器保留，真实统计域名不在包中。
- 双测试API ready200且environment=test；远程只读复核7服务healthy，继续使用已部署API81f8776。本次无后端改动、无新增后端部署；12非目标容器与基线一致，无迁移或数据变更。
- 无新增埋点，桌面sample.txt未修改。本地开发工具热更新目录保持。

本轮原生模拟器证据不代替iOS/Android真机手势验收；用户尚未反馈此次扫码真机结果。

[无密钥发布回执](listening-native-width-test-release-20261111.json)。此前184518测试包及其裁剪方案为历史记录，本轮195719取代该修复包。
