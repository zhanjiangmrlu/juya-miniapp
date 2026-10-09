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
pnpm build:mp-weixin:local
```

## 运行配置

- `VITE_API_BASE_URL`：用户端 API 地址。
- `VITE_CLIENT_VERSION`：请求头中的客户端版本，默认 `1.3.0`。
- `VITE_USE_MOCK_API=true`：仅在本地开发或视觉验收时显式启用契约 mock；生产构建不要开启。
- `VITE_LOCAL_DEV_MODE=false`：默认关闭；设为 `true` 时，H5 开发模式使用本地登录代码，仍通过 HTTP 访问配置的后端。它不切换为 MockTransport，也不使普通生产构建或微信小程序跳过真实微信登录。

H5 本地登录可在私有 `.env.development.local` 中配置 `VITE_LOCAL_DEV_MODE=true`，同时保持 `VITE_USE_MOCK_API=false`。后端需运行在 `JUYA_ENVIRONMENT=local|test` 并启用 `JUYA_LOCAL_DEV_MODE=true`，例如使用小程序 API 的 `scripts/start-local.ps1`。该后端模式提供本地契约样例，不代表真实微信认证或生产数据验收。完全离线预览则使用 `VITE_USE_MOCK_API=true`，请求由前端 MockTransport 响应。

本地微信开发者工具调试使用 `pnpm dev:mp-weixin`，或执行 `pnpm build:mp-weixin:local` 后导入 `dist/build/mp-weixin`。这两个命令都读取 `.env.development`，连接小程序 API `http://127.0.0.1:8001`。普通 `pnpm build:mp-weixin` 使用生产配置，不读取 `.env.development`。管理后台 API 使用 `8000`，不包含 `/api/v1/home`。在微信开发者工具中开启“不校验合法域名”；真机调试需把地址改为电脑局域网地址并保留小程序 API 端口。

H5 开发时，浏览器通过 Vite 的同源 `/api/v1` 代理访问 `VITE_API_BASE_URL`，避免直接跨域请求。修改 `.env.development` 后需重启开发服务。生产构建和微信小程序直接使用配置的 API 地址。未登录直接访问真实首页接口返回 `401 ACCESS_TOKEN_REQUIRED`，这是认证要求。

需要独立的本地契约样例服务时，可在 `juya-miniapp-api` 中设置 `$env:PORT = '8002'` 后执行 `./scripts/start-local.ps1`，同时把本工程 `VITE_API_BASE_URL` 改为 `http://127.0.0.1:8002`。这样可与管理后台和真实小程序 API 同时运行。该样例模式不读取真实业务数据。

所有 API 调用通过 `src/services/runtime.ts` 创建的共享服务进入统一请求层。页面不直接维护授权、权益、反馈或注销等服务端事实。

## 页面与子包

主包仅保留首页 `src/pages/home/index.vue`，访问地址仍为 `/pages/home/index`。其余 43 个页面统一存放在 `src/sub-packages/` 下，按 home、learning、scene、favorites、profile、entitlement、feedback、account、compat 分为 9 个普通子包。

子包页面地址为 `/sub-packages/<业务>/<页面>`，例如 `/sub-packages/scene/dialogue?sceneId=one`。`pages.json` 的子包 `root` 为 `sub-packages/<业务>`，内部 `pages[].path` 仅填写相对页面路径。公共组件、业务组件、服务、状态和静态资源继续使用现有目录，不启用独立分包或预加载。

底部导航仍使用自定义组件和 `reLaunch`。统一导航入口兼容已知 `/pages/<业务>/<页面>` 旧地址，查询参数及片段原样保留；不注册旧路径占位页，也不改写未知地址。

## 业务枚举类型

固定取值的字符串和数字联合类型集中在 `src/shared/enums/`，按业务拆分为账号、联系资料、权益、首页、学习、学习成果、收藏、个人页面、音频和录音文件；导航、HTTP 和公共组件展示类型分别放在 `navigation.ts`、`http.ts`、`ui.ts`。

契约接口、业务实现、组件和测试通过 `import type` 直接引用对应文件，例如 `import type { AccountDeletionStatus } from '@/shared/enums/account'`。这些类型在编译后被擦除，不改变接口取值或运行时比较。已有模块保留必要的类型再导出以兼容旧导入路径；开放字符串字段、对象判别联合、工具类型属性键和构建环境开关保持原有结构。

## 测试目录

所有自动化测试集中在 `tests/`，文件使用 `.spec.ts` 后缀：

```text
tests/
├── unit/          # 单元及组件测试，镜像 src 的目录结构
├── contracts/     # 页面结构、导航和构建约束
├── integration/   # 共享请求层与 MockTransport 的契约流程
└── visual/        # 页面清单、视口和静态样式约束
```

测试导入源码和 Mock 源码统一使用 `@/`，测试辅助文件之间使用相对导入。开发预览依赖的 Mock 数据及 Transport 保留在 `src/services/mock/`。测试代码与辅助文件均纳入 TypeScript 和 ESLint 检查。

`integration/` 验证共享请求层与 Mock 契约的组合行为，不访问真实后端，也不代表浏览器或真机端到端验收。`visual/` 当前验证页面清单、视口及静态样式约束，不执行截图像素比对；实际视觉验收仍需浏览器或设备检查。

## 验收

- `pnpm check`：格式、脚本、样式与 TypeScript 门禁。
- `pnpm test`：运行 `tests/` 下的单元、组件、结构契约、Mock 流程和静态视觉约束测试。
- `pnpm build:mp-weixin`：生成 `dist/build/mp-weixin` 微信小程序产物。
- `pnpm build:h5`：生成本地视觉验收产物；`tests/visual/visual-cases.ts` 固定 375×812、390×844、768×1024 三组视口和关键页面清单。

微信开发者工具导入 `dist/build/mp-weixin` 后可做真机预览。需要 CLI 自动化时，请先在开发者工具的“设置 → 安全设置”中手动开启服务端口。

更新 build 包前先关闭该项目窗口，构建完成后再打开，避免热重载在旧产物删除期间读取到缺失的 `app.json`。如果仍请求旧地址或显示空白，在开发者工具中选择“清缓存 → 清除编译缓存”，然后重新编译。不要清除账号登录数据。微信 AppID 由 `src/manifest.json` 的 `mp-weixin.appid` 写入构建包；不要只修改生成的 `project.config.json`，否则下一次构建会覆盖它。
