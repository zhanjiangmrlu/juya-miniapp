# 句芽英语 V1.3 用户端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 uni-app 工程中完成句芽英语 V1.3 微信小程序用户端 43 个正式页面、4 个兼容入口、完整接口链路和手机/平板视觉验收。

**Architecture:** 采用“共享底座 + 业务纵向切片”。页面只组合领域用例和展示组件；HTTP、音频、录音、进度、路由兼容等公共逻辑分别集中到 Service、Feature、Store 和纯函数中，开发 mock 与真实 API 共用同一契约。

**Tech Stack:** Vue 3.4、TypeScript 5.9、uni-app、Pinia、SCSS、vue-i18n、Vitest、Vue Test Utils、微信小程序构建工具链。

**Spec:** `docs/superpowers/specs/2026-09-28-juya-miniapp-v1.3-design.md`

## Global Constraints

- 只开发微信小程序用户端；不实现后台、支付、订单、价格、广告、发音评分、社交、长期录音或用户自建内容。
- Node.js 使用 `>=22.22.0 <23`，pnpm 固定 `11.22.0`；只用 pnpm 修改依赖和锁文件。
- 所有新页面使用 `<script setup lang="ts">` 与 `<style scoped lang="scss">`，页面样式在页面根节点下嵌套。
- 视觉基线为 `doc/句芽英语V1完整设计稿-20260927/PNG/用户端` 和 `PNG/平板端`。
- 生产页面不直接导入 mock 数据；mock 和真实 API 实现同一 Transport/Repository 接口。
- 微信号、反馈内容、录音路径不得进入通用日志、埋点或长期 Store。
- 服务端权限、权益、联系方式修改次数和反馈状态是唯一事实源，客户端不得自行扩大权限。
- 页面公共逻辑、跨页面业务组件和无业务基础组件必须按职责抽取；单页只保留页面专属编排。
- 所有提交直接落在 `main`，提交信息使用中文，不重写已有历史。

## Review Focus

- 401 并发请求只允许触发一次刷新；刷新失败必须清理会话并静默重登。
- 切换音频目标、页面隐藏或地址过期时不得叠播，也不得重复刷新临时地址。
- 离线队列只合并同场景阅读位置，不能吞掉完成场景或完成翻卡命令。
- 只读预览、权益待确认或权益过期时不得泄露正文、音频、收藏和进度写入口。
- 退出、清空学习数据、注销生效和录音重录必须清理相应本地敏感数据与临时文件。

---

### Task 1: 固定运行环境、测试能力与设计系统

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/styles/tokens.scss`
- Create: `src/styles/mixins.scss`
- Modify: `src/styles/global.scss`
- Modify: `src/uni.scss`
- Create: `src/components/app-page/AppPage.vue`
- Create: `src/components/surface-card/SurfaceCard.vue`
- Create: `src/components/app-button/AppButton.vue`
- Create: `src/components/bottom-action-bar/BottomActionBar.vue`
- Create: `src/components/app-state/AppState.vue`
- Create: `src/components/component-contracts.spec.ts`

**Interfaces:**

- Produces: `AppPage`, `SurfaceCard`, `AppButton`, `BottomActionBar`, `AppState`；全局 SCSS token 与安全区 mixin。
- Consumes: 已有 Vue/uni-app 工程和设计稿视觉值。

- [ ] **Step 1: 准备匹配工具链并安装锁定依赖**

使用 nvm 或等价非仓库方式启用 Node 22.22.0，再由 Corepack 启用 pnpm 11.22.0；运行 `pnpm install --frozen-lockfile`。不得修改 `engines` 绕过约束。

- [ ] **Step 2: 写基础组件失败测试**

安装 `@vue/test-utils` 与 `happy-dom` 开发依赖，配置 Vitest 组件测试环境。测试验证按钮禁用时不触发点击、底部操作栏带安全区类、状态组件同时提供图标文字与状态文案。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm test -- src/components/component-contracts.spec.ts`
Expected: FAIL，组件模块尚不存在。

- [ ] **Step 4: 实现设计令牌和基础组件**

令牌固定包含 `#F8F1E2`、`#E3EFE6`、`#F8FAF5`、`#C9DED1`、`#2F7D61`，按钮最小视觉高度 44px，底部栏统一使用 `env(safe-area-inset-bottom)`。

- [ ] **Step 5: 验证并提交**

Run: `pnpm test -- src/components/component-contracts.spec.ts && pnpm check && git diff --check`
Commit: `基础：建立设计令牌与公共组件`

### Task 2: API 契约、请求层、会话与开发 mock

**Files:**

- Create: `src/shared/contracts/common.ts`
- Create: `src/shared/contracts/session.ts`
- Create: `src/shared/contracts/home.ts`
- Create: `src/shared/contracts/learning.ts`
- Create: `src/shared/contracts/favorites.ts`
- Create: `src/shared/contracts/profile.ts`
- Create: `src/shared/contracts/entitlements.ts`
- Create: `src/shared/contracts/messages.ts`
- Create: `src/shared/contracts/feedback.ts`
- Create: `src/shared/contracts/account.ts`
- Create: `src/services/http/types.ts`
- Create: `src/services/http/client.ts`
- Create: `src/services/http/uni-transport.ts`
- Create: `src/services/http/error-map.ts`
- Create: `src/services/http/request-id.ts`
- Create: `src/services/auth/session-service.ts`
- Create: `src/services/mock/mock-transport.ts`
- Create: `src/services/mock/fixtures.ts`
- Create: `src/stores/session.ts`
- Create: `src/app/bootstrap.ts`
- Create: `src/services/http/client.spec.ts`
- Create: `src/app/bootstrap.spec.ts`
- Modify: `.env.example`
- Modify: `src/env.d.ts`
- Modify: `src/App.vue`

**Interfaces:**

- Produces: `HttpTransport.request<T>(request: TransportRequest): Promise<TransportResponse<T>>`；`createHttpClient(options): HttpClient`；`bootstrapApp(): Promise<BootstrapResult>`；`useSessionStore()`。
- Consumes: `uni.request`、`uni.login`、`uni.getStorageSync`、`uni.setStorageSync`。

- [ ] **Step 1: 写请求链路失败测试**

覆盖 Authorization、`X-Request-ID`、客户端版本、写请求 UUID 幂等键、10 秒超时、GET 网络错误重试一次、POST 默认不重试、401 并发只刷新一次、刷新失败清理令牌。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- src/services/http/client.spec.ts src/app/bootstrap.spec.ts`
Expected: FAIL，HTTP Client 和启动用例尚不存在。

- [ ] **Step 3: 实现契约与请求层**

DTO 字段使用接口文档原名；UI ViewModel 在领域层转换。`MockTransport` 只通过 `VITE_USE_MOCK_API=true` 注入，页面不得导入 fixtures。

- [ ] **Step 4: 验证并提交**

Run: `pnpm test -- src/services/http/client.spec.ts src/app/bootstrap.spec.ts && pnpm typecheck && git diff --check`
Commit: `基础：完成接口契约与会话请求层`

### Task 3: 路由兼容、国际化、应用壳与底部导航

**Files:**

- Create: `src/shared/navigation/routes.ts`
- Create: `src/shared/navigation/legacy-routes.ts`
- Create: `src/shared/navigation/legacy-routes.spec.ts`
- Create: `src/shared/navigation/navigate.ts`
- Create: `src/i18n/index.ts`
- Create: `src/i18n/zh-CN.ts`
- Create: `src/components/page-header/PageHeader.vue`
- Create: `src/components/app-tab-bar/AppTabBar.vue`
- Create: `src/layouts/TabPageLayout.vue`
- Create: `src/pages/compat/index.vue`
- Modify: `src/main.ts`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `resolveLegacyRoute(input: LegacyRouteInput): NavigationIntent`；`navigate(intent: NavigationIntent): Promise<void>`；四项固定 Tab 应用壳。
- Consumes: Task 1 基础组件。

- [ ] **Step 1: 写兼容路由失败测试**

使用字面量断言 M04→M01+`networkError=1`，M10/M11→M09+对应 sheet，M26→M27；未知兼容 ID 返回首页安全入口。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- src/shared/navigation/legacy-routes.spec.ts`
Expected: FAIL，路由解析器尚不存在。

- [ ] **Step 3: 实现路由、应用壳与文案表**

`pages.json` 本任务只注册已经存在的兼容承接页；后续业务任务在创建页面文件时逐批注册正式路径，保证每次提交均可构建。Tab 固定首页、学习、收藏、我的，M26 不保留重复档案页。

- [ ] **Step 4: 验证并提交**

Run: `pnpm test -- src/shared/navigation/legacy-routes.spec.ts && pnpm build:mp-weixin && git diff --check`
Commit: `基础：完成应用导航与旧路由兼容`

### Task 4: 首页与学习目录 M01-M07

**Files:**

- Create: `src/shared/utils/beijing-time.ts`
- Create: `src/shared/utils/beijing-time.spec.ts`
- Create: `src/features/home/home-service.ts`
- Create: `src/features/home/home-presenter.ts`
- Create: `src/features/home/home-presenter.spec.ts`
- Create: `src/features/learning/catalog-service.ts`
- Create: `src/features/learning/catalog-presenter.ts`
- Create: `src/features/learning/catalog-presenter.spec.ts`
- Create: `src/features/learning/components/SceneCard.vue`
- Create: `src/features/learning/components/SceneListSection.vue`
- Create: `src/features/learning/components/AccessNotice.vue`
- Create: `src/stores/home.ts`
- Create: `src/stores/learning.ts`
- Create: `src/pages/home/index.vue`
- Create: `src/pages/home/first-visit.vue`
- Create: `src/pages/home/today-task.vue`
- Create: `src/pages/learning/index.vue`
- Create: `src/pages/learning/explore.vue`
- Create: `src/pages/learning/no-access.vue`
- Delete: `src/pages/index/index.vue`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `getBeijingGreeting(now: Date): Greeting`；`presentHome(dto, session): HomeViewModel`；`presentCatalog(dto): CatalogSections`；M01-M03、M05-M07 页面。
- Consumes: Task 2 `HttpClient`、Task 3 路由、Task 1 组件。

- [ ] **Step 1: 写首页与目录失败测试**

覆盖北京时间三段问候、称呼优先级、today_task 四种跳转、M01S 不创建游客数据、M05 新用户与已有权益分区、M06 不重复开放场景、未知模块忽略、只读预览不含正文入口。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- src/shared/utils/beijing-time.spec.ts src/features/home/home-presenter.spec.ts src/features/learning/catalog-presenter.spec.ts`
Expected: FAIL，presenter 尚不存在。

- [ ] **Step 3: 实现页面和共享场景卡**

M01 网络异常为当前页弹层；M07 仅承接直接链接或历史入口；无权限主操作停留当前页，资料次级入口受服务端开关控制。

- [ ] **Step 4: 验证并提交**

Run: `pnpm test -- src/shared/utils/beijing-time.spec.ts src/features/home/home-presenter.spec.ts src/features/learning/catalog-presenter.spec.ts && pnpm check && pnpm build:mp-weixin`
Commit: `功能：完成首页与学习目录`

### Task 5: 场景、音频与词汇弹层 M08-M13、M15、M17-M18

**Files:**

- Create: `src/features/audio/audio-machine.ts`
- Create: `src/features/audio/audio-controller.ts`
- Create: `src/features/audio/audio-machine.spec.ts`
- Create: `src/features/audio/components/AudioButton.vue`
- Create: `src/features/scene/scene-service.ts`
- Create: `src/features/scene/scene-model.ts`
- Create: `src/features/scene/scene-model.spec.ts`
- Create: `src/features/scene/components/DialogueList.vue`
- Create: `src/features/scene/components/DialogueSentence.vue`
- Create: `src/features/vocabulary-sheet/sheet-controller.ts`
- Create: `src/features/vocabulary-sheet/sheet-controller.spec.ts`
- Create: `src/features/vocabulary-sheet/components/VocabularySheet.vue`
- Create: `src/features/learning-progress/progress-queue.ts`
- Create: `src/features/learning-progress/progress-queue.spec.ts`
- Create: `src/stores/audio.ts`
- Create: `src/stores/scene.ts`
- Create: `src/pages/scene/detail.vue`
- Create: `src/pages/scene/dialogue.vue`
- Create: `src/pages/scene/vocabulary.vue`
- Create: `src/pages/scene/chunks.vue`
- Create: `src/pages/scene/audio-failed.vue`
- Create: `src/pages/scene/restore-position.vue`
- Create: `src/pages/scene/return-source.vue`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `AudioController.play(target): Promise<void>`、`pause()`、`stop()`、`dispose()`；`createProgressQueue(storage, sender)`；`openSheet(entry, returnPosition)`；M08-M13、M15、M17-M18。
- Consumes: 媒体签名地址接口、场景 open/entries/progress 接口、稳定定位字段。

- [ ] **Step 1: 写状态机与访问控制失败测试**

覆盖同目标暂停/继续、新目标停止旧目标、页面隐藏释放、403 只重取一次、完整/预览/拒绝模型隔离、中文每次进入默认关闭、弹层关闭恢复滚动位置。

- [ ] **Step 2: 写进度队列失败测试**

覆盖 800ms 节流、同场景位置只保留最新、完成命令不合并、重试复用幂等键、退出/清空/注销清队列。

- [ ] **Step 3: 运行测试确认 RED**

Run: `pnpm test -- src/features/audio/audio-machine.spec.ts src/features/scene/scene-model.spec.ts src/features/vocabulary-sheet/sheet-controller.spec.ts src/features/learning-progress/progress-queue.spec.ts`
Expected: FAIL，领域模块尚不存在。

- [ ] **Step 4: 实现场景页面和公共业务组件**

M10/M11 不建正式页面；M12/M13 与 M09 共用 `VocabularySheet`；语块命中优先于普通词；收藏成功不关闭弹层。

- [ ] **Step 5: 验证并提交**

Run: `pnpm test -- src/features/audio src/features/scene src/features/vocabulary-sheet src/features/learning-progress && pnpm check && pnpm build:mp-weixin`
Commit: `功能：完成场景学习与统一音频状态`

### Task 6: 逐句跟读与学习成果 M14、M16

**Files:**

- Create: `src/features/recording/recording-machine.ts`
- Create: `src/features/recording/recording-controller.ts`
- Create: `src/features/recording/recording-machine.spec.ts`
- Create: `src/features/recording/components/RecordingControls.vue`
- Create: `src/features/learning-result/result-service.ts`
- Create: `src/features/learning-result/result-presenter.ts`
- Create: `src/features/learning-result/result-presenter.spec.ts`
- Create: `src/features/learning-result/components/LearningResultCards.vue`
- Create: `src/pages/scene/shadowing.vue`
- Create: `src/pages/scene/completed.vue`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `RecordingController.selectSentence(id)`、`start()`、`stop()`、`playback()`、`rerecord()`、`dispose()`；`presentLearningResult(dto): LearningResultViewModel`；M14、M16。
- Consumes: Task 5 AudioController、场景 complete/result 接口。

- [ ] **Step 1: 写录音生命周期失败测试**

覆盖任意句开始、首次权限请求、拒绝后只禁用录音、切句停止原音和回听、重录删除旧文件、页面卸载/完成/后台超时/退出清理文件。

- [ ] **Step 2: 写成果跳转失败测试并运行 RED**

成果三卡使用字面量目标断言收藏词汇、收藏语块、学习历史；无数据时显示 0 但仍可进入明细。

Run: `pnpm test -- src/features/recording/recording-machine.spec.ts src/features/learning-result/result-presenter.spec.ts`
Expected: FAIL，模块尚不存在。

- [ ] **Step 3: 实现 M14/M16 并验证**

M14 展示全部句子且不评分；M16 复用成果卡组件，不新增装饰性统计逻辑。

Run: `pnpm test -- src/features/recording src/features/learning-result && pnpm check && pnpm build:mp-weixin`
Commit: `功能：完成逐句跟读与学习成果`

### Task 7: 收藏、翻卡与学习历史 M19-M25

**Files:**

- Create: `src/features/favorites/favorite-service.ts`
- Create: `src/features/favorites/favorite-presenter.ts`
- Create: `src/features/favorites/review-session.ts`
- Create: `src/features/favorites/favorites.spec.ts`
- Create: `src/features/favorites/components/FavoriteList.vue`
- Create: `src/features/favorites/components/ReviewCard.vue`
- Create: `src/features/favorites/components/SourceList.vue`
- Create: `src/stores/favorites.ts`
- Create: `src/pages/favorites/index.vue`
- Create: `src/pages/favorites/phrases.vue`
- Create: `src/pages/favorites/detail.vue`
- Create: `src/pages/favorites/sources.vue`
- Create: `src/pages/favorites/review-front.vue`
- Create: `src/pages/favorites/review-back.vue`
- Create: `src/pages/favorites/history.vue`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `useFavoriteStore()` 独立保存双标签筛选、滚动位置、游标；`createReviewSession(cardIds)`；M19-M25。
- Consumes: favorites、reviews、open-history 接口；Task 5 AudioButton 和稳定定位导航。

- [ ] **Step 1: 写收藏与复习失败测试**

覆盖双标签状态独立、大小写与多余空格规范化仅用于展示合并、不自动合并不同词形、多来源保留、无权限来源无返回原文、翻卡播放不触发翻面、完成复习复用幂等键。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- src/features/favorites/favorites.spec.ts`
Expected: FAIL，收藏领域模块尚不存在。

- [ ] **Step 3: 实现 M19-M25 并验证**

Run: `pnpm test -- src/features/favorites && pnpm check && pnpm build:mp-weixin`
Commit: `功能：完成收藏复习与学习历史`

### Task 8: 学习档案与联系方式 M27-M31

**Files:**

- Create: `src/shared/utils/redact.ts`
- Create: `src/shared/utils/redact.spec.ts`
- Create: `src/features/profile/profile-service.ts`
- Create: `src/features/contact-profile/contact-service.ts`
- Create: `src/features/contact-profile/contact-form.ts`
- Create: `src/features/contact-profile/contact-form.spec.ts`
- Create: `src/features/profile/components/ProfileIdentity.vue`
- Create: `src/features/contact-profile/components/ContactForm.vue`
- Create: `src/pages/profile/index.vue`
- Create: `src/pages/profile/contact-prompt.vue`
- Create: `src/pages/profile/contact-edit.vue`
- Create: `src/pages/profile/contact-manage.vue`
- Create: `src/pages/profile/contact-correction.vue`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `redactSensitive(value, kind)`；`validateContactForm(input)`；M27-M31。
- Consumes: me、contact、corrections 接口。

- [ ] **Step 1: 写敏感字段和表单失败测试**

覆盖完整微信号不进入 logger 参数、未填写状态、协议未同意不可提交、相同值和修改次数完全使用服务端结果、更正原因去空格后 2-500 字。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- src/shared/utils/redact.spec.ts src/features/contact-profile/contact-form.spec.ts`
Expected: FAIL，脱敏与表单模块尚不存在。

- [ ] **Step 3: 实现 M27-M31 并验证**

M27 固定显示句芽号和微信号双行身份信息；M26 继续只做跳转。

Run: `pnpm test -- src/shared/utils/redact.spec.ts src/features/contact-profile && pnpm check && pnpm build:mp-weixin`
Commit: `功能：完成学习档案与联系资料`

### Task 9: 正式与限时权益 M32-M37

**Files:**

- Create: `src/shared/utils/server-clock.ts`
- Create: `src/shared/utils/server-clock.spec.ts`
- Create: `src/features/entitlements/entitlement-service.ts`
- Create: `src/features/entitlements/entitlement-presenter.ts`
- Create: `src/features/entitlements/entitlement-presenter.spec.ts`
- Create: `src/features/entitlements/components/EntitlementCard.vue`
- Create: `src/features/entitlements/components/ExpiryNotice.vue`
- Create: `src/pages/entitlement/index.vue`
- Create: `src/pages/entitlement/pending.vue`
- Create: `src/pages/entitlement/active.vue`
- Create: `src/pages/entitlement/ending.vue`
- Create: `src/pages/entitlement/ended.vue`
- Create: `src/pages/entitlement/exception.vue`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `createServerClock(serverNow, clientNow)`；`presentEntitlements(dto, clock)`；M32-M37。
- Consumes: entitlements、catalog、scene open、result 接口。

- [ ] **Step 1: 写权益状态失败测试**

覆盖待开始不本地激活、首次 open 使用服务端 activated_at、3/5 天准确到期、正式与限时并存、即将结束绝对时间、结束后成果和收藏保留、authorization_pending 不扩大访问。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- src/shared/utils/server-clock.spec.ts src/features/entitlements/entitlement-presenter.spec.ts`
Expected: FAIL，权益 presenter 尚不存在。

- [ ] **Step 3: 实现 M32-M37 并验证**

M36 三项成果只展示数字、文字和明细跳转，不增加装饰图标。

Run: `pnpm test -- src/shared/utils/server-clock.spec.ts src/features/entitlements && pnpm check && pnpm build:mp-weixin`
Commit: `功能：完成学习权益与限时状态`

### Task 10: 站内消息与反馈闭环 M38-M43

**Files:**

- Create: `src/features/messages/message-service.ts`
- Create: `src/features/feedback/feedback-service.ts`
- Create: `src/features/feedback/feedback-form.ts`
- Create: `src/features/feedback/feedback-form.spec.ts`
- Create: `src/features/feedback/upload-service.ts`
- Create: `src/features/feedback/components/FeedbackCard.vue`
- Create: `src/features/feedback/components/FeedbackTimeline.vue`
- Create: `src/stores/feedback-draft.ts`
- Create: `src/pages/feedback/messages.vue`
- Create: `src/pages/feedback/index.vue`
- Create: `src/pages/feedback/create.vue`
- Create: `src/pages/feedback/detail.vue`
- Create: `src/pages/feedback/resolution.vue`
- Create: `src/pages/feedback/content-blocked.vue`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `validateFeedbackDraft(draft)`；`uploadFeedbackImage(file): Promise<string>`；M38-M43。
- Consumes: messages、feedback、feedback upload credential 接口和 OSS 表单上传。

- [ ] **Step 1: 写反馈失败测试**

覆盖描述去空格后 1-300 字、最多一图、允许 MIME、5 MiB、上传失败保留文字、内容拦截不记录原文、补充 1-300 字、M42 紧凑两行重开文案和一次重开状态。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- src/features/feedback/feedback-form.spec.ts`
Expected: FAIL，反馈校验模块尚不存在。

- [ ] **Step 3: 实现 M38-M43 并验证**

消息点击先标记已读再按 related_type/related_id 导航；M43 不显示内部安全规则。

Run: `pnpm test -- src/features/feedback && pnpm check && pnpm build:mp-weixin`
Commit: `功能：完成站内消息与反馈闭环`

### Task 11: 数据清空与账号注销 M44-M47

**Files:**

- Create: `src/features/account/account-service.ts`
- Create: `src/features/account/local-data-cleaner.ts`
- Create: `src/features/account/local-data-cleaner.spec.ts`
- Create: `src/features/account/deletion-presenter.ts`
- Create: `src/features/account/deletion-presenter.spec.ts`
- Create: `src/pages/account/index.vue`
- Create: `src/pages/account/clear-confirm.vue`
- Create: `src/pages/account/delete-confirm.vue`
- Create: `src/pages/account/deletion-pending.vue`
- Modify: `src/pages.json`

**Interfaces:**

- Produces: `clearLocalLearningData(scope)`；`presentDeletionState(dto, clock)`；M44-M47。
- Consumes: DELETE learning-data、POST deletion、POST deletion/revoke；Task 5 队列、Task 6 录音、Task 10 草稿清理接口。

- [ ] **Step 1: 写清理和注销失败测试**

覆盖确认值固定为 `CLEAR_LEARNING_DATA`、清空学习数据不清账号、申请注销清本地敏感数据、7 天绝对生效时间、注销期启动优先 M47、撤回后重新加载全部服务端状态。

- [ ] **Step 2: 运行测试确认 RED**

Run: `pnpm test -- src/features/account/local-data-cleaner.spec.ts src/features/account/deletion-presenter.spec.ts`
Expected: FAIL，账号领域模块尚不存在。

- [ ] **Step 3: 实现 M44-M47 并验证**

Run: `pnpm test -- src/features/account && pnpm check && pnpm build:mp-weixin`
Commit: `功能：完成数据清理与账号注销`

### Task 12: 响应式、视觉回归、端到端链路与最终门禁

**Files:**

- Create: `tests/e2e/learning-flow.spec.ts`
- Create: `tests/e2e/entitlement-flow.spec.ts`
- Create: `tests/e2e/feedback-account-flow.spec.ts`
- Create: `tests/visual/visual-cases.ts`
- Modify: `README.md`
- Modify: all pages/components only where screenshot comparison finds material deviations

**Interfaces:**

- Produces: 可重复执行的学习、权益、反馈、注销冒烟流程和 375x812、390x844、768x1024 截图清单。
- Consumes: Tasks 1-11 全部页面和 mock transport。

- [ ] **Step 1: 写端到端流程并先观察失败**

覆盖“静默登录→开放场景→点词→收藏→跟读→完成→翻卡”、正式权益、限时首次激活、反馈闭环、注销撤回。

- [ ] **Step 2: 完成手机和平板响应式**

同一组件在手机单列和平板 Grid 中重排；检查字体放大、正文不截断、无横向滚动、底部操作和 TabBar 安全区。

- [ ] **Step 3: 执行一次成组视觉检查**

对关键设计状态生成 375x812、390x844、768x1024 截图，与对应 PNG 逐页比较；一次性修复颜色、间距、字号、圆角、溢出和布局问题。

- [ ] **Step 4: 执行一次确认截图并运行 Impeccable detector**

Run: `C:\Users\Administrator\.agents\skills\impeccable\scripts\impeccable.cmd detect --json <changed-ui-targets>`
只运行一次 detector；按机械问题修正后不再开启无边界打磨循环。

- [ ] **Step 5: 运行完整门禁**

Run: `pnpm check`
Expected: exit 0，Prettier、ESLint、Stylelint、vue-tsc 全通过。

Run: `pnpm test`
Expected: exit 0，0 failures。

Run: `pnpm build:mp-weixin`
Expected: exit 0，生成微信小程序产物。

Run: `git diff --check`
Expected: 无输出，exit 0。

- [ ] **Step 6: 提交最终验收修正**

Commit: `优化：完成平板适配与全量验收`

## Plan Self-Review

- 需求覆盖：43 个正式页面映射到 Tasks 4-11；M01S/M05S/M09S/M09T 为页面状态；M04/M10/M11/M26 由 Task 3 兼容。
- 公共能力：基础组件、场景卡、音频、弹层、进度、录音、脱敏、校时和清理均有唯一实现与明确消费者。
- 类型一致性：所有领域 Service 只依赖 Task 2 的 DTO/HttpClient；页面只依赖领域 ViewModel、Store 和组件。
- 关键风险：Review Focus 五项均在 Tasks 2、5、9、11 中有明确失败测试。
- 比例检查：计划只固定文件、接口、测试行为、命令和提交边界，不预写实现函数体。
