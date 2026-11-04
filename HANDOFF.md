# release 小程序自动版本命令（2026-11-04，本地实现）

新增 `pnpm release:mp-weixin`：从最近成功上传版本的 patch +1 构建上传，并自动提交、推送版本记录和清单；不以正式上线为编号基准。初始记录沿用已有 `1.0.0` / `100` 成功回执，下次候选为 `1.0.1` / `101`。普通测试构建保持；本轮实现未真实上传或推送，未消耗版本号。实际使用、检查/仅构建及中断恢复见[操作说明](docs/operations/wechat-release.md)。本机源码在功能分支，需按正常流程集成到 release 后使用。Node 22.22.0 下103文件/524测试通过（含13项新增发布测试），格式、ESLint、Stylelint、TypeScript检查通过；真实生产候选包构建通过18页面、共享音频和主包预算检查，模拟上传不代表真实微信上传验收。

---

# 最新全页面分享生产包上传（2026-11-04）

用户新增授权后，全页面分享、测试 OSS 封面及缓存兜底源码 `19d3d6d` 已推送 `test`，合并源码 `982976f` 已推送 `release`。生产微信 `1.0.0`（清单 `1.0.0` / `100`）经官方 CLI 上传成功，体验版由用户手动切换；没有提交审核或正式发布。生产两张封面沿用既有生产静态域名，原资源及测试配置保持，无 API/后台部署或数据库操作。两个分支均通过511测试、静态检查，生产微信构建和域名隔离核验通过；原目录 `test` 热更新保留。见[分享发布记录](docs/verification/share-production-release-20261104.md)。

---

# 最新列表与整段音频加载优化测试发布（2026-11-04）

背景与纸纹压缩、听读列表并行及整段音频预取优化源码 `1ed9406` 已推送test，六个哈希资源发布到原测试OSS前缀，原图保留。微信测试包 `1.5.0-r17.06.1103.2` 已上传，体验版仍由用户切换。配套测试小程序API/Worker/dispatcher固定源码 `00a4c11` 已部署，其他16容器及生产保持；无数据库迁移。小程序完整470测试、静态检查和构建通过；API完整真实MySQL/Redis621通过/3跳过。真机首屏/首播耗时仍待验收，不能将体积或查询次数下降当作实际延迟数据。详情见[本轮记录](docs/verification/loading-performance-20261103.md)。

---

# 最新正文表达加粗补修（2026-11-02）

修复上一轮遗漏：正文已有的表达色带也统一加粗，覆盖独立词汇列表为空的“快餐店”。源码`5204f2e`已推送test，微信`1.5.0-r17.06.1102.5`已上传，体验版由用户手动切换。448项测试、check、微信构建通过，实际原文组件浏览器核验加粗可见。无后台或API部署、数据库写入。见[补修发布记录](docs/verification/listening-expression-bold-test-release-20261102.md)。

---

# 最新听读显示与场景编辑测试发布（2026-11-02）

听读正文重复提示已移除，重点词汇改为四色背景并加粗；后台旧页面资源失效时提供受离页保护的刷新恢复入口。测试后台页面已重新发布并实际点击编辑、返回批次核验；小程序 `1.5.0-r17.06.1102.4` 已上传，体验版由用户手动切换。旧后台标签页先刷新一次。本次无API部署、数据库迁移或生产发布。固定源码与检查见[发布记录](docs/verification/listening-edit-fixes-test-release-20261102.md)。

---

# 最新发音优化测试发布（2026-11-02）

正文全文发音预取、弹窗间缓存及生命周期清理源码`3d12752`已推送test，微信`1.5.0-r17.06.1102.3`已通过官方CLI上传，明确指向测试API并保留既有静态资源/字体配置；体验版由用户手动切换。测试双API及全部Worker/dispatcher同步更新，当前`car`、`police`持久发音状态ready，真机出声延迟仍待验收。见[发布记录](docs/verification/word-audio-test-release-20261102.md)。

---

# 最新滚动条测试发布（2026-11-02）

全局隐藏滚动条的源码已推送远程 `test`，小程序 `1.5.0-r17.06.1102.2` 已上传，体验版由用户手动切换。测试 mini-api 已按永久词典配置重新应用并验证，镜像代码无变化；其他服务未部署。本地热更新保留。固定源码及检查见[发布记录](docs/verification/global-scrollbar-test-release-20261102.md)。

---

# 最新听读修复测试发布（2026-11-02）

听读高亮、吸顶背景、大图缩放和后台词汇表单修复已推送两个仓库远程 `test`。后台测试站点已部署；小程序 `1.5.0-r17.06.1102` 已上传，体验版由用户手动切换。本次无 API 部署、数据库迁移或生产发布。固定源码与实际验证见[发布记录](docs/verification/listening-ui-test-release-20261102.md)。本地热更新保留；下方为更早阶段记录。

---

# 最新测试发布（2026-11-01）

用户新增授权后，整合06代码已推送远程 test，后台及双角色 API／Worker 已部署测试环境，测试库升级0024／contract3。微信包 1.5.0-r17.06.1101 上传成功，体验版由用户手动切换。固定提交、备份及实际核验见[发布记录](https://github.com/zhanjiangmrlu/juya-api/blob/test/docs/verification/integration06-test-release-20261101.md)。下方“未部署”等表述是此前本地交付时的历史状态；本次未部署生产环境。原目录及本地热更新环境保留。

---

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
