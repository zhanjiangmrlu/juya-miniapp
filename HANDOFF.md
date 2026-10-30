## 2026-10-30 微信音频初始化修复

场景与听读共用的音频控制器统一放入`src/services/audio-controller.ts`，应用通过同一入口重置会话，主入口先加载共享模块，不依赖先进入场景分包。微信构建验证增加主入口可达依赖检查，缺失时直接失败。开发者工具清理编译缓存并冷启动后，从已学听读直接进入文章已现场验证正文与播放器显示，播放推进至00:06/00:39后暂停正常。407项回归、check、H5与微信构建结果见本机验收日志；真实微信登录保留，不新增绕过。

# 整合05／修订17本地接续（2026-10-30）

本轮在隔离工作树`codex/revision17-integration05`实现，原运行目录未覆盖，未推送或部署。需求更新至整合05/T01—T300，最低schema仍0023。当前结果、配套版本、55画板与103关联状态、300条追踪及截图，见同级[API交接](../juya-api/docs/handoff/revision17/integration05/README.md)。下方2026-10-29为冻结历史，不作为本轮验收结论。

六张干净背景位于`resources/oss/backgrounds`，实际原图853×1844，保留真实尺寸并记录SHA，未伪称@3x；禁止复制进`src/static`。H5开发白名单服务和H5构建输出在`/design-assets`；微信包不内嵌大图。部署前由用户另行发布这些资源并配置实际静态域名。

本地H5：`VITE_API_BASE_URL='' VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:5182 VITE_STATIC_ASSET_BASE_URL='' VITE_REMOTE_FONTS=false pnpm dev:h5 --port 5184 --strictPort`。

本地开发者工具构建：`VITE_API_BASE_URL=http://127.0.0.1:5182 VITE_STATIC_ASSET_BASE_URL=http://127.0.0.1:5184/design-assets VITE_REMOTE_FONTS=false pnpm build:mp-weixin:test`；静态服务必须同时运行。真机不能使用手机自身127.0.0.1，需用户另行提供合法可达域名。未新增H5登录绕过；浏览器合成会话仅为隔离验收，不等同真实微信身份。

BG06实际应用在`identity-edit.vue`；兼容`account/profile.vue`仍继承账号BG04。首页旧背景保留，长文插画只出现在顶部，后续为纸纹。

检查：`pnpm check`、`pnpm test --maxWorkers=2`、`pnpm build:h5`、`pnpm build:mp-weixin:test`。

---

## 2026-10-29冻结记录

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
