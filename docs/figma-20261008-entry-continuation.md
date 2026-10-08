# 2026-10-08 入口真实 HTTP 续做交接

本组沿用8状态入口分工，main开发；本次交付实际socket HTTP与浏览器证据，并修复真实断网重连后昵称未恢复的问题。开始验证时HEAD为`4b0960d`。先前视觉补修`dfb0dd3`仍沿用，当前源码/公共布局上完成本次验证。

独立H5：`http://127.0.0.1:5395`，开发输出`dist/dev/figma-20261008-entry-real-h5`。使用统筹启动的`http://127.0.0.1:8092` FastAPI隔离本地开发实例，JUYA_LOCAL_DEV_MODE=true、独立内存状态。没有重启8092、5391或其他对话服务，没有修改.env。VITE_USE_MOCK_API=false、VITE_LOCAL_DEV_MODE=true、VITE_API_BASE_URL=http://127.0.0.1:8092均为进程环境变量。

[证据目录](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real) / [实际响应、截图几何与断言](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/entry-real.json) / [可复跑脚本](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/entry-real.cjs)。脚本创建独立Chrome/Playwright context，不使用page.route/context.route，不替换API响应，不写Pinia store。脚本只读取store等待真实请求完成；断网通过context.setOffline模拟浏览器实际网络失败，恢复后仍由真实服务返回成功。脚本不保存令牌、鉴权头、登录响应body或浏览器持久化快照。

## 实际链路与覆盖

| 验证         | 请求与结果                                                                                   | 页面效果                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 直接socket   | Node fetch直接GET 8092 /api/v1/home、learning/modules、learning/catalog均200                 | 目录3个OPEN、1个PREVIEW，authorization_pending=false                                                    |
| H5代理       | 5395请求/api/v1/*返回真实服务响应；catalog封面URL明确为8092/local-dev/resources/coffee-cover | 不是MockTransport；原始封面正常加载                                                                     |
| 正常首页     | session/wechat、me、home、modules/catalog在线均200                                           | “本地小芽”、12天、讨论城堡展览68%、3个开放场景                                                          |
| 首次兼容路由 | /pages/home/first-visit读取真实目录trial_sentence                                            | What do you think of the castle exhibit?，只读浏览未发scenes/open                                       |
| 今日任务     | home目标scene-castle与目录同ID、进度68                                                       | 正常时学习与跟读可用；没有点击进入场景，以免写其他组场景进度                                            |
| 学习目录     | GET modules/catalog 200                                                                      | 讨论城堡展览/点早餐/在咖啡店3个OPEN，以开放目录布局呈现                                                 |
| PREVIEW      | 当前探索页周末公路旅行卡点击及关闭                                                           | 保留探索URL、没有新API请求或正文请求；profile_completion_enabled=true所以显示次级资料入口，不点击该入口 |
| 网络失败     | 在线加载首页与任务页后断网，回首页及进入已加载任务页触发真实GET失败                          | ERR_INTERNET_DISCONNECTED；不再显示可执行旧任务，学习/跟读disabled=true                                 |
| 关闭提示     | offline今日任务页关闭公共弹窗                                                                | 保留#/pages/home/today-task，不伪造恢复                                                                 |
| 仍断网重连   | offline首页点击“重新连接”，POST session/wechat失败                                           | 错误提示继续显示                                                                                        |
| 恢复网络重连 | 在线后点击“重新连接”，POST session/wechat 200；GET modules、home、catalog、me 200            | 任务、目录和昵称恢复、错误消失                                                                          |

修复后浏览器实际记录81条200 API响应；另外19次请求失败记录在failures，全部为主动断网导致。响应body收集若遇到reload取消旧页面响应则标记bodyUnavailable，保留真实method/path/status；不补造body。直接socket完整安全home/catalog/modules响应另存socket字段，最终成功页面的数据来自当前服务。

本次未请求任何/api/v1/scenes/*，没有完成/进度/收藏/反馈/资料等跨组写操作。没有读取个人组反馈/联系资料/权益数据；应用正常启动及本次重连补修的GET /me作为入口昵称数据。底栏与次级资料入口只验证呈现，不操作其他组业务。

## 本轮21张截图

18张：下列6个实际页面/提示覆盖375×812、390×844、768×1024。另3张390网络失败与恢复。所有截图检查无横向溢出，uni-image背景实际加载完成。

| 页面/状态      | 375×812                                                                                                                            | 390×844                                                                                                                            | 768×1024                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 真实首页       | [375](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/home-375.png)        | [390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/home-390.png)        | [768](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/home-768.png)        |
| 首次兼容入口   | [375](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/first-route-375.png) | [390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/first-route-390.png) | [768](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/first-route-768.png) |
| 今日任务       | [375](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/today-375.png)       | [390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/today-390.png)       | [768](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/today-768.png)       |
| 开放目录       | [375](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/learning-375.png)    | [390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/learning-390.png)    | [768](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/learning-768.png)    |
| 探索PREVIEW    | [375](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/explore-375.png)     | [390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/explore-390.png)     | [768](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/explore-768.png)     |
| 当前页权限提示 | [375](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/no-access-375.png)   | [390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/no-access-390.png)   | [768](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/no-access-768.png)   |

[断网今日任务](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/offline-today-390.png)、[断网首页](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/offline-home-390.png)、[恢复首页](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/recovered-home-390.png)。网络步骤先在线加载对应代码，随后使用真实uni.navigateTo/navigateBack触发既有页面生命周期；早期直接离线打开未加载模块导致按需JS加载失败，因此该过程不计为API降级通过证据。

## 已修复：重连恢复任务但没有恢复昵称

P2。复现为：在线首页显示“本地小芽”→浏览器断网→首页错误→断网点击重连，登录请求失败→恢复在线点击重连，session/home/modules/catalog均200且恢复68%任务→问候却变为“学习者”。[修复前响应记录](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/entry-real-before-fix.json)和[坏昵称截图](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/recovered-home-profile-missing-390.png)已保留。

原因：services/startup.ts的createSessionBootstrap在失败时调用session.clear，清空profile；之后成功只saveTokens。App.vue仅onLaunch读取/me。入口useHomePage.load重连后原本仅加载首页和目录，当前页面没有重新启动onLaunch，因此未再次GET /me。

统筹确认共享清空资料语义继续沿用，并授权本组在独占use-home-page.ts补修：身份建立成功后，资料缺失或主动重连时并行调用runtime.profile.get；写回同时校验本页generation与当前accessToken。离页、同页新请求或会话切换后，旧资料不能写回；资料失败沿用可选资料降级，不改变首页或目录的错误处理。没有修改共享startup/session/store/App，也没有改变页面API或导航流程。

use-home-page.spec.ts新增6项回归，修改前6失败/9通过，修复后15项全部通过：重连恢复昵称、普通缓存不重复读/强制重连刷新、离页拒绝迟到资料、令牌切换拒绝旧资料、同页新请求防止旧资料覆盖、可选资料失败不生成首页错误。真实脚本修复后重新生成21截图，重连session/modules/home/catalog/me均200，问候恢复“早上好，本地小芽”，脚本明确断言恢复前后问候一致。此缺陷已在本地真实HTTP范围关闭。

## 实际检查与复跑

- `node C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3a83-7dd0-b89e-f9a070f5ecfc/entry/real/entry-real.cjs`：exit0，21截图、3直接socket接口200，PREVIEW关闭三尺寸无新请求，离线任务双禁用，仍断网重连维持失败，在线重连5接口200并恢复昵称，无scenes请求
- `pnpm exec vitest run src/features/home src/features/learning`：修复后重跑exit0，10文件48项通过；前缀会包含既有learning-progress/result测试
- 所属home/learning目录Prettier、ESLint、Stylelint及git diff --check：exit0；仅格式化和lint修复本组两个TS文件及本交接
- 非mock独立H5/微信构建分别输出dist/build/figma-20261008-entry-real-h5和dist/build/figma-20261008-entry-real-mp-weixin；均exit0，DONE Build complete，不计为真机验收。全仓最终检查/构建由统筹完成

启动H5：在仓库PowerShell执行 `$env:VITE_API_BASE_URL='http://127.0.0.1:8092'; $env:VITE_USE_MOCK_API='false'; $env:VITE_LOCAL_DEV_MODE='true'; $env:UNI_OUTPUT_DIR='dist/dev/figma-20261008-entry-real-h5'; pnpm dev:h5 --host 127.0.0.1 --port 5395 --strictPort`。8092应由统筹保持可用，另终端运行上面的node命令。

提交只包含use-home-page.ts、use-home-page.spec.ts和此文档，使用Local\\JuyaFigma20261008GitCommit mutex及精确git add；其他对话的未提交变更不触碰。

## 未覆盖边界

当前服务只提供OPEN/PREVIEW与CONTINUE_SCENE，本次没有FORMAL权益目录、authorization_pending真实服务状态、NEW_SCENE自动首次、收藏复习任务服务数据；不通过浏览器拦截或store注入补造这些状态。前次fixture设计覆盖仍见figma-20261008-entry.md，但不能当作本轮真实HTTP覆盖。

8092是本地开发样本经socket响应，登录接口跳过真实code2session，内容和用户来自隔离内存样本；它不证明正式微信、数据库/admin内容发布、真实账号/权益、OSS或生产链路。服务给不同场景返回相同演示封面，不认作正式内容素材验收。当前三尺寸浏览器可用不替代微信真机、录音、正式试听或非零安全区验收。
