# 首页与学习入口并行复查

日期：2026-10-02。起点：main / `2c0b6b6`。范围为 `src/pages/home`、`src/pages/learning`、`src/features/home`、`src/features/learning`。本范围修复可进入集成；共享首页/目录迟到响应问题仍须统筹修复，不把入口生命周期全部标为通过。

## 依据与检查范围

已读取根 `AGENTS.md`、`figma-restoration-ledger.md`、`figma-integration-acceptance.md`、`figma-entry-delivery.md`、20260930 确认需求第 5、6、24 章及 20261001-V1.3 技术方案。按 Figma design-to-code 技能重新取得下面 8 节点的完整 design context 和截图，未新增或重画素材。

| 状态 | Figma 节点                                                                       | 本轮检查                                          |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| M01  | [2478:5](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2478-5)     | 动态问候、任务目标、后台封面、复习与开放进度      |
| M01S | [2479:14](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-14)   | 当前页关闭、真实登录重连、弹层避让                |
| M02  | [2479:70](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-70)   | NEW_SCENE 首次状态、只读 trial_sentence、动态长句 |
| M03  | [2479:126](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-126) | 服务端目标、权限变化、跟读、完整收藏队列          |
| M05  | [2479:182](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-182) | 当前学习、已有权益、已完成内容、过期后的布局      |
| M05S | [2479:241](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-241) | 新用户开放目录与探索入口                          |
| M06  | [2479:300](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-300) | 安全摘要、去除可访问重复项、未请求正文            |
| M07  | [2479:358](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-358) | 当前探索页提示与关闭、服务端资料开关              |

## 本范围缺陷与修复

1. **已完成状态被当成未学习。** `SceneSummary.progress` 可选；非开放内容到期为 PREVIEW、status=COMPLETED 而缺少百分比时，原 presenter 返回 NEW 并重新铺开开放场景；仍有权益的已完成卡也显示 0%。补两项先失败再通过的回归，以完成状态或 100% 判断完成，保持 ENTITLED 布局、已完成卡显示 100%，并正确计入开放复习摘要。PREVIEW 仍无正文入口。修改 `catalog-presenter.ts` 与 `entry-catalog.spec.ts`。
2. **旧首页任务绕过目录权限。** 首页聚合任务仍指向旧目标、当前目录为 PREVIEW 或 authorization_pending 时，原 `startTask` 仍进入正文路由。先补两项失败回归，再用当前可访问目标确认场景任务，权限待确认时不给出 taskScene；正常首页、首次和今日任务页的对应按钮禁用。收藏翻卡不依赖场景目录，仍使用全部 card_ids。新增可访问目标与完整收藏队列保护用例。浏览器实际验证受限状态下学习和跟读禁用，点击不导航且无场景请求，见 [task-guard-checks.json](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/task-guard-checks.json)。
3. **未开通提示说明与确认需求不一致。** 保持画板结构，将提示改为需求 6.3 的“你仍可以继续学习已开放的场景。”，继续采用主按钮“知道了”和服务端允许的资料次级入口。

没有修改共享组件、样式、布局、services、shared、pages.json、learning-progress、tests/visual 或其他仓库；没有修改正式环境文件，也没有新增图片。

## 真实 API 与浏览器

独立 H5 为 `http://127.0.0.1:5204`，独立 agent-browser 会话 `juya-entry-followup`，开发输出 `dist/dev/entry-followup-h5`。临时且忽略的 `.env.entry-followup` 指向复用的 `http://127.0.0.1:8091`，mock=false、local_dev=true；服务和浏览器由本对话启动，未停止其他对话服务。

- 真实 GET home/catalog 均 200：首页显示“讨论城堡展览”68%，目录返回城堡、早餐、咖啡三个 OPEN 与公路旅行 PREVIEW；当前服务已经返回三个动态 trial_sentence。首次页呈现后台城堡试学句，无需开始学习请求。
- 三尺寸真实页面检查 18 张截图；PREVIEW 点击与关闭始终停留 `#/pages/learning/explore`，无 API 请求，资料入口遵循当前后台 true 开关。见 [live-entry-checks.json](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/live-entry-checks.json)。只导出安全首页/目录响应，没有保存 token、请求鉴权头或浏览器凭据快照。
- 视觉 fixture 仅在独立浏览器拦截 home/catalog/me 的展示响应，不覆盖真实服务端写接口；24 张八状态截图和 5 张缺陷/网络截图。截图等待 Pinia 已收到本次预期响应、loading=false 与全部图片加载完成；初始脚本只等待 networkidle 导致过早截图，最终已补条件等待并重拍，表中只链接最终结果。
- 实际模拟首页 GET 网络中断，关闭提示保留首页；解除中断后点击 `.dialog-retry`，实际 POST session/wechat 200，再 GET modules/home/catalog 200，恢复后台任务。记录见 [entry-state-checks.json](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/entry-state-checks.json)。
- 47 张本轮页面/状态截图的几何记录无横向溢出、坏图；主要按钮和提示位于底栏上方。375×812、390×844、768×1024；平板入口内容保持 680px 最大宽度，底栏沿用共享缩放。H5 实测底部 env 安全区为 0；非零微信安全区沿用此前集成证据，本轮没有新增真机验收。
- 已核对 learning 素材和共享首页胶囊/底栏 SVG 的非空文件、调用与有效展示几何：compact 封面 72×77，普通权益封面 108×117，PREVIEW 封面 126×153，arrow 11.1333×20.4667、book 25.8×24.68、lock 16×16。真实封面仍由接口 image_url 决定；fixture 使用原有 Figma 素材。M06/M07 学习底栏选中沿用既有业务归属约定。

### 八状态最终截图

| 状态 | 375×812                                                                                                                   | 390×844                                                                                                                   | 768×1024                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| M01  | [375](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M01-375-followup.png)  | [390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M01-390-followup.png)  | [768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M01-768-followup.png)  |
| M01S | [375](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M01S-375-followup.png) | [390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M01S-390-followup.png) | [768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M01S-768-followup.png) |
| M02  | [375](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M02-375-followup.png)  | [390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M02-390-followup.png)  | [768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M02-768-followup.png)  |
| M03  | [375](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M03-375-followup.png)  | [390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M03-390-followup.png)  | [768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M03-768-followup.png)  |
| M05  | [375](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M05-375-followup.png)  | [390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M05-390-followup.png)  | [768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M05-768-followup.png)  |
| M05S | [375](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M05S-375-followup.png) | [390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M05S-390-followup.png) | [768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M05S-768-followup.png) |
| M06  | [375](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M06-375-followup.png)  | [390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M06-390-followup.png)  | [768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M06-768-followup.png)  |
| M07  | [375](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M07-375-followup.png)  | [390](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M07-390-followup.png)  | [768](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/M07-768-followup.png)  |

补充：[真实试学](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/live-first-390.png)、[过期已完成布局](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/expired-completed-390.png)、[任务权限待确认](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/task-pending-blocked-390.png)、[网络恢复](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/network-recovered-390.png)。

## 待统筹集成的共享问题

### P1：首页/目录 store 接受迟到响应

文件：`src/stores/home.ts`、`src/stores/learning.ts`，以及入口页面生命周期调用方。store 不属于本对话指定的四个目录，保持未修改。

复现与实际结果：

1. `home.load` 开始后执行 `home.clear`，随后放行旧响应，旧任务重新写入 data。
2. 请求 A 未返回，请求 B 成功，再拒绝 A；A 的 catch 清空 B 的新数据并设 error=true。
3. `learning.load` 开始后执行 clear，随后放行旧目录，FORMAL 旧权限重新进入 catalog。
4. 浏览器给首页 GET 的成功回调延迟 1500ms，进入首页发请求后返回学习页。记录中请求发出于首页 `#/`，交付于 `#/pages/learning/index`；隐藏首页后共享 home.data.today_task.target_id 仍被写成 `late-hidden-home`。

期望：离页、清空、账户切换和新请求启动后，已失效请求不得修改 data/catalog/error/loading。目录正在新页面被刷新时，旧页面的清理不得取消新页面的有效请求。

建议：共享 store 建立请求代次；成功、catch 和 finally 均检查代次，clear 使旧代次失效；入口 onHide/onUnload 或请求所有者令牌使本页请求失效，避免跨页共享 catalog 被旧页面盲目清理。首页等待 ensureSession 的阶段也应检查当前页可见性。本轮任务权限校验仅防止当前目录已经收紧时仍执行旧任务，不替代共享响应保护。

证据：三个期望行为测试均稳定失败，失败输出为 [shared-race-red.txt](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/shared-race-red.txt)，可复用测试为 [entry-shared-race-repro.spec.ts](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/entry-shared-race-repro.spec.ts)。临时测试已移出仓库正式测试集，未把已知缺陷改成 expected-fail 后计为通过。浏览器复现为 [hidden-home-check.cjs](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/hidden-home-check.cjs) 与 [hidden-home-check.json](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b/hidden-home-check.json)；只延迟和替换浏览器收到的安全首页响应，没有修改服务器数据。

## 实际命令与结果

均在 `D:/个人/juya/juya-miniapp` 执行；未借用其他对话构建目录。

| 命令                                                                                                                                                         | 结果                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm exec vitest run src/features/learning/entry-catalog.spec.ts`                                                                                           | 修复前 2 failed/3 passed；修复后 5 passed                                                                                            |
| `pnpm exec vitest run src/features/home/use-home-page.spec.ts`                                                                                               | 修复前 2 failed/4 passed；修复后加入收藏保护共 7 passed                                                                              |
| `pnpm exec vitest run src/features/home src/features/learning`                                                                                               | 10 文件、40 项通过；Vitest 路径前缀也包含 learning-result/progress，仅执行其原有测试，未修改这些目录                                 |
| `pnpm test`                                                                                                                                                  | 17:02 首次全仓 204 passed/1 failed，失败为并行中的 review-card.spec.ts 收藏发音；17:09 复验 64 文件、212 项全通过，见 full-tests.txt |
| `pnpm typecheck`                                                                                                                                             | 最终 exit 0                                                                                                                          |
| `pnpm exec eslint src/features/home src/features/learning src/pages/home src/pages/learning --max-warnings=0`                                                | exit 0                                                                                                                               |
| `pnpm exec stylelint 'src/features/home/**/*.vue' 'src/features/learning/**/*.vue' 'src/pages/home/**/*.vue' 'src/pages/learning/**/*.vue' --max-warnings=0` | exit 0                                                                                                                               |
| `pnpm exec prettier src/features/home src/features/learning src/pages/home src/pages/learning --check`                                                       | exit 0                                                                                                                               |
| `$env:UNI_OUTPUT_DIR='dist/build/entry-followup-h5'; $env:VITE_USE_MOCK_API='false'; pnpm build:h5`                                                          | exit 0                                                                                                                               |
| `$env:UNI_OUTPUT_DIR='dist/build/entry-followup-mp-weixin'; $env:VITE_USE_MOCK_API='false'; pnpm build:mp-weixin`                                            | exit 0                                                                                                                               |
| `$env:UNI_OUTPUT_DIR='dist/dev/entry-followup-h5'; pnpm exec uni -p h5 --port 5204 --host 127.0.0.1 --mode entry-followup`                                   | 独立 H5；首次只绑定 localhost 导致 127.0.0.1 连接拒绝，重启本对话服务指定 host 后恢复                                                |
| `node .../entry-browser-check.cjs`                                                                                                                           | 18 张真实页面/提示截图，无溢出或坏图                                                                                                 |
| `node .../entry-state-check.cjs`                                                                                                                             | 24 张画板状态 + 5 张额外状态；受限任务 disabled=true；真实重连请求 200                                                               |
| `node .../task-guard-check.cjs`                                                                                                                              | PREVIEW/待确认下学习、跟读 disabled=true；点击保留 URL，无 scenes 请求                                                               |
| `node .../hidden-home-check.cjs`                                                                                                                             | 已复现隐藏首页后迟到响应写共享 home store，待统筹关闭                                                                                |

上述 `...` 的脚本根目录为 `C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-020f-7a70-9291-a5005caa162b`，脚本原件与 JSON 均可复跑。没有将浏览器状态拦截、local_dev 登录、开发样本或静音音频计为生产、真实微信兑换或真机验收。

## 提交与环境边界

提交仅包含上述入口范围代码、回归与本复查文档，使用 `Local\JuyaV13ParallelGitCommit` mutex，暂存前及提交前核对索引没有其他对话文件。提交标题为 `fix(入口): 收紧任务权限并保留过期完成布局`，可通过 `git log --all --grep='收紧任务权限并保留过期完成布局'` 定位实际哈希；最终聊天交付同时给出哈希。

当前 main 开发，无新分支/worktree、推送或部署。共享迟到响应问题仍开放；正式权益、云端响应、微信真实登录、非零安全区和真机字体/后台切换须统筹或设备验收。本轮未运行录音与可听正式音频验收。

后续统筹更新：共享迟到响应已由 6048bf5 关闭，回归及浏览器复验通过，详见 [复查集成](figma-followup-integration.md)。上述“仍开放”保留为本对话交接时状态。
