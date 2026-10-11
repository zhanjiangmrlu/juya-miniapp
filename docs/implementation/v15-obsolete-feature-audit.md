# V1.5 旧功能清理与成果页专项审计

日期：2026-10-11。审计基线：`feature/v1.5-20261011` / `373a954`，开始工作区干净。

按最新用户范围仅审手机；本轮删除确证死代码，不调整在用 UI、样式、平板适配或业务行为。成果页问题先交付证据与最小方案，未实施修复。未启动服务、修改 .env、操作 Docker、写真实种子或编辑根目录审计。

## 依据与验证边界

- 最新完整需求为根 `doc/句芽英语V1.5开发交付包-20261011/句芽英语V1.5完整需求文档-开发交付整合确认版-20261011.md`：7.1/7.2/7.5、8.1—8.4、9.1、19/20/23 及 33/34 章；用户最新“只手机”覆盖旧文档中的平板验收范围
- 需求第 62 行明确 M10/M11 不开发独立查词页；第 407 行要求成果统计来自有效学习/收藏及服务端天数；第 184 行明确旧“我的”路径兼容跳转而非重复档案
- 当前 Figma 母版 `2660:3` 的最新手机状态由协调独立核对。本轮没有把旧 69 状态清单或源码静态检查当成当前 Figma 视觉通过
- 全量引用检索覆盖 `src/tests/scripts/build`、`vite.config.ts`、`pages.json/manifest.json/package.json`，兼顾 PascalCase、kebab-case、类型、模板及路由。未发现候选组件的动态 glob/异步注册/`:is`/easycom 引入；Vite 仅显式 uni 插件等，没有按候选名称的自动组件扫描
- 删除后的相同检索无结果；历史设计/实施文档中的旧文件名保留为历史记录。没有生产消费者的展示组件专用测试随之删除；仍有生产引用的状态和数据兼容测试保留

## 已执行的确证清理

| 删除项                                                                     | 原职责与引用证据                                                                                                                         | 本版替代/保留路径                                                     |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/features/scene/components/entry-page-view.vue`                        | 旧分步词汇/语块页、点词弹层；仅自身引用 EntryList，无页面/路由/其他组件/测试调用                                                         | SceneReadingPageView + SceneReadingView 直显本篇词汇/语块             |
| `src/features/scene/components/entry-list.vue`                             | 仅上项死组件调用                                                                                                                         | SceneWordGrid/SceneChunkList + SceneWordCard                          |
| `src/features/scene/components/dialogue-list.vue`                          | 无生产/路由/测试消费者                                                                                                                   | 统一阅读页直接渲染正文；shadowing 仍直接用 DialogueSentence，保留后者 |
| `src/features/scene/components/scene-status-page.vue`                      | 无生产/路由/测试消费者                                                                                                                   | 具体在用页面保留自己的 AppState 与正常动作                            |
| `src/features/vocabulary-sheet/components/vocabulary-sheet.vue`            | EntryPageView 删除后无生产引用，仅自身及专用组件测试；含整套旧底部弹层样式                                                               | 最新正文下方直显词卡，不恢复点词弹层                                  |
| 专用 Props/Emits                                                           | scene-components 中 DialogueList/EntryList/EntryPageView/SceneStatusPage 共 7 个类型；vocabulary-sheet-components 整文件仅该展示组件使用 | DialogueSentence、SceneReadingView、SceneWordCard 等在用契约保留      |
| `ENTRY_FAVORITE_LABELS`、`SCENE_LEARNING_STEPS`                            | 前者仅旧词卡弹层用，后者无生产/测试消费者；旧三步学习目录已不在主流程                                                                    | 在用 SCENE_COMPLETION_DETAILS 保留                                    |
| `chooseSheetEntry` 与单项专用测试                                          | 函数仅测试调用，旧多文字命中挑选展示条目，无生产消费者                                                                                   | `openSheet` 与稳定 returnPosition/snapshot 控制器保留                 |
| `tests/unit/features/vocabulary-sheet/components/vocabulary-sheet.spec.ts` | 只测已删除展示组件，5 项                                                                                                                 | 当前 SceneWordCard/收藏/发音测试保留                                  |

没有删除 route、接口、数据库字段、公共数据适配或当前页面。清理不等于宣称全部旧版逻辑都无消费者。

## 明确保留的兼容边界

| 项目                                                                                           | 保留证据与原因                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sub-packages/scene/vocabulary.vue` / `chunks.vue`                                             | `pages.json` 注册；onLoad 立即 redirect 到当前 dialogue 阅读页，只有“正在返回”状态；page-packages 与 page-url 旧路径回归依赖，已经没有第二套词汇/语块交互                     |
| `sub-packages/compat/index.vue`、`legacy-routes.ts` 的 M10/M11                                 | 当前生产兼容入口调用 resolveLegacyRoute；M10/M11 只映射 sceneDialogue 并保留 sceneId/sourceLocator。不能因旧编号而删除仍被分享/历史入口使用的路由                             |
| M26/旧“我的”映射                                                                               | 满足需求 9.1 的唯一档案落地页与旧入口兼容，没有复制第二套档案数据                                                                                                             |
| `scene-response.ts` schema1/已适配 entries/schema2                                             | runtime 真实 scene 服务调用此 adapter；按 `words/content/entries` 区分公开快照、旧发布内容与旧缓存，保留严格录音 bool 和缺失禁录。scene-response 与正式录音消费者测试仍在使用 |
| `sheet-controller.ts` 的 openSheet、SheetSnapshot/SheetController、scene.store.sheet、来源映射 | `stores/scene.ts` 仍生产导入 openSheet，useScenePage 仍有 showSheet/closeSheet 和来源状态调用；本轮未扩大到共享状态/旧数据适配重构。旧展示删除与数据兼容删除是两件事          |
| 词卡发音、收藏快照、完整词汇/语块与短文纯阅读                                                  | 需求当前在用功能；专用直显、发音唯一所有权、义项/来源/内容命名空间和纯阅读历史均保留                                                                                          |

## 成果页功能缺口与方案（未修复）

### P1：失败被展示为权威零值与成功记录

代码位置：`src/sub-packages/scene/completed.vue:17/22/25/27/63/70`，`src/features/learning-result/result-presenter.ts:10`。

handleLoad 的 GET 失败一律 `presentLearningResult(null)`，与初始化尚未返回共用零值模型；模板无状态门控，仍显示“学习完成/本次学习已记录”、0 天及三张 0 卡，没有错误和重试。一个成功 DTO 中合法的 0 与网络/401/403/SESSION_CHANGED/服务端异常被混在一起。已有 presenter 单测只证明 null 映射 0，不能证明权威成果已经读取。

本地临时组件审计 4 项复现通过，其中网络拒绝场景明确观察到已记录文案、0/0/0 及无重试；这是现状缺陷证据，未将错误行为固化成永久正确断言。协调 `probe-results.json` 也记录真实 Mock UI 单次异常注入：shownRecorded=true、三卡 0、retryButtons=0、streak=0 天，截图 `result-unavailable-390.png`。这些是本地故障注入，不是后端/微信失败验收。

最小方案：在 completed.vue 局部区分 loading/ready/error，并用 nullable result 表示未读取。只有当前会话的成果 GET 成功且返回有效汇总时才渲染数字；失败同页显示“学习成果暂未加载，请重试”，保留返回首页/明确的正常明细入口，不拿 fallback 0 冒充汇总。重试只做已有场景授权与成果 GET，不重发 complete。直接打开成果路由不能单凭页面标题认定完成；服务端 result 的 completed_at/成果语义需沿既有正式契约确认，不能新增端点或猜 DTO。

测试建议：成功非零、成功合法零、初始 pending、网络失败/403、不重复 complete 的重试成功/失败；手机实际错误提示及44px重试点击区。保留当前三卡目的路由和火苗资源。

### P1：局部成果缓存与请求串联没有页面身份/生命周期保护

代码位置：`completed.vue:22—28/39—55`；既有保护为 `src/services/http/client.ts:43/45/78/79` 和 `use-scene-page.ts:115—123`。

- 统一 HTTP 在响应后核对 cleanupGeneration，能拒绝 A 账号在途成果响应；本轮使用真实 createHttpClient/createResultService + 内存 transport 复现此保护有效，旧 DTO 没有透传到组件
- 但 completed.vue 自己的 result ref 不订阅 cleanupGeneration，已成功读取的 7/8/9 在 session.clear 后仍留于同组件。场景 store 的清空不清此局部成果，隐藏/后台后回到旧页存在上一身份统计残留风险
- 被 HTTP 拒绝的旧请求仍进入页面无条件 catch，写回 0 并维持“已记录”。initialize 之前没有冻结页面会话；其跨清理 await 结束后还会对旧 sceneId 发起第二个成果 GET，此时第二请求会绑定新代次。后端权限仍校验，不构成已证实的鉴权绕过
- onHide/onUnload 仅 disposeAudio；review 获取队列后无页面代次复核，旧 toast/finally/navigation 也缺页面可见性保护。临时 mount 不替代真实 HTTP/微信生命周期验收

最小方案：在 handleLoad 起点冻结 sceneId + session.cleanupGeneration + 页面代次，initialize 前后和 result GET 成功/失败写回前均检查。清理同步失效并清除局部成果、loading/error/reviewing；hide/unload 使旧回调无效；show 时只为当前身份重新授权读取当前页。review 同样冻结页面代次，禁止旧队列返回后的导航、提示和 finally 修改新状态。复用既有会话清理机制，不新增账号系统。

测试建议：已加载 A 后清理/切 B 立即不显示 A 统计；initialize 在途切账号后不发送第二 GET；成果在途切账号/隐藏后不写结果或 fallback、不提示旧错误；show 当前身份正常读取；review 迟到不导航。生产 shared HTTP 的 SESSION_CHANGED 保护保持。

### P2：成果页短内容初始布局偏差，按钮滚到底可达

协调截图 `complete-390.png` 已亲验：开始翻卡按钮约 y741—787，导航 top768，初始约19px覆盖；本轮没有启动服务或修改布局。

代码已经有 ScenePageLayout 纵向内容及12px末尾 padding，TabPageLayout 的导航高度+安全区底部留白（`tab-page-layout.vue:67`），completed.vue 的 scene-actions 非固定栏。协调追加的 `probe-more-results.json` 已确认滚动可达，不是死按钮或末尾留白不足：

| 手机视口 | 初始覆盖   | 滚到底后覆盖 | 末尾按钮bottom / 导航top |
| -------- | ---------- | ------------ | ------------------------ |
| 375×812  | 24.09375px | 0            | 727 / 738.90625px        |
| 390×844  | 19px       | 0            | 756 / 768px              |
| 414×896  | 0          | 0            | 803 / 815.328125px       |

最小手机方案：按最新 M16 常规短内容母版核对375/390首屏操作组位置，只调整成果页局部间距或内容高度，保留当前可滚布局、字体和44px点击区；长内容允许正常滚动，不强制把全部内容挤入一屏。补成果页初始位置与末尾滚动的不同断言及正常 click/trial。不要全局修改 TabPageLayout、缩小按钮、新做固定操作栏或把可达情况报为功能不可用。

验收：375/390/414，短/长标题、正常/错误状态、两按钮均可完整滚动至导航上方且普通点击可达。之前真实成果检查只等卡片/明细可见，尚未覆盖这项末按钮断言。

### P2：已配置词汇图片加载失败缺少重试入口

需求第23章第1185行明确“有图但加载失败可重试；无图内容直接阅读文字”。`scene-word-card.vue:34—36` 的 image 只有 src/mode，没有 @error、失败状态或重试事件；`use-scene-page.ts:160—182` 的 resolveWordImages 对非401/403取址失败也未给每张词卡提供可重试状态。

协调在现有Mock UI中 abort `/static/fixtures/latte@3x.png`，`probe-more-results.json` imageFailure记录 imageCount=1、retryCount=0、hasText=1、favoriteButtons=5：文字和收藏保留，但有图失败无重试。前者符合降级要求，后者是功能缺口；不能把它归为“本来未配图”。本轮只读源码和证据，未修改产品。

最小方案：按当前词卡独立保存图像 loading/error，image @error 只影响该图，提供同位重试；通过现有同sceneId/revision/image_asset_id的受控取址重读，或为仍有效地址重新挂载图片，不拼接签名、不改收藏与发音。补当前页面/会话代次保护，重试成功清错误，反复失败仍保留文字；无图词汇、无图片区语块不出现伪错误或重试。测试覆盖取址失败、图片字节失败、重试成功/失败、无图、离页/切账号迟到。

### P2：词语发音 Playing 状态图与最新设计不一致

协调已读取 Figma `2686:633` 独立Playing状态图，图形为暂停符号；源码 `pronunciation-button.vue:30/38/60/99` 虽有playing状态、aria-label=暂停发音及透明度动画，但非失败时始终用 pronunciation-idle.svg，没有独立Playing图。属于状态视觉偏差，不代表播放/暂停业务已被证实不可用。

注意 `probe-more-results.json` playing数组中 playing均false，不能据此声称真实Playing浏览器状态已复现。当前结论基于协调设计读图与本轮源代码映射；后续需真实进入PLAYING后核图、点击暂停及恢复，不能只改CSS透明度。最小方案是消费当前正式Playing资产，保留现有audio所有权、点击隔离、loading/error与无目标隐藏规则，分别回归idle/loading/playing/paused/error及44px点击区。本轮不修改图标或样式。

## 验收基线过时（交协调替换）

`tests/visual/visual-cases.ts` 仍以旧2478/2479/2480节点和69状态为清单，M05/M09/M14/M16/M19/M21/M24/M27等改版状态仍指向旧节点；responsive-contract.spec.ts 固定69状态及平板768视口。这类结构测试通过不证明与最新 `2660:3` 的40手机状态一致。协调生成当前映射后，应成组替换清单/数量/手机视口及对应证据，本轮不猜节点、不批量删除视觉测试。

旧 route 到当前阅读页的兼容条目不是新Figma的额外功能；应区分“当前手机设计状态”和“旧入口兼容回归”。协调已修正页面截图使用独立顶层查询强制 onLoad，以及正确 rain-check 语块 ID；本轮未将旧页缓存/错误夹具当成新增业务缺陷。

## 本轮门禁与交接

- 删除后全量候选名称/专用类型/常量/函数检索在生产与测试范围均无结果，`git diff --check` 通过
- 受影响10文件49项正式回归通过：场景阅读/跟读、词卡状态控制器、成果 presenter/review、schema1适配、旧入口及页面分包
- `pnpm check`（格式、ESLint、Stylelint、vue-tsc）通过；H5/mp-weixin正式构建exit0，page-meta16页通过。没有运行全套千例或启动预览/后端服务
- 临时4项成果现状复现已归档到忽略目录 `.v15-artifacts.local/completed-audit.spec.ts.txt`，未提交为永久正确行为测试

不会以早先真实045dc全通过作为本轮成果失败/生命周期缺口已修复的证据。成果页及手机UI的后续实施需协调确认具体方案；本轮提交仅确证清理与这份审计。
