# 句芽英语小程序

基于 Vue 3、TypeScript、Vite 和 uni-app 的微信小程序工程。

当前 `main` 分支实现 V1.3 用户端：首页、学习目录、场景正文、点读与音频、词汇/语块、逐句跟读、收藏复习、学习历史、个人档案、联系资料、学习权益、站内消息、问题反馈、数据清理和账号注销。

## 环境要求

- Node.js 22.22.0
- pnpm 11.22.0

## 常用命令

```bash
pnpm install
pnpm dev:mp-weixin
pnpm dev:h5
pnpm check
pnpm test
pnpm build:h5
pnpm build:mp-weixin
```

## 运行配置

- `VITE_API_BASE_URL`：用户端 API 地址。
- `VITE_CLIENT_VERSION`：请求头中的客户端版本，默认 `1.3.0`。
- `VITE_USE_MOCK_API=true`：仅在本地开发或视觉验收时显式启用契约 mock；生产构建不要开启。

本地微信开发者工具调试默认读取 `.env.development`，连接小程序 API `http://127.0.0.1:8001`。管理后台 API 使用 `8000`，不包含 `/api/v1/home`。在微信开发者工具中开启“不校验合法域名”；真机调试需把地址改为电脑局域网地址并保留小程序 API 端口。

H5 开发时，浏览器通过 Vite 的同源 `/api/v1` 代理访问 `VITE_API_BASE_URL`，避免直接跨域请求。修改 `.env.development` 后需重启开发服务。生产构建和微信小程序直接使用配置的 API 地址。未登录直接访问真实首页接口返回 `401 ACCESS_TOKEN_REQUIRED`，这是认证要求。

需要独立的本地契约样例服务时，可在 `juya-miniapp-api` 中设置 `$env:PORT = '8002'` 后执行 `./scripts/start-local.ps1`，同时把本工程 `VITE_API_BASE_URL` 改为 `http://127.0.0.1:8002`。这样可与管理后台和真实小程序 API 同时运行。该样例模式不读取真实业务数据。

所有 API 调用通过 `src/services/runtime.ts` 创建的共享服务进入统一请求层。页面不直接维护授权、权益、反馈或注销等服务端事实。

## 验收

- `pnpm check`：格式、脚本、样式与 TypeScript 门禁。
- `pnpm test`：领域单测及学习、权益、反馈、账号冒烟链路。
- `pnpm build:mp-weixin`：生成 `dist/build/mp-weixin` 微信小程序产物。
- `pnpm build:h5`：生成本地视觉验收产物；`tests/visual/visual-cases.ts` 固定 375×812、390×844、768×1024 三组视口和关键页面清单。

微信开发者工具导入 `dist/build/mp-weixin` 后可做真机预览。需要 CLI 自动化时，请先在开发者工具的“设置 → 安全设置”中手动开启服务端口。
