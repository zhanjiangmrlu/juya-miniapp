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
