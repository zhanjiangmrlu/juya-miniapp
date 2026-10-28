# 修订17 MacBook接续入口

本轮用户授权提交、推送远程`test`用于MacBook已有四项目环境增量接续，未授权部署。请先阅读同级API仓库的[完整MacBook交接](../juya-api/HANDOFF.md)或[远程交接](https://github.com/zhanjiangmrlu/juya-api/blob/test/HANDOFF.md)。本次需求文档由用户同步；设计链接、完整报告、276条追踪及9张截图随API仓库提交。

沿用Mac现有Node22.22以上且小于23、pnpm11.25.0；按锁文件同步所需依赖。保留原本地后端配置、账号、媒体和密钥，备份并增量升级原本地库至0022；当前只连本地数据库，`test`是代码分支。

```zsh
pnpm install --frozen-lockfile
VITE_API_BASE_URL='' VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:8002 VITE_STATIC_ASSET_BASE_URL='' VITE_REMOTE_FONTS=false pnpm dev:h5
```

H5为`http://127.0.0.1:5174`。没有新增H5登录绕过，登录仍依赖真实微信身份；Windows合成验收会话不随Git迁移。

在独立终端构建本机微信开发者工具包：

```zsh
VITE_API_BASE_URL=http://127.0.0.1:8002 VITE_STATIC_ASSET_BASE_URL='' VITE_REMOTE_FONTS=false pnpm build:mp-weixin:test
```

导入`dist/build/mp-weixin`。原生请求不能用H5空前缀；版本化`.env.test/.env.development`仍有远程配置，显式本地覆盖不可省略。手机真机不能用手机自己的127.0.0.1访问Mac后端，需要另配可访问地址及合法域名。Mac配置不得照抄Windows绝对路径。

当前三Tab为首页/学习记录/账号，场景和听读入口独立；场景列表/收藏为普通页面，不能用switchTab打开。听读媒体时钟、尾迹暂停、版本进度、收藏/完成、共用打卡及下一篇保留来源均已实现；缺合法词轴时正常听读降级。

检查用`pnpm check`、`pnpm test --maxWorkers=2`、`pnpm build:h5`及上述本地微信构建。本轮提交前新鲜383项测试通过；18页面/三Tab及包体检查通过。它们不替代真实微信身份、设备手势、系统回收恢复、真实录音同步或53画板完整验收。

`.env.*.local`、`node_modules`、`dist`及本地开发者工具设置不随Git同步。后续优先按完整交接完成Mac本地运行、真实云和设备验收，再修改代码；不要重做已关闭的R1—R7/S1。
