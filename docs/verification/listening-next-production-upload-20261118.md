# 大分类下一篇微信生产包上传（2026-11-18）

**1.0.4 / 108** 已通过正式 `pnpm release:mp-weixin` 上传，生产 API 配套上线并通过 322 篇/17592B 长队列真实 POST 及重复查询验收，学习完成事实不变。体验版由用户自行切换，未提审或正式发布，真机未验。

源码 `5d4a479591f48ef0cabca0000fba392acc1f9770`；成功版本记录 `0be3e29552ce902c6ce8b9e48171972e5ed235ae` 已推 release；上传 UTC `2026-11-18T14:40:30.548Z`。934 测试/check 及正式构建、20页面/三Tab/共享音频/主包预算通过；官方总包 1537624B、主包 947136B。生产资源新增0/复用13，已有生产统计独立许可配置保持。

旧客户端仍可能发出长 GET 而遇到414，需要切换新版。完整来源、备份、数据保留及操作边界见 [API生产验收](https://github.com/zhanjiangmrlu/juya-api/blob/release/docs/verification/listening-next-production-release-20261118.md)。
