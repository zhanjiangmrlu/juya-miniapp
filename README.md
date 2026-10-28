# 句芽英语小程序

基于 Vue 3、TypeScript、Vite 和 uni-app 的微信小程序工程。

当前工作区按 V1.5 整合04增补02、修订17实现：首页／学习记录／账号三Tab，场景学习＋主题听读双模块，双类收藏和已学成绩、共用打卡。场景授权、主动微信登录、分享、反馈入口保留。本轮提交推送远程`test`用于MacBook接续，仍只使用本地数据库，未部署；先读[交接入口](HANDOFF.md)。

## 环境要求

- Node.js 22.22.0
- pnpm 11.25.0

## 常用命令

```bash
pnpm install
pnpm dev:mp-weixin
pnpm dev:h5
pnpm check
pnpm test
pnpm build:h5
pnpm build:mp-weixin
pnpm build:mp-weixin:test
pnpm build:mp-weixin:local
```

## 运行配置

实际请求经 `src/services/api.ts` 的会话层及 `src/services/platform.ts` 平台边界访问 `/api/mini/v1`；听读新增 `/api/mini/v1/listening`。本轮本地小程序API为 `http://127.0.0.1:8002`，管理API为8001，业务数据库由后端配置为本地MySQL `juya_local`，不连接测试／生产数据。

H5在私有、已忽略的 `.env.development.local` 中配置后执行 `pnpm dev:h5`：

```dotenv
VITE_API_BASE_URL=
VITE_DEV_API_PROXY_TARGET=http://127.0.0.1:8002
VITE_STATIC_ASSET_BASE_URL=
VITE_REMOTE_FONTS=false
```

H5通过同源 `/api` 代理访问后端，默认端口5174；本地微信开发者工具构建时将 `VITE_API_BASE_URL` 设为 `http://127.0.0.1:8002`。修改环境文件后重启服务。测试／生产模式仍读取对应版本化环境文件；本轮构建须用私有模式覆盖或进程变量明确指定本地API、关闭远程字体和静态素材源，避免把本地产物当成线上部署。

在独立PowerShell终端构建本地开发者工具包，显式覆盖H5的空接口前缀：

```powershell
$env:VITE_API_BASE_URL = 'http://127.0.0.1:8002'
$env:VITE_STATIC_ASSET_BASE_URL = ''
$env:VITE_REMOTE_FONTS = 'false'
pnpm build:mp-weixin:test
```

小程序原生请求不能使用H5的空接口前缀。该地址用于本机开发者工具；真机需另配可访问的局域网或合法HTTPS地址，并重新构建。不要在同一终端随后启动需要空前缀代理的H5服务。

产品登录仍要求用户主动同意后兑换真实微信身份；H5没有新增登录绕过。浏览器联调使用独立context中的本地合成验收账号，仅用于开发验证，不代表真实微信认证。私密会话凭证不得进入仓库、日志或截图。

## 页面与子包

主包三Tab为 `src/pages/{home,records,profile}/index.vue`，自定义底栏通过 `switchTab` 切换。场景列表和我的收藏保留 `src/pages/{learning,favorites}/index.vue` 普通页面，登录为 `src/pages/login/index.vue`。

场景、听读、账号编辑、原记录兼容页及反馈按业务注册普通子包；听读入口／主题／文章为 `src/sub-packages/listening/{index,topic,article}.vue`。原场景详情、分享和反馈路径保留；安全返回目标统一由 `src/services/navigation.ts` 校验，队列结束回场景列表使用清栈语义。

## 类型与常量组织

| 目录                    | 职责                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `src/shared/contracts/` | 按业务存放 API 数据契约                                                            |
| `src/shared/enums/`     | 按业务存放运行时枚举成员及同名联合类型                                             |
| `src/shared/types/`     | 业务结构、服务端口、参数和结果类型；`*-components.ts` 存放同业务的组件 Props/Emits |
| `src/shared/constants/` | 按业务存放固定配置、文案映射、静态列表、存储键和校验阈值                           |

实现代码直接从对应文件导入类型或常量，类型使用 `import type`。旧模块保留必要的再导出用于兼容原路径，不重复声明同一类型或常量。HTTP 异常类和错误判别函数归入 `src/services/errors.ts`。

响应式状态、函数局部变量、用户或设备数据及运行时实例保留在实现文件；组件默认参数保留在调用处。国际化文案继续由 `src/i18n/` 管理，运行时 Mock 数据在 `src/services/mock/` 的独立数据文件中维护，测试样本继续归入 `tests/`。这些目录调整不改变原取值、接口数据或业务规则。

固定取值的业务枚举集中在 `src/shared/enums/`，按业务拆分为账号、联系资料、权益、首页、学习、学习成果、收藏、个人页面、音频、录音、场景模型、学习进度、消息关联和应用启动文件；导航、HTTP 和公共组件展示类型分别放在 `navigation.ts`、`http.ts`、`ui.ts`。

每个枚举使用 `as const` 对象提供运行时值，并派生同名联合类型。业务实现和组件使用普通导入，例如 `import { AudioStatus } from '@/shared/enums/audio'`，状态判断写为 `props.status === AudioStatus.LOADING`；契约接口及纯类型依赖使用 `import type`。原始接口值保持不变，既有字符串值仍与派生类型兼容；状态集合和文案映射在 `shared/constants/` 中引用枚举成员。开放字符串字段仍允许未知后端状态，判别联合保持成员特定的类型与收窄能力；系统事件、工具类型属性键和构建环境开关保持原有结构。测试样本和期望值可保留独立字面量，以验证枚举值与既有契约一致。

派生枚举类型显式交叉 `string` 或 `number`，例如 `(typeof AudioStatus)[keyof typeof AudioStatus] & string`。这不会扩大枚举取值，基础类型提示用于兼容 Vue 3.4 的 Props 推导，保留开发与生产编译的原有运行时校验。

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
- `pnpm build:mp-weixin`：生成连接生产 API 的 `dist/build/mp-weixin` 微信小程序产物。
- `pnpm build:mp-weixin:test`：生成连接测试 API 的 `dist/build/mp-weixin` 微信小程序产物。
- `pnpm build:h5`：生成本地视觉验收产物；`tests/visual/visual-cases.ts` 固定 375×812、390×844、768×1024 三组视口和关键页面清单。

微信开发者工具导入 `dist/build/mp-weixin` 后可做真机预览。需要 CLI 自动化时，请先在开发者工具的“设置 → 安全设置”中手动开启服务端口。

更新 build 包前先关闭该项目窗口，构建完成后再打开，避免热重载在旧产物删除期间读取到缺失的 `app.json`。如果仍请求旧地址或显示空白，在开发者工具中选择“清缓存 → 清除编译缓存”，然后重新编译。不要清除账号登录数据。微信 AppID 由 `src/manifest.json` 的 `mp-weixin.appid` 写入构建包；不要只修改生成的 `project.config.json`，否则下一次构建会覆盖它。
