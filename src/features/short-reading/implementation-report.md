# V1.5 独立短文纯阅读交付记录

## 已实现

- 独立列表、详情与安全预览路由；每次进入先检查 `short_reading` 模块开关，未开放时不请求正文。
- 英文自然段完整展示，整篇中文译文默认收起；类别及题材难度两个标签只切本次页面颜色，重新进入重置。
- 有全文音频时调用唯一 `useAudioStore`，使用短文资源签名；无音频时手机及平板均无播放器、占位和试听要求。
- 可主动标记读完；不调用场景进度、有效学习日、成就或场景完成事件。
- 独立进度队列保留版本、段落、单调递增 `client_sequence` 与命令重试幂等键。位置变化换键，相同命令网络重试保留键。
- 仅同版本且唯一段落 ID 的收藏来源恢复位置并临时高亮 2.5 秒；更新来源、旧版本和无法确认的定位从顶部进入，禁止旧 bookmark 覆盖。
- 失权、注销、切账号与清空学习数据同步丢弃正文、译文、位置、播放器及待提交命令；页面和列表监听 `session.cleanupGeneration`，迟到的模块、open、列表、进度和完成响应不能复原旧状态。
- 普通离页尽力提交已有最新段落；失权和清理不提交待写入。正文、译文、签名 URL 不持久化。
- 页面统计使用已存在的隐私同意机制；三个页面静态注册 `useAnalyticsPage`。

## 实际 BFF 接法

最终适配来源为 `juya-miniapp-api` 的 `modules/short_reading/router.py`、`domain.py`、`service.py` 和 `authority.py`，只读后端源码，未修改后端仓库。

| 方法 | 路径                                                                        | 契约                                                                                 |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| GET  | `/api/v1/short-readings?cursor=...`                                         | `{items, has_more, next_cursor}`，保持服务端列表顺序                                 |
| GET  | `/api/v1/short-readings/{id}/preview`                                       | 安全元信息白名单                                                                     |
| POST | `/api/v1/short-readings/{id}/open`                                          | 平铺 ReadingDetail                                                                   |
| PUT  | `/api/v1/short-readings/{id}/progress`                                      | `{content_version, paragraph_id, offset, client_sequence}`；返回平铺 ReadingProgress |
| POST | `/api/v1/short-readings/{id}/complete`                                      | `{content_version}` 和 `Idempotency-Key`；返回 `{progress, created}`                 |
| GET  | `/api/v1/short-readings/{id}/resources/{target}/signed-url?revision_id=...` | `{resource_id, url, expires_at}`                                                     |

线 DTO 使用 `paragraphs_en[].english`、`introduction`、`saved_content_version`、`whole_audio.target_id/resource_version/duration_ms`。页面适配成 `text`、`intro`、带版本的段落位置和 `short_reading_whole` AudioTarget。所有请求使用共享 HttpClient 与 runtime.shortReading，路径参数均编码。

BFF 的 `offset` 为字符数，uni-app 布局查询只能可靠测到段落及像素。当前跨会话恢复、向服务端提交均使用段落开头 `offset: 0`，本页切译文保留真实滚动位置，避免字符数与像素混用。

预览显式只保留元信息，不传播正文、译文、音频和进度。只有 TRIAL/FORMAL/LIMITED 可接受完整正文；完成响应核对短文 ID、版本及完成时间。

父集成负责 runtime、pages.json、MockTransport 接线、模块模拟开关、统一学习清理代次以及最终构建门禁。

## 模拟数据和设计依据

`src/services/mock/short-reading-fixture.ts` 导出 `handleShortReadingMock`，路径、方法及 DTO 对齐实际 public router。提供无音频短文、有音频短文和安全预览，包含独立进度与完成重放。未修改 `.env`。

有音频模拟仅使用既有本地静音文件验证全局播放、暂停和取消，不证明真实英语朗读验收。

Figma 文件 `evoGqXQ4pI3Q3cdLpc6NOc` 的 `2666:219/327/437/551/868/1090`、`2826:1320` 已读取 context 和截图；手机及平板分别适配布局，复用现有页面壳和导航，图标保存在本功能 assets。

## 验证证据

- 已执行必要 red→green：实际 BFF 字段和完成包装、授权正文拒绝、版本/ID 校验、清理后的迟到请求、队列失权竞态、正常离页保存、来源定位和保留身份清理。
- 2026-10-11 10:57：短文 6 个测试文件共 30 项通过，页面统计契约 48 项通过，共 78 项通过。
- 独占文件 ESLint、stylelint、Prettier 已通过。最后类型检查短文文件无错误；当时剩余并发新增的收藏 history-presenter 两处 AccessLevel 和学习进度测试 Promise 类型错误，已反馈集成执行者修复。
- H5 使用独立 `v15-reading` 浏览器会话、`127.0.0.1:5187`。375/390/414/768/1024 实际截图与溢出检查，完成两个标签、译文开关、无音频、有音频播放、列表、预览和标记读完验证。
- 截图在忽略目录 `.v15-artifacts.local/reading/`：`reading-{375,390,414,768,1024}-default.png`、`reading-390-selected-translation.png`、`reading-{768,1024}-translation.png`、`reading-390-audio-play.png`、`reading-1024-audio.png`、`reading-390-preview.png`、`reading-390-list.png`、`reading-1024-completed-no-audio.png`。
- 补充浏览器验证：`reading-1024-exact-source.png` 确认第二段临时高亮；`reading-1024-updated-source.png` 显示来源已更新且从顶部进入。

全仓库最终 check/test/H5/微信构建及 page-meta 验证由父集成执行者统一记录。

## 外部验收边界

实际 BFF 环境部署、数据库数据及发布授权、OSS 签名过期和 Range、真实英语音频人工试听、微信真机及正式环境、内容版权属于后续外部验收。这里的本地 fixture 与截图不替代这些证据。

列表顺序保持后端返回顺序；实际 authority 当前按 public_id 排序，后台编辑顺序需要后端交付证据后验收。

## 2026-10-11 剩余需求审计与补齐

本轮基线为 `50e453a`，对照完整需求第 30、33 章及技术方案 01、05、07；通过只读 `git show 6c86134` 核对已提交 BFF router/domain/service/authority/public_dto。没有修改其他仓库、共享状态、根 fixture 或环境变量。

| 需求                                            | 审计结果                                                                                                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 30.1 独立入口、服务端顺序、类别题材難度、无练习 | 已有实现保留；分页网络失败现在保留首批列表和原游标，允许原页重试；失权或游标失效仍清空并重新加载                                         |
| 30.2 同版本正文、译文与音频                     | 前端只消费已发布 DTO；新增 schema_version=2 和进度所属 ID 校验，拒绝不兼容或混合详情；后台编辑发布由上游负责                             |
| 30.3 全文翻译、标签、可选播放器、失败不阻读     | 已有纯阅读保留；全文 RESOURCE_NOT_FOUND 映射到可重试播放失败，不清正文和译文；真实失权继续清理；播放状态使用全局固定版本及内容上下文键   |
| 30.4 独立进度、读完、版本更新不重复计算         | 同版完成失败保持命令键，换发布版本换键；重新授权时优先恢复同版且序号更新的待保存段落；不调用场景进度或有效学习日；安全进度摘要缺口见下方 |
| 30.5 逐篇权限、安全白名单、失权清理             | 页面、签名和队列边界保留；增加签名资源 ID 一致性校验；获得访问权后的安全预览显示最新权限提示，但仍不自动加载正文                         |
| 30.7 手机平板、自然段、无词卡、来源鉴权         | 前一轮五视口验证证据保留；本轮没有改动阅读字体、卡片或音频布局；新增离页早于 nextTick 的高亮定时器清理                                   |
| 33.4 两标签独立、翻译音频不重置、重新进入清空   | 既有实现与测试保留，没有服务端筛选、收藏或讲解入口                                                                                       |

本轮新增 9 项回归测试均先观察预期失败再修复。短文 6 个测试文件共 39 项通过；独占文件 ESLint、stylelint、Prettier 与全仓类型检查通过。一次并发期间裸 `pnpm test` 为 599/603，失败仅为正在补齐的 `audio-machine.spec.ts` 旧 stop 次数期待及 `browser-recording-port.spec.ts` 三项录音异常生命周期；已反馈集成执行者，未修改这些文件。最终全套门禁及真实无 Mock 浏览器证据由集成执行者统一收口。

### 上游代码缺口与外部验收分开记录

- 已提交 `ReadingPreview` 没有 `progress_summary`。因此真实列表“已读完”及到期后安全进度摘要目前缺少上游 DTO/数据装配，前端不使用缓存或猜测字段替代。前端既有可选字段适配和安全展示可在上游提交实际契约后复核。
- 已提交 authority.preview 读取 `cover_asset_id` 后将其排除，没有解析或设置 `cover_url`；配置的安全封面尚不能显示。前端可展示实际返回的 cover_url，没有封面仍合法阅读；安全素材取址需要上游提交实际实现。
- 运营列表排序保持上游返回顺序；新的运营顺序契约尚未提交时不推测字段或在前端机械交替。
- 真机、朗读人工试听、OSS 签名/Range/过期、版权和正式环境是外部验收事项；上述 DTO/封面装配属于上游代码事项，不能归作仅外部验收。
