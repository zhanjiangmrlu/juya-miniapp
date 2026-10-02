# 个人模块并行复查与必要修复

日期：2026-10-02。仓库 `D:\个人\juya\juya-miniapp`，从 main 的 `2c0b6b6` 继续。实现提交：`63e3b50 fix(个人): 修复页面退出竞态与翻卡发音`。提交使用 `Local\JuyaV13ParallelGitCommit` 互斥锁，锁内先检查索引为空，再核对仅包含本人 15 个代码和测试文件；没有暂存其他对话变更。没有建立分支或 worktree，没有推送或部署。

## 复查依据和范围

已读取 AGENTS.md、中央画板台账、集成验收记录、个人交付记录及协作说明，并核对完整需求第 8—12 节和小程序技术方案的收藏、联系、反馈、隐私与注销部分。范围为 favorites/profile/entitlement/feedback/account 页面及其个人领域模块、favorites 和 feedback-draft store；不修改共享组件、样式、布局、services、契约、pages.json、tests/visual 或跨仓库接口。

本轮经 figma-design-to-code 技能读取当前 Figma 的 M21 `2480:353`、M22 `2480:407`、M42 `2480:1442`、M47 `2480:1715` 的设计上下文和截图；其余状态使用已有个人交付映射、源代码及新截图复查。未把 Figma 示例词条、数量、日期写成业务常量。

| 状态范围 | 核查内容与证据                                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M19—M25  | 全游标分页与去重、两银行独立筛选/滚动、全部来源和最新权限、稳定原句定位、完整翻卡队列、固定创建/完成幂等键、历史只读摘要；收藏相关单测、返回页面的实际浏览器导航及三个尺寸截图 |
| M27—M31  | 本人资料、主动用途授权、更正请求合并 reason、服务端资格与真实曝光、hide/unload 迟到保护；联系表单/提示单测及用途确认、更正 fixture 交互                                        |
| M32—M37  | 正式权益生效/到期、限时状态投影、固定 scene_ids、server_now、旧状态路由刷新、活动 achievements；现有权益单测、目录与权益真实 HTTP、三个尺寸截图                                |
| M38—M43  | 消息全分页、反馈来源、300 字/单图约束、上传失败草稿、同记录补充截图、7 天/一次重开；现有单测、补充/重开 fixture 交互与实际 H5 图片选择                                         |
| M44—M47  | 清空失败保留缓存、注销摘要、冷启动状态与撤回刷新、服务端倒计时、退出清理；账号单测、撤回 fixture 交互与长权益列表截图                                                          |

M26 不属于这 28 个个人状态。

## 已复现并修复的缺陷

| 缺陷                          | 复现、原因与修复                                                                                                                                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 清空后旧收藏响应回填缓存      | 在 favorites.load 等待期间 clear，再释放旧列表响应，旧 items 被恢复；旧 finally 还会结束清空后新请求的 loading。store 增加请求代次，清空使旧代次失效，旧结果和旧 finally 都不能更新当前状态                |
| 收藏详情/来源返回后保留旧权限 | 首次进入有权限的详情/来源，进入其他页后撤权，再返回；原 onLoad-only 不刷新。新增个人范围 useFavoriteGroup，在每次 onShow 读取完整聚合收藏，刷新中/失败移除旧入口，hide/unload 使迟到结果失效               |
| 银行离页后滚动新页面          | 银行列表请求期间进入其他页面或销毁银行，旧响应仍调用全局 pageScrollTo。增加可见性和代次校验，hide/unload 共用清理，旧请求不能滚动当前新页                                                                  |
| 撤回后旧注销响应恢复 PENDING  | 刷新等待页期间完成撤回，再释放旧 /me 响应，旧响应恢复待注销缓存并启动计时器。撤回受理后使旧刷新失效；hide/unload 清理计时器和请求代次                                                                      |
| 档案销毁后误记联系曝光        | 资料请求期间卸载档案，原仅 onHide 保护，返回响应仍写曝光标记和曝光 API。复用 onUnload(hide)，未展示提示不消耗机会                                                                                          |
| 翻卡答案英文点击错误翻面      | 需求 8.3 要求答案英文播放独立发音，原英文点击冒泡翻面。背面有音频时播放、正面仍翻面；英文点击停止冒泡。实际 H5 进一步发现 card-surface 的按钮伪元素截获点击，局部设置其 pointer-events 为 none，保留原样式 |

测试先复现对应失败，再修复通过。新增或扩展 18 个测试，覆盖收藏缓存、权限刷新失败、hide/unload、撤回竞态和英文发音；其中清空失败缓存保留与翻卡已有行为是本轮补查通过的回归保护，不记为原有缺陷。

只读子审查发现并复现 unload-only 缺口，修复后复核未发现新的 P1/P2。独立内存检查确认卸载后的迟到响应产生 0 次滚动、0 次 PENDING 写入、0 个计时器。审查没有修改文件、提交或启动服务。

## 本轮实际验证

| 验证                                           | 结果                                                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| pnpm check                                     | 全仓 Prettier、ESLint、stylelint、vue-tsc 通过                                                               |
| pnpm test                                      | 本轮最新全仓快照：64 文件、212 项通过，包含其他并行对话的新测试                                              |
| 本人范围格式/ESLint/stylelint + 全仓 typecheck | 通过                                                                                                         |
| pnpm build:h5                                  | 通过；独立 `dist/personal-followup-production-h5`                                                            |
| pnpm build:mp-weixin                           | 通过；独立 `dist/personal-followup-production-mp`                                                            |
| 28 状态 × 375×812 / 390×844 / 768×1024         | 84 张新截图；无横向溢出、页面脚本异常、空白图片；滚动到底后动作按钮完整可达                                  |
| M22/M24/M32/M46 极长内容 × 三尺寸              | 12 张新截图及滚动截图；18 个长来源、24 个长权益行；按钮完整可达                                              |
| 既有业务 fixture 交互                          | 13 项通过，包含队列翻面、完成失败幂等重试、主动同意、reason 更正、原记录补充、一次重开与撤回刷新             |
| 撤权后实际页面返回导航                         | 5 项通过；从银行实际点击进入详情，来源页返回后变为仅摘要，详情返回后不能沿旧入口直达正文                     |
| 答案英文发音请求                               | 3 项通过；请求当前修订资源、签名失败仍保持背面、再次点击可重试；未使用强制点击或直接事件派发绕过实际点击命中 |
| 非 mock 8091 HTTP / 实际文件选择               | 9 项通过；真实读取收藏列表/详情、档案、联系、首页、权益、目录和消息，H5 PNG 选择、预览、删除通过             |
| git diff --check                               | 通过                                                                                                         |

并行期间曾有全仓暂态失败：其他对话的格式/导入顺序检查、首页 prop 默认值警告，以及跟读页 3 项迟到请求回归失败。后续各负责对话修正后，本轮全仓检查和测试重新通过；没有修改或暂存这些文件。

实际执行命令如下，均在小程序仓库运行：

```powershell
pnpm exec vitest run src/features/favorites/favorites.spec.ts src/features/favorites/favorite-pages.spec.ts
pnpm exec vitest run src/features/favorites/favorite-bank.spec.ts src/features/account/deletion-page.spec.ts
pnpm exec vitest run src/features/favorites/review-card.spec.ts src/features/profile/profile-dashboard.spec.ts src/features/account/clear-page.spec.ts
pnpm check
pnpm test

$env:VITE_API_BASE_URL = 'http://127.0.0.1:8091'
$env:VITE_USE_MOCK_API = 'false'
$env:VITE_LOCAL_DEV_MODE = 'true'
$env:UNI_OUTPUT_DIR = 'dist/dev/personal-followup-h5'
pnpm exec uni -p h5 --port 5193 --config dist/personal-followup-vite.config.ts
pnpm exec agent-browser --session personal-followup open http://127.0.0.1:5193
pnpm exec agent-browser --session personal-followup snapshot -i

node dist/personal-followup-visual.cjs
$env:PERSONAL_FLOW = 'true'
node dist/personal-followup-visual.cjs
node dist/personal-followup-lifecycle.cjs
node dist/personal-followup-audio.cjs
node dist/personal-followup-live.cjs
node dist/personal-followup-long.cjs

$env:UNI_OUTPUT_DIR = 'dist/personal-followup-production-h5'
pnpm build:h5
$env:UNI_OUTPUT_DIR = 'dist/personal-followup-production-mp'
pnpm build:mp-weixin
git diff --check
```

三个截图脚本分别由本次独立 headless Chrome 启动，不接入其他对话的浏览器；agent-browser 使用 `personal-followup` 独立会话。长内容脚本需在新 shell 运行或先移除 `PERSONAL_FLOW`，默认 false 才执行截图矩阵。本轮使用的临时 Vite 配置位于忽略的 dist，仅显式投影进程 API 地址；没有改写任何正式或开发环境文件。

## 稳定截图与报告

本轮证据根目录：[personal-followup](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-0ada-7e80-9850-ffb327f015c1/personal-followup)。包含 report.json、flows.json、lifecycle.json、review-word-audio.json、live.json 和可重跑脚本副本；真实读取报告只记路径与状态，没有保存 token、上传凭证或浏览器认证状态。

代表截图：[收藏详情 390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-0ada-7e80-9850-ffb327f015c1/personal-followup/M21-390.png)、[撤权来源 390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-0ada-7e80-9850-ffb327f015c1/personal-followup/lifecycle-sources-revoked-390.png)、[反馈结果 390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-0ada-7e80-9850-ffb327f015c1/personal-followup/M42-390.png)、[注销期 390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-0ada-7e80-9850-ffb327f015c1/personal-followup/M47-390.png)。

长内容报告：[personal-long/report.json](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-0ada-7e80-9850-ffb327f015c1/personal-long/report.json)。代表滚动截图：[翻卡长来源 768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-0ada-7e80-9850-ffb327f015c1/personal-long/M24-768-scrolled.png)、[注销长权益 768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-0ada-7e80-9850-ffb327f015c1/personal-long/M46-768-scrolled.png)。

## 统筹集成与环境边界

本轮未发现需要改共享契约或跨仓库接口才能关闭的新增缺陷。中央台账与集成文档仍由统筹更新；可将本复查提交及稳定证据链接纳入最终集成结果。其他对话的未提交文件保持原样。

新截图及写操作断言由隔离浏览器 fixture 提供数据，只证明页面布局、状态、载荷和交互；非 mock 8091 是实际开发 API 读取，不代表生产鉴权或数据写入。发音浏览器检查故意令签名失败，只证明点击命中、资源请求和失败重试，不代表可听音频验收。本轮未运行微信开发者工具或真机，未进行真实 OSS 上传、正式音频试听、录音或真实七天注销期验证。既有集成记录的工具结果没有冒充本轮新验收。
