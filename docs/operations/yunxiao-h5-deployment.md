# 云效 H5 测试网站发布

此流水线发布用户端 H5，域名为 `https://test-h5.juyayingyu.com/`。微信小程序代码上传是另一条流程。

## 从 juya-admin 复制后需要修改的配置

| 位置               | H5 测试流水线配置                                                               |
| ------------------ | ------------------------------------------------------------------------------- |
| 流水线源           | `zhanjiangmrlu/juya-miniapp`，分支固定 `test`                                   |
| 触发设置           | 保留手动运行；不要添加生产分支触发                                              |
| 工作目录           | 当前小程序源的代码目录，不能保留 `juya-admin` 源别名                            |
| Node 环境          | Node `22.22.x`、pnpm `11.22.0`，与 package.json 一致                            |
| 执行命令           | `sh deploy/ci-build-h5.sh`，Shell 选择 bash                                     |
| 构建物名称         | `juya-miniapp-h5`                                                               |
| 构建物版本         | `${BUILD_NUMBER}`                                                               |
| 构建物打包路径     | 第一项 `dist/build/h5/`，第二项 `deploy/`                                       |
| 构建物目录选项     | 勾选「制品中包含打包路径的目录」并核对下文结构                                  |
| OSS 上传（若保留） | 只上传 `dist/build/h5/`，目标使用独立的 `juya-miniapp-h5/` 前缀，不覆盖后台目录 |
| 主机组             | 原测试 ECS 主机组                                                               |
| 部署时下载制品     | 改为本流水线的 `juya-miniapp-h5`                                                |
| 制品下载路径       | `/home/admin/app/juya-miniapp-h5-package.tgz`                                   |
| 执行用户           | `root`                                                                          |
| 部署脚本           | 用 `deploy/yunxiao-entry.sh` 全部内容替换后台入口                               |

构建任务若仍叫「Node.js 构建上传 oss」，可改名为「H5 构建与制品上传」。JavaScript 扫描可以保留，但检查其工作目录和规则是否仍指向后台。扫描、检查、测试或构建失败时应阻断后续上传与部署，不启用忽略失败。

构建物上传与 OSS 上传是两个步骤。ECS 部署消费构建物；只做 OSS 上传不能提供主机部署所需的压缩包。OSS 不参与当前网站的静态文件读取，可以去掉该可选步骤；保留时不要继承后台的发布前缀。

## 构建环境

构建脚本执行 `pnpm check`、`pnpm test`、`pnpm build:h5`，并检查入口和 assets。不能继续使用 `pnpm run build`：当前仓库的默认 build 生成微信小程序。

脚本明确设置如下进程变量，不读取本机被 Git 忽略的 `.env.production.local` 作为云端配置，也不改写本机环境文件：

```sh
VITE_API_BASE_URL=https://test-h5.juyayingyu.com
VITE_USE_MOCK_API=false
VITE_LOCAL_DEV_MODE=false
VITE_ANALYTICS_ENABLED=false
UNI_OUTPUT_DIR=dist/build/h5
```

H5 API 使用同域 `/api/`，由下文 Nginx 转发到小程序后端；不能继承管理后台 API 地址，不能使用访问者电脑的 `127.0.0.1`。检查云效变量和缓存中复制过来的 `VITE_*`、`UNI_*`、后台制品名及 OSS 前缀，移除不适用的值。Node/pnpm 下载缓存可以沿用，`node_modules` 缓存应按小程序 lockfile 区分，构建产物缓存不能跨项目复用。

制品解压后必须包含以下完整路径，不能把 H5 与微信产物一起作为网站根目录：

```text
dist/build/h5/index.html
dist/build/h5/assets/...
deploy/ecs-web-deploy.sh
deploy/yunxiao-entry.sh
```

云效的「制品中包含打包路径的目录」选项会保留完整打包路径，见 [官方 Node.js 构建说明](https://help.aliyun.com/zh/yunxiao/user-guide/node-js-test-build)。首次运行仍应下载制品并用 `tar -tzf` 核对，避免误选其他目录。

## 主机部署输入框

复制以下入口，长度低于 2000 字符。完整脚本随制品发布，不需要另外上传 ECS：

```sh
#!/bin/sh
set -eu
work=$(mktemp -d /tmp/juya-miniapp-h5-deploy.XXXXXX)
trap 'rm -rf "$work"' EXIT
tar --no-same-owner --no-same-permissions -xzf /home/admin/app/juya-miniapp-h5-package.tgz \
  -C "$work" deploy/ecs-web-deploy.sh
sh "$work/deploy/ecs-web-deploy.sh"
```

发布脚本只切换 `/opt/juya/juya-miniapp-h5`，使用独立锁、版本目录、备份目录和制品下载路径，不修改管理后台网站、数据库或后端容器。校验 HTTPS 首页与入口 JavaScript 的字节内容，失败则恢复旧 H5 路径并返回非零退出码。后端尚未部署时允许单独发布 H5 静态页面，`DEPLOY_OK` 不代表 API、登录或业务验收通过。

## 首次发布前：替换 H5 域名占位页

2026-10-12 公网实际检查，H5 返回「测试 H5 尚未部署」的 503，小程序 API `/health/ready` 返回 `not_deployed` 的 503。

服务器现有 `/etc/nginx/conf.d/juya-test-domains.conf` 中，`test-h5.juyayingyu.com` 的 HTTPS server 仍返回占位 HTML。备份这个文件，仅用 `deploy/nginx/juya-miniapp-test.conf` 的 server 块替换其中 H5 的 server 块，保留其他域名、HTTP 跳转、TLS 配置。不要把新块与原占位块同时加载。先确认 `127.0.0.1:8001` 是小程序后端计划监听的地址；若服务器实际端口不同，修改代理地址。

```sh
sudo cp -a /etc/nginx/conf.d/juya-test-domains.conf \
  /etc/nginx/conf.d/juya-test-domains.conf.backup-$(date +%Y%m%d%H%M%S)
# 编辑上述文件，仅替换 test-h5 的 HTTPS server 块
sudo nginx -t
# 仅在 nginx -t 成功后执行
sudo systemctl reload nginx
```

这一步尚未在服务器执行。继续保留占位页时，发布脚本会校验失败并回滚；流水线不会自动改写共享 Nginx 配置。

## 验证与上线边界

将本次脚本提交到流水线读取的 `test` 分支并推送后，保存流水线，再手动运行。未经推送的本地脚本无法被云效获取。

本地发布与回滚模拟：

```sh
sh tests/deploy/ecs-web-deploy.spec.sh
```

云端成功日志包含 `DEPLOY_OK service=juya-miniapp-h5`。随后从公网检查首页、实际入口 JS，并在手机浏览器打开网站；API 部署后另检查 `https://test-h5.juyayingyu.com/health/ready`、实际请求和登录。

当前代码在生产 H5 包中调用微信登录，开发身份只允许 DEV 构建使用；普通浏览器的真实身份链路需要单独验证。此变更不新增 H5 登录方案，也不把开启 Mock 或本地身份作为部署修复。
