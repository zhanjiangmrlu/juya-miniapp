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

所有 API 调用通过 `src/services/runtime.ts` 创建的共享服务进入统一请求层。页面不直接维护授权、权益、反馈或注销等服务端事实。

## 验收

- `pnpm check`：格式、脚本、样式与 TypeScript 门禁。
- `pnpm test`：领域单测及学习、权益、反馈、账号冒烟链路。
- `pnpm build:mp-weixin`：生成 `dist/build/mp-weixin` 微信小程序产物。
- `pnpm build:h5`：生成本地视觉验收产物；`tests/visual/visual-cases.ts` 固定 375×812、390×844、768×1024 三组视口和关键页面清单。

微信开发者工具导入 `dist/build/mp-weixin` 后可做真机预览。需要 CLI 自动化时，请先在开发者工具的“设置 → 安全设置”中手动开启服务端口。
