# release 小程序自动版本上传

`pnpm release:mp-weixin` 仅在 `release` 分支执行，自动使用上次成功上传版本的 patch + 1。初始记录来自 2026-11-04 官方 CLI 的 `1.0.0` 上传回执（见分享生产上传记录），不表示已审核或正式上线。连续成功上传依次为 `1.0.1`、`1.0.2`；正式版是否上线不影响编号。`1.0.9` 后为 `1.0.10`。独立的 `versionCode` 从100按成功上传次数加1，不从版本字符串拼接。

用户明确指定展示版本号时，可用`--version <x.y.z>`覆盖默认候选版本，包括复用或降低展示版本号；内部versionCode仍按最近成功记录加1。默认命令继续自动递增。2026-11-09用户明确要求在1.0.2之后上传静音修复为1.0.1，对应内部versionCode为103，不回写或删除此前成功历史。

## 测试环境一键上传

```sh
pnpm release:mp-weixin:test
```

依次执行独立测试打包、测试OSS同步及公网验证、官方CLI上传开发版本。构建或资源失败时不上传微信；不会切换体验版、提交审核或正式发布。测试版本按北京时间自动生成，例如 `1.5.0-test.20261104.180000`；不修改源码清单、生产版本记录或提交Git，允许从当前工作区构建。先在test分支完成需要包含的源码变更，再运行此命令。

输出、清单副本、上传日志和JSON回执保留在 `dist/test-release/<任务ID>/`。结果不明确时会停止且不自动重试，应先根据此目录中的版本、日志和回执核对微信后台。测试命令不提供生产恢复选项。只打包并同步测试图片而不上传微信时，继续使用 `pnpm build:mp-weixin:test`。

测试与生产均需要微信开发者工具已登录并开启服务端口，CLI路径配置见下文。首次本地验证使用模拟CLI；后续真实官方CLI测试上传已成功，见[发布记录](../verification/asset-version-test-release-20261104.md)。

## 生产环境使用

先完成代码合并、提交及同步，使本地 `release` 的 HEAD 与 `origin/release` 完全一致，工作区没有未提交或未跟踪的源码。工具只检查，不自动切分支、拉取、合并或丢弃改动。多台电脑按顺序发布，切换电脑前确保上一次记录已同步。

微信开发者工具须已登录并开启服务端口；Mac 默认路径为 `/Applications/wechatwebdevtools.app/Contents/MacOS/cli`。其他安装位置或 Windows 通过私有环境变量 `WECHAT_DEVTOOLS_CLI` 指定官方 CLI（支持 `.bat` / `.cmd`）。不要把本机路径、账号或密钥写入版本化配置。Windows 批处理路径不能含双引号、百分号、感叹号、脱字符、&、管道或重定向字符；必要时换到普通安装路径。本轮实际验证平台为 Mac，Windows 分支未做实机验证。

```sh
# 查询下一版本并只读检查生产分类，不写文件、不构建、不上传
pnpm release:mp-weixin --dry-run

# 以候选版本构建并校验，不上传、不推进记录
pnpm release:mp-weixin --build-only

# 构建、校验、上传，随后自动提交并推送版本记录
pnpm release:mp-weixin

# 仅在用户明确指定时使用该版本，内部versionCode继续递增
pnpm release:mp-weixin --version 1.0.1
```

每次最多接受一个模式选项；`--version`可与`--dry-run`或`--build-only`组合，不能重复传入或与恢复命令组合。恢复始终使用原日志保存的候选版本。普通 `build:mp-weixin` 等命令不改变行为。新命令隔离输出到 `dist/release/mp-weixin`，源文件版本不在构建阶段修改；构建清单副本和版本说明位于 `dist/release/input/manifest.json`、`dist/release/build-info.json`。生产 API、静态域名、Mock 和本地登录模式由发布构建明确指定，忽略终端注入的测试配置。

正式 `release:mp-weixin` 在微信上传前自动同步生产OSS及现有静态域名，失败即停止；`--build-only`、`--dry-run` 和恢复模式均不触发资源上传。测试打包 `build:mp-weixin:test` 同步测试OSS。新增资源规范和私有配置见[资源发布说明](asset-publish.md)。

### 生产词汇分类检查

正式上传在构建前，以及生产资源同步完成、微信上传前，各只读检查一次 `https://api.juyayingyu.com` 的图解与精读列表；`--dry-run` 同样检查一次。接口固定使用匿名 `scope=published&page=1&limit=1`，不携带账号 Cookie 或 Token，不读取个人待学状态。每个请求最长 10 秒，拒绝重定向。

两类均须返回 HTTP 200、明确的 `content_types_ready=true` 和有效的分类发布总数；两类总数之和须与全部已发布数量一致，首条内容必须属于请求分类。正常空分类允许通过；未就绪、字段缺失、数量不一致、网络失败或无效响应均停止。构建前失败不构建或同步 OSS；上传前复查失败不上传微信、不创建待确认上传记录、不推进版本，已成功同步的资源保留以供修复后重试。

失败提示要求核对生产历史分类和启用状态。发布命令不会自动归类、启用开关或修改内容。首次引入分类的上线顺序是：完成兼容迁移与管理 API/后台部署，在生产后台核对历史发布内容并启用，再发布小程序 API 与小程序包。仅 `--build-only` 保持离线构建；`--resume`、`--confirm-uploaded`、`--confirm-not-uploaded` 继续只处理原上传日志，避免当前业务状态妨碍已成功上传记录的恢复。测试上传流程保持原行为。

生产构建固定启用远程字体，复用生产静态域名的四个既有 WOFF；字体加载前或失败时使用系统字体，不阻塞启动。字体及资源减包记录见[本地验证](../verification/package-optimization-20261104.md)。

官方上传成功并收到有效 JSON 回执后，更新 `release/wechat-version.json` 和 `src/manifest.json`，只提交这两个文件，提交标题为 `chore(release): 记录小程序<版本>上传成功`，再推送 `HEAD:refs/heads/release`。推送地址必须与读取的 origin 地址一致。**执行普通发布命令即包含自动 Git 提交及推送。** 工具不切换体验版、不提交审核、不正式发布。

## 异常恢复

- 构建失败或官方 CLI 无法启动（文件缺失、无执行权限）：不推进记录，修复后重新执行。
- CLI 非零退出、超时、回执缺失或损坏：可能已上传，不能仅凭退出码判定未成功；保留待核对状态，新的上传及构建命令会拒绝执行。在微信后台核对版本和上传时间、备注后，选择下面对应命令。
- 微信成功但 Git 提交或推送失败：保留本地新版本和恢复日志，修复 Git 用户身份、钩子或网络后使用 `--resume`，不会再次上传。

```sh
# 已确认成功，补保存/提交/推送记录；不构建、不上传
pnpm release:mp-weixin --resume

# 仅用于结果不明确且人工核对“确实上传成功”后
pnpm release:mp-weixin --confirm-uploaded

# 仅用于结果不明确且人工核对“确实没有上传成功”后
# 清除待核对记录，下次仍使用原候选版本
pnpm release:mp-weixin --confirm-not-uploaded
```

恢复需要回到原源码提交或工具已经创建的精确版本提交；不得夹带其他源码或清单改动。远程已出现其他提交时会拒绝自动推送，需先核对日志和版本记录再人工协调，禁止通过强推覆盖远程。

上传日志和官方包体回执在 `dist/release/upload.log`、`dist/release/upload-info.json`。共享恢复日志为 `$(git rev-parse --git-common-dir)/juya-wechat-release.json`，已同步回执归档在同目录的 `juya-wechat-receipts/`；这些文件不进入 Git，跨电脑依据已推送的成功版本记录接续。

共享锁目录为 `$(git rev-parse --git-common-dir)/juya-wechat-release.lock`。正常退出自动释放；进程被强行终止后，先确认本仓库所有发布进程均已结束，再只删除这个锁目录，保留恢复日志。锁仅覆盖本机共享仓库，不支持两台电脑同时发布。

如果绕过命令手动上传，下一次执行前核对微信后台，将成功版本、versionCode、源码提交补入仓库记录，提交并同步 `release`；不要依据审核中版本或 `test` 的 `1.5.0` 版本清单覆盖生产记录。
