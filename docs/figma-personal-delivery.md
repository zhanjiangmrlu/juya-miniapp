# 个人页面 Figma 还原交付

本次完成收藏、档案、联系资料、学习权益、反馈、数据与账号共 28 个设计状态。页面按服务端当前数据渲染；收藏数量、历史成果、权益期限和注销日期没有使用画板示例值作为业务数据。交付日期为 2026 年 10 月 2 日。

## 页面对应

设计来源为 Figma 文件 evoGqXQ4pI3Q3cdLpc6NOc 的 2480 分组，已逐个读取设计上下文和截图。M26 不在本次 28 状态范围。表中占位标识应替换为当前账号服务端返回的记录标识；翻卡应从银行入口建立完整队列。

| 状态 | 设计节点                                                                                  | 路由                                                    |
| ---- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| M19  | [词汇银行](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-245)          | `/pages/favorites/index`                                |
| M20  | [语块银行](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-299)          | `/pages/favorites/phrases`                              |
| M21  | [收藏详情](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-353)          | `/pages/favorites/detail?id=<favoriteId>`               |
| M22  | [来源选择](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-407)          | `/pages/favorites/sources?id=<favoriteId>`              |
| M23  | [翻卡正面](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-461)          | `/pages/favorites/review-front?bank=VOCABULARY&index=0` |
| M24  | [翻卡背面](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-515)          | `/pages/favorites/review-back?bank=VOCABULARY&index=0`  |
| M25  | [学习历史](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-569)          | `/pages/favorites/history`                              |
| M27  | [学习档案](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-626)          | `/pages/profile/index`                                  |
| M28  | [首次联系提示](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-680)      | `/pages/profile/contact-prompt`                         |
| M29  | [完善联系资料](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-734)      | `/pages/profile/contact-edit`                           |
| M30  | [管理联系资料](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-788)      | `/pages/profile/contact-manage`                         |
| M31  | [联系资料更正](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-842)      | `/pages/profile/contact-correction`                     |
| M32  | [学习权益](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-899)          | `/pages/entitlement/index`                              |
| M33  | [限时待开始](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-953)        | `/pages/entitlement/pending?id=<entitlementId>`         |
| M34  | [限时学习中](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1007)       | `/pages/entitlement/active?id=<entitlementId>`          |
| M35  | [限时即将结束](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1061)     | `/pages/entitlement/ending?id=<entitlementId>`          |
| M36  | [限时结束成果](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1115)     | `/pages/entitlement/ended?id=<entitlementId>`           |
| M37  | [限时异常摘要](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1169)     | `/pages/entitlement/exception?id=<entitlementId>`       |
| M38  | [消息列表](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1226)         | `/pages/feedback/messages`                              |
| M39  | [本人反馈](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1280)         | `/pages/feedback/index`                                 |
| M40  | [提交反馈](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1334)         | `/pages/feedback/create`                                |
| M41  | [详情与补充](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1388)       | `/pages/feedback/detail?id=<feedbackId>`                |
| M42  | [反馈解决确认](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1442)     | `/pages/feedback/resolution?id=<feedbackId>`            |
| M43  | [安全拦截后修改](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1496)   | `/pages/feedback/content-blocked`                       |
| M44  | [数据与账号](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1553)       | `/pages/account/index`                                  |
| M45  | [清空学习数据确认](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1607) | `/pages/account/clear-confirm`                          |
| M46  | [注销挽留与确认](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1661)   | `/pages/account/delete-confirm`                         |
| M47  | [待注销与撤回](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2480-1715)     | `/pages/account/deletion-pending`                       |

## 组件和素材

个人范围共用 PersonalPage、PersonalRow、PersonalSummary；收藏列表、来源列表、翻卡、档案身份、服务入口、联系表单、反馈表单和时间线均有独立组件。沿用共享 PageHeader、AppTabBar、AppButton 及原始 /static/home/tab-*.svg 图标，未新增整页位图、CSS 图形或模拟设计图片。头像按接口 URL 显示，缺失时显示文字占位。

390 像素布局保留画板的标题、淡绿摘要、白色信息行、绿色主按钮与米色背景。375 像素和 768 像素自适应；个人内容最大宽度 560 像素。底部空间随共享底栏实际缩放调整，长内容可以滚动，动作按钮不会在滚动到底后被底栏覆盖。真实接口增加的来源、场景或权益不会为凑画板行数而截断。

## 业务链路

- 收藏遍历全部游标页、去重并保留两银行独立筛选与滚动位置。同展示键详情重新获取所有关联记录的最新权限，保留所有来源；原文地址携带 sceneId、sourceLocator、revisionId、entryVersion、entryId。无权限来源只读保留。取消收藏作用于该展示组。
- 翻卡使用银行完整队列，音频独立于翻面。创建会话与完成复习各自保留固定幂等键；完成失败重试复用同一会话。正反面切换保留队列、卡片位置及已创建会话。
- 学习历史保留无权限场景的进度、收藏摘要和日期，只有目录仍可访问的场景提供正文入口。
- 档案读取本人资料、联系资料、首页红点和完整消息列表。联系提示需服务端 eligible、未填微信号、本机未实际曝光；页面仍可见且完成渲染后才记曝光。离页使旧请求失效，曝光补记使用原幂等键。
- 联系表单要求主动确认用途。自助修改次数和状态由服务端控制；更正申请将新微信号与原因组合到正式 API 的 reason，合计不超过 500 字，不提交未支持的 proposed_wechat_id。
- 正式权益校验生效与结束时刻；限时权益按服务端时钟、状态及该活动固定 scene_ids 投影。待开始页面进入实际活动场景后由场景接口激活；已结束、暂停、撤销或启动过期仍可查看保留摘要。状态改变时带 id 的旧地址自动跳转当前状态页。
- 结束成果读取对应活动 achievements 的 completed_scenes、learning_days、favorite_vocabulary、favorite_phrases，缺失值显示“—”；不使用全局连续天数或第一个场景结果替代。
- 创建反馈默认内容问题，相关页面可选择或从场景入口自动携带。问题说明最多 300 字，截图最多 1 张且为 JPEG、PNG 或 WebP，不超过 5 MiB。实际 H5 文件选择支持 blob 路径的 MIME 类型。上传失败、提交失败和安全拦截保留本机草稿；成功后清空旧来源。
- 补充留在同一反馈记录，包含文字与可选截图。解决确认校验 7 天期限与最多一次重开，重开须填写原因。查看详情同步已读关联反馈消息，消息列表遍历全部游标页。
- 清空学习数据等待服务端成功后清本机学习缓存，身份、联系资料、权益继续保留。注销确认读取完整收藏、已完成场景、打卡及当前权益；申请受理后进入等待期。撤回成功刷新本人资料、首页、目录、收藏和权益。
- 待注销状态每次显示都读取本人最新状态，倒计时使用 entitlements.server_now；缺失服务端采样时显示“以服务端时间为准”。PENDING 仍可提交撤回，真实期限由服务端判定，避免设备日期超前阻断合法撤回。

## 验证证据

2026 年 10 月 2 日的本次工作区验证：

| 验证                                 | 结果                                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| pnpm test                            | 58 文件、173 tests 通过                                                       |
| pnpm check                           | 全仓格式、ESLint、stylelint、类型检查通过                                     |
| pnpm build:h5                        | 通过，独立产物 dist/personal-production-h5                                    |
| pnpm build:mp-weixin                 | 通过，独立产物 dist/personal-production-mp                                    |
| 28 状态 × 375×812、390×844、768×1024 | 84 张截图，无横向溢出、页面脚本错误、空白图片                                 |
| 长内容动作按钮                       | 滚动到底后按钮均完整露出，不被底栏覆盖                                        |
| 浏览器交互                           | 13 项通过，包含复习失败重试、联系用途确认、更正请求、补充反馈、重开与撤回刷新 |
| 非 mock 真实 HTTP H5                 | 收藏列表/详情、本人档案、权益/目录、消息接口均成功，无页面脚本错误            |
| 实际 H5 文件选择                     | PNG 选择、缩略预览和删除成功                                                  |
| 独立只读代码复核                     | 三项 P2 修正后复核通过，无未闭环的重要发现                                    |

本机证据位于 dist/personal-visual，目录为构建忽略产物，不纳入个人代码提交：

- report.json：84 状态截图的路由、尺寸、几何位置、图片加载和动作可达性
- M19-375.png 至 M47-768.png：28 状态三个尺寸截图；另有 4 张长内容滚动截图
- flows.json：13 项交互断言及对应请求，使用隔离浏览器接口 fixture 验证状态和载荷
- live.json：9 项实际 H5 与本地 FastAPI 联调断言，只记录路径和状态，不含认证令牌
- live-favorite-detail-390.png、live-profile-390.png、live-feedback-create-390.png：实际接口页面
- dist/personal-visual.cjs 与 dist/personal-live.cjs：本次本机检查脚本

截图状态通过独立的浏览器 API fixture 提供画板所需数据，不修改生产页面的数据逻辑。真实 HTTP 检查使用 H5 同源代理到本地 8091 服务，VITE_USE_MOCK_API=false。浏览器实际读取 favorite-evolved 并显示 evolved，证明运行页面没有绑定画板 latte 示例。13 项写操作断言属于 fixture 交互证据，不能据此宣称生产数据写入验收。

独立审查发现并关闭了三项问题：聚合收藏详情来源遗漏、离页后误记联系提示曝光、设备时间超前阻断注销撤回。对应 7 项回归测试先复现失败、再修正通过；复核未修改文件或提交。

## 验收边界

个人范围已完成实现、自动化检查、三个尺寸 H5 截图和本地真实 HTTP 读取集成。共享壳、路由、后端字段及正式接口扩展由统筹范围负责，本次提交不包含其文件。微信开发者工具的整体联调由统筹统一执行。

生产权限与数据写入、真实 OSS 上传、微信真机图片选择、音频试听与录音、弱网和真实七天注销期仍需对应环境验收。本次未把构建通过、fixture 写操作或本地读取验证当作这些验收结果。

统筹已将最终截图与 report/flows/live.json 从忽略构建目录归档至 [稳定证据目录](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb37-f720-7460-bb49-94586f3b6d5d/personal-final/personal-visual)。最新全仓门禁以 [集成验收记录](figma-integration-acceptance.md) 为准。
