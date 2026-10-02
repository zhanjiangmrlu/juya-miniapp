# 小程序入口页设计还原交付

首页与学习入口的 8 个节点已实现并提交到 main。代码提交：`8ef1889ea8d0c3d96af55b35130399b89e298953`，`feat(入口): 还原首页与学习探索设计并接入动态任务`。补充修复提交：`9152991f0151768937efe19b307667d426ebb936`，`fix(首页): 只读加载试学摘要并收敛入口生命周期`。首页此前共享还原基线为 `c12ecdb`，本次保留其正常首页组件并修正首次状态、任务编排和动态封面。

## 页面与节点

所有节点均读取完整 design context 与设计截图，未使用摘要模式。设计文件为 [句芽完整设计稿](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2475-158)。

| 页面 | 节点                                                                             | 状态         | 实际路由与触发                                                       | 视觉数据状态          |
| ---- | -------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------- | --------------------- |
| M01  | [2478:5](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2478-5)     | 首页正常     | /pages/home/index                                                    | progress              |
| M01S | [2479:14](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-14)   | 首页网络异常 | /pages/home/index?networkError=1                                     | progress + 当前页弹窗 |
| M02  | [2479:70](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-70)   | 首次进入     | /pages/home/first-visit；正常首页 NEW_SCENE 且 total_days=0 自动呈现 | new                   |
| M03  | [2479:126](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-126) | 今日任务     | /pages/home/today-task                                               | progress              |
| M05  | [2479:182](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-182) | 已有学习权益 | /pages/learning/index                                                | entitled              |
| M05S | [2479:241](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-241) | 开放学习目录 | /pages/learning/index                                                | new                   |
| M06  | [2479:300](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-300) | 探索内容     | /pages/learning/explore                                              | entitled              |
| M07  | [2479:358](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-358) | 未开通提示   | 探索页点击 PREVIEW；/pages/learning/no-access 兼容入口               | entitled              |

需求依据为确认版开发需求交付文档，以及技术设计方案 02 技术方案的首页、目录、权限和收藏复习规定。实现范围仅 src/pages/home、src/pages/learning、src/features/home、src/features/learning；未修改公共组件、服务、布局、pages.json、其他仓库或中央台账。

## 实现与需求闭环

- 正常首页保留品牌、动态称呼、打卡、今日任务、复习与开放进度。静默身份失败清空学习摘要并保留品牌兜底；重连调用 ensureSession(true) 后获取真实数据。网络提示在当前页关闭。
- 新用户正常首页自动显示 M02。试学句从 OPEN 场景的只读 trial_sentence 安全目录摘要提取，不调用开始学习接口、不写学习历史；授权未确认或 PREVIEW 响应不展示正文。请求失败时显示无正文的介绍。
- 今日任务使用服务端任务种类、目标 ID 和完整 card_ids。FAVORITE_REVIEW 不依赖场景摘要，收藏翻卡不限制张数；权益用户的开放场景历史目标仍能正确匹配。
- NEW 目录展示全部 OPEN。ENTITLED 目录按当前未完成学习与其他已有权益分区，已完成场景不继续放在当前学习。曾开始非开放场景，即使当前已过期为 PREVIEW，也保持 ENTITLED 目录布局。
- 已有权益的开放场景复习保留唯一历史入口，使用 /pages/favorites/history?filter=open。预览与可访问目录按 ID 去重。
- PREVIEW 卡片仅使用安全摘要、封面、简介与标签，不构造正文路由。点击在探索页显示提示，关闭后 URL 和列表位置不变。资料入口只在后台 profile_completion_enabled 开启时显示。
- SceneCard、EntrySummary、EntryPageShell 与 HomeEntryPage 复用实际数据。封面由接口 image_url 决定，去掉咖啡场景名称对应固定图片的旧映射。

## 素材来源

以下资源均由 Figma 原始素材 URL 下载。照片采用 @3x 文件命名，展示尺寸由卡片布局控制，没有用页面截图充当 UI，也没有用 CSS 重画设计图标。

| 文件                                       | Figma 来源图层                          | 使用与限制                                            |
| ------------------------------------------ | --------------------------------------- | ----------------------------------------------------- |
| src/features/learning/assets/coffee@3x.png | 2478:31、2490:1494、2490:1485、2479:204 | 视觉 API 返回此真实照片；运行页面仍读取接口 image_url |
| src/features/learning/assets/hotel@3x.png  | 2479:214                                | 权益状态视觉 API 的酒店安全封面                       |
| src/features/learning/assets/travel@3x.png | 2479:320、2479:379                      | 预览状态视觉 API 的旅行安全封面                       |
| src/features/learning/assets/work@3x.png   | 2479:332、2479:390                      | 预览状态视觉 API 的职场安全封面                       |
| src/features/learning/assets/arrow.svg     | 2490:1497、2490:1488                    | 问路类别的原始 SVG，保持比例                          |
| src/features/learning/assets/book.svg      | 2490:1501、2490:1492                    | 缺少封面的通用真实图标，保持比例                      |
| src/features/learning/assets/lock.svg      | 2479:327、2479:338                      | PREVIEW 的原始锁图标，保持比例                        |

首页原有胶囊、底栏等素材复用已有共享实现，本次未重复导出。四张照片未按中文场景名硬编码到生产页面。

## 验证结果

2026-10-02 本轮验证：

| 检查                                                            | 结果                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| pnpm exec vitest run src/features/home src/features/learning    | 10 文件 33 测试通过，含目录、首页与相关进度结果回归                                                  |
| pnpm test                                                       | 54 文件 165 测试通过                                                                                 |
| pnpm typecheck                                                  | 当前仅其他页面 recording-machine.spec.ts:21 泛型错误，已通知统筹；入口无类型错误                     |
| 自有四目录 prettier、eslint、stylelint                          | exit 0；提交 hook 同样通过                                                                           |
| pnpm build:h5，UNI_OUTPUT_DIR=dist/build/entry-h5               | exit 0                                                                                               |
| pnpm build:mp-weixin，UNI_OUTPUT_DIR=dist/build/entry-mp-weixin | exit 0                                                                                               |
| Chrome 375×812、390×844、768×1024                               | 8 状态共 24 张截图；无横向溢出、坏图或底部主操作遮挡                                                 |
| 新用户正常首页点击开始学习                                      | 实际进入 /pages/scene/detail?sceneId=coffee                                                          |
| 503 失败关闭提示与重连                                          | 关闭保留当前页；重连实际 POST /api/v1/session/wechat 再 GET home/modules/catalog，恢复任务并关闭提示 |
| PREVIEW 点击与关闭                                              | 未请求场景正文；当前探索 URL 保持不变                                                                |

首页身份失败、真实目标、已完成分区、重复预览、过期账号布局、试学权限与收藏任务均有实际先失败再通过的回归测试。独立审查另确认并修复两项重要问题：自动 open 写学习历史、动态子组件 onShow 遗留页面根回调。新增回归先失败再通过，复审两项关闭，4 文件 11 测试通过。浏览器只浏览 M02 的请求记录无 /scenes/*/open；真正点击进入场景才由场景页执行开始学习。动态嵌入首页由父页统一刷新，独立路由保留本身生命周期。

### 本地真实 HTTP 联调

独立 H5 http://127.0.0.1:5193 使用 mock=false、local_dev=true、API=http://127.0.0.1:8091，独立输出 dist/dev/entry-integration-h5。浏览器确认首页展示后台的“讨论城堡展览”68%与真实封面；学习页展示城堡、早餐、咖啡三个动态开放场景；探索页展示后台“周末公路旅行”。点击 PREVIEW 在当前页出现提示并支持关闭，后台允许时有次级资料入口。正式 catalog 与共享 SceneSummary 已由统筹增加 trial_sentence；当前运行的 8091 尚需其重启后复验新字段。旧服务缺字段时首次页面正确显示无正文介绍，截图另见 [live-first-visit-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/live-first-visit-390.png)。

| 截图           | 绝对路径                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 真实首页       | [live-home-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/live-home-390.png)           |
| 真实学习目录   | [live-learning-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/live-learning-390.png)   |
| 真实预览目录   | [live-explore-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/live-explore-390.png)     |
| 真实未开通提示 | [live-no-access-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/live-no-access-390.png) |

8091 为统筹提供的本地联调环境；这些证据不代表正式生产、微信真机或云端内容开通验收。

### 设计状态截图

视觉状态服务仅用于稳定复现画板数据，使用独立 9012 HTTP 服务、5192 H5 与 dist/dev/entry-h5，不改仓库环境文件、不返回真实凭证。下列截图使用完整 reload、networkidle 和稳定等待后保存。

| 页面 | 宽度 | 截图绝对路径                                                                                                                    |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| M01  | 375  | [M01-375.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M01-375.png)   |
| M01  | 390  | [M01-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M01-390.png)   |
| M01  | 768  | [M01-768.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M01-768.png)   |
| M01S | 375  | [M01S-375.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M01S-375.png) |
| M01S | 390  | [M01S-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M01S-390.png) |
| M01S | 768  | [M01S-768.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M01S-768.png) |
| M02  | 375  | [M02-375.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M02-375.png)   |
| M02  | 390  | [M02-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M02-390.png)   |
| M02  | 768  | [M02-768.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M02-768.png)   |
| M03  | 375  | [M03-375.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M03-375.png)   |
| M03  | 390  | [M03-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M03-390.png)   |
| M03  | 768  | [M03-768.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M03-768.png)   |
| M05  | 375  | [M05-375.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M05-375.png)   |
| M05  | 390  | [M05-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M05-390.png)   |
| M05  | 768  | [M05-768.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M05-768.png)   |
| M05S | 375  | [M05S-375.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M05S-375.png) |
| M05S | 390  | [M05S-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M05S-390.png) |
| M05S | 768  | [M05S-768.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M05S-768.png) |
| M06  | 375  | [M06-375.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M06-375.png)   |
| M06  | 390  | [M06-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M06-390.png)   |
| M06  | 768  | [M06-768.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M06-768.png)   |
| M07  | 375  | [M07-375.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M07-375.png)   |
| M07  | 390  | [M07-390.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M07-390.png)   |
| M07  | 768  | [M07-768.png](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/M07-768.png)   |

几何与图片加载记录：[geometry.json](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5419-7c82-8aac-b19386e4029e/entry/geometry.json)。

## 已记录差异与后续验收边界

- 场景名、任务、数量、学习进度、试学句和封面取实际后台数据；与画板示例不同时属于内容差异。已有权益视觉 fixture 中开放场景为两个，因此复习摘要显示两个名称。
- 收藏相关“最多 10 张”按确认需求改为“不限张数”。
- M06/M07 画板底栏选中首页；按统筹业务归属约定，实际选中学习。
- 平板内容采用最大 680px 居中布局，底栏保留共享缩放方式；主操作与弹层按实际底栏高度避让。375px 的网络遮罩边缘存在约 0.03px 的子像素取整差异，主操作与底栏均可用。
- 最新两端构建均成功；全量类型检查当前被其他页面新增录音测试的 Promise 泛型错误阻断，已交对应负责人修复，入口代码自身无报错。
- H5 使用系统字体，微信环境的系统字形、胶囊和安全区需真机复核。无权限的生产数据、正式静默登录、真实云端失败恢复与微信真机不以本轮本地截图替代验收。

入口代码与上述本地验证可进入集成验收。共享改动、正式后端和其他页面由统筹合并验证。
