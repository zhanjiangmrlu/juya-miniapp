# 友盟小程序统计接入与验收

实施日期：2026-10-09。范围：微信小程序增长、学习及权益入口；H5 不加载 SDK，不上报。现有后端业务统计、登录接口和数据库保持现有口径。

## 配置与平台准备

项目锁定 `umtrack-wx@2.8.0`。构建同时校验 SDK 原文件 SHA-256；更新依赖时必须重新验证隔离及撤回，不能直接更新指纹绕过检查。

默认建议开发与正式环境分别创建友盟小程序应用，使用不同 AppKey。2026-10-09 用户明确要求本地也使用已提供的同一个 AppKey，当前本机开发与正式配置按此要求启用；本地测试行为会进入该应用的统计。实际账户配置通过本机环境文件或构建环境注入，仓库不保存微信 AppSecret。环境变量示例：

```dotenv
VITE_ANALYTICS_ENABLED=true
VITE_UMENG_APP_KEY=填写当前环境的友盟AppKey
```

未配置时默认不开启统计。2026-10-09 用户提供 AppKey 后，当前工作区已在 Git 忽略的 `.env.production.local` 配置正式构建统计；按用户后续指示，Git 忽略的 `.env.development.local` 也启用统计并配置相同 AppKey，既有 API 等环境设置保留。正式构建使用 `pnpm build:mp-weixin`，本地开发使用 `pnpm dev:mp-weixin`；修改环境文件后须重启开发编译器，确认 `dist/dev/mp-weixin` 使用新配置。AppKey 缺失、格式错误、微信能力不存在或 SDK 故障时降级，不影响业务。AppKey 是客户端应用标识，不是微信密钥；友盟账号凭据及微信 AppSecret 不进入代码。

微信公众平台的 request 合法域名须包含 `https://umini.shujupie.com` 和本 SDK 使用的备用地址 `https://ulogs.umeng.com`。开发者工具关闭域名校验不能代替真机验证。未启用云配、AB 测试、OpenID、UnionID、应用账号关联或用户资料上传。

官方依据：[微信集成文档](https://devs.umeng.com/docs/147615/detail/147619)、[uni-app 示例](https://github.com/umeng/mp-demos/tree/master/uniapp)、[自定义事件说明](https://devs.umeng.com/docs/147615/detail/170056)、[隐私政策](https://www.umeng.com/page/policy)。

## 运行和授权边界

首次可见路由页在配置完整时说明用途，提供「同意」「暂不开启」；拒绝也能继续全部现有业务。未知授权不创建 SDK、不读取 SDK 设备信息、不缓存事件。拒绝后不重复提示；可以在「我的学习档案 → 数据与账号 → 使用情况统计」重新开启。

统计同意独立保存状态和说明版本，与联系资料同意、微信平台隐私授权分开。版本变化重新确认。账号页精简为一行「使用情况统计」开关；用途和友盟隐私政策地址在首次提示或用户主动开启时展示，第三方 SDK 详细披露仍须按 `docs/privacy/analytics-sdk-disclosure.md` 发布到产品隐私说明。

Vite 静态包装原 SDK 内容为实例工厂，向它注入独立微信端口和可取消的计时器；SDK 的 App/Page/Component 挂接只接触工厂局部对象，`wx.uma` 只存在于私有端口。正式运行不使用 eval，不改写全局页面函数。

每个真实路由页注册一次显示、隐藏、销毁统计；隐藏及销毁只结束一次，返回重新开始。授权在页内生效时只统计当前剩余可见时间，不倒推授权前的访问。前后台应用会话由 App 生命周期驱动。

热启动使用本次 `onShow` 清洗后的场景、路径和来源，不沿用初次冷启动值。只有没有生命周期来源时才回退 `getLaunchOptionsSync()`。

撤回顺序：关闭采集 → 失效授权代次 → 取消定时器/在途请求/监听 → 清理 `juya.analytics.sdk.<AppKey>.` 专属缓存 → 丢弃 SDK 实例。已发出的数据无法通过本地开关撤回。重新开启使用新实例，不发送旧授权期间延迟返回的业务结果。缓存清理保留业务令牌、进度、联系资料和统计同意状态。

统计故障不显示业务错误，不重试业务提交，也不新增业务事件补发队列。成功事件可能因未同意、断网或退出漏报。友盟随机用户标识换设备或清缓存后可能改变，不能直接与后台账号用户数、业务留存或完成量对等比较。

## 埋点字典

每个事件只允许表内属性及公共 `page_code`、`client_version`、`event_schema_version`。业务属性只传受控字符串；未知事件、额外属性、URL、正文、对象与无效值整条拒绝。可选属性未提供时省略，不填造值。

| 事件 ID                 | 时机                                                    | 业务属性                                                                                           |
| ----------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| scene_click             | 用户点击目录场景                                        | content_scene_id、access_level（allowed/preview）、entry_source                                    |
| access_notice_view      | 无权限提示组件实际挂载                                  | content_scene_id、access_level、entry_source                                                       |
| scene_open_success      | 当前请求加载完整场景成功；同一页面后台重验不重复        | content_scene_id、content_revision_id、access_level                                                |
| learn_complete_success  | 当前页面收到完成接口成功；本次访问和修订去重            | content_scene_id、content_revision_id                                                              |
| audio_play_start        | 收到设备真实 play 回调；每次用户发起播放记一次          | content_scene_id、content_revision_id、entry_type                                                  |
| entry_popup_view        | 当前有效请求打开词汇/语块弹层                           | content_scene_id、content_revision_id、entry_type                                                  |
| favorite_add_success    | 当前有效收藏请求成功                                    | content_scene_id、content_revision_id、entry_type                                                  |
| review_start_success    | 首张有效卡片就绪、服务端复习队列创建成功；按创建键去重  | entry_type                                                                                         |
| review_complete_success | 服务端复习完成成功；按原完成幂等键去重                  | entry_type                                                                                         |
| entitlement_view        | 当前可见权益页成功加载并渲染                            | access_level（页面展示状态）                                                                       |
| contact_prompt_view     | 档案提示实际渲染；复用本次曝光键，不补报历史曝光        | entry_source=profile_prompt                                                                        |
| contact_entry_click     | 用户主动点击联系入口                                    | entry_source=profile/profile_prompt/access_notice                                                  |
| contact_save_success    | 当前页面保存请求成功                                    | entry_source=contact_fill/contact_update                                                           |
| share_initiate          | 微信调用用户发起的好友/朋友圈分享钩子，不表示发送成功   | share_channel=friend/timeline、share_target=home/scene、content_scene_id、entry_source=button/menu |
| share_landing           | 带受控来源字段的首页/场景详情首次加载；进入时已同意统计 | share_channel=friend/timeline、share_target=home/scene、content_scene_id                           |

内容 ID 不拼进事件 ID。请求开始时捕获授权代次，返回时必须仍在同一授权及可见页面；未授权发起的请求不能在随后同意时记为成功。

Ruling：复习原来只在完成时创建服务端会话。为了准确统计开始，改为首张有效卡片加载后创建，后续翻面和完成复用原创建键、会话和完成键。无效卡片或加载失败不会创建；没有改变复习完成接口和服务端去重规则。

## 友盟后台配置

在测试和正式应用分别登记上述 15 个事件及固定参数类型。设置三组业务漏斗及分享分析：

1. 学习入口页 → scene_click → scene_open_success → learn_complete_success。
2. 收藏页 → review_start_success → review_complete_success。
3. contact_prompt_view → contact_entry_click（profile_prompt）→ contact_save_success（contact_fill）。contact_update 单独统计。
4. 分享分析：按 share_target 和 share_channel 查看 share_initiate 与 share_landing。两者是聚合行为数，没有分享者或接收者账号关联，不能直接算单次分享送达率，也不作为分享成功或独立用户数。

访问来源、页面浏览/时长及随机标识留存使用 SDK 能力。SDK 来源只保留微信场景值、静态入口路径和来源小程序 AppID，不传任意 query。分享回流自定义事件只读取白名单来源字段，不关联分享者身份。没有支付或分享完成事件。正式权益开通量在原业务后台核对。

## 微信分享统一封装

`src/shared/use-wechat-share.ts` 中 `useWechatShare(options, hooks)` 统一负责好友/朋友圈参数、菜单生命周期、公开封面和两类分享埋点。首页传 `ShareTarget.HOME`；场景详情传 `ShareTarget.SCENE` 和返回 `{ sceneId, title }` 的响应式 getter。原生 `onShareAppMessage`、`onShareTimeline` 在路由页显式导入并传入 hooks，以便当前 uni-app 编译器生成分享运行时标记；页面不复制分享实现。

首页右上角微信菜单提供好友及朋友圈分享。场景详情内容加载后，右上角菜单可分享，并提供「分享这个场景」好友按钮。加载中、无权限或页面隐藏时不记发起事件。学习子页、学习进度、个人档案、账号、联系资料和反馈页未启用分享；H5 不注册微信分享钩子，也不显示分享按钮。

好友分享落地为首页或 `/sub-packages/scene/detail?sceneId=...`；朋友圈沿用当前页面，仅设置 query。链接只含 `share_channel`、`share_target`，场景链接额外含 `sceneId`，不携带账号、Token、签名素材地址或学习进度。封面固定为公开的 `/static/share/juya-share@3x.png`（1200×960，24,903 字节），禁止采用默认页面截图或场景原图。场景标题只取场景中文标题，不包含正文或用户资料。接收者沿用既有场景加载接口校验自己的访问权限。

回流按落地页首次 `onLoad` 计数，前后台恢复或从分享面板返回不重复记；已存在页面仅恢复时不会增加回流。进入时未知/拒绝统计不保留来源，同意后不补报。进入时已同意但 SDK 尚未就绪，仅暂存本次白名单来源，离开该页面、退后台、初始化失败或撤回立即丢弃。分享功能不依赖统计开关，微信菜单或统计异常安静降级。

平台依据：[uni-app 分享说明](https://uniapp.dcloud.io/api/plugins/share.html)、项目锁定版本的 `@dcloudio/types` 分享钩子定义及实际微信编译产物。小程序分享必须由用户主动触发；没有可靠发送完成结果，本项目不设置分享 success 回调来制造成功事件。

真机验收需覆盖首页好友/朋友圈、场景好友按钮及菜单、接收方未登录/无权限/有权限、朋友圈单页模式、冷/热打开、取消分享、返回分享面板、拒绝/撤回统计后分享、低版本微信和封面展示。新事件仍需在友盟后台登记及核对接收，自动化与本地构建不替代体验版验收。

分享扩展本地验收（2026-10-09）：`pnpm check`、全量 94 个文件/423 项测试及微信、H5 构建通过；微信产物仅首页和场景详情包含两种分享钩子（`__runtimeHooks=6`）。最终主包文件合计 486,737 字节（约 475 KiB）；公开封面源文件与微信构建产物 SHA-256 一致。H5 无统计请求域名、微信分享菜单参数或分享按钮文案，框架通用生命周期名称仍属于框架代码。只读审查未发现 P1/P2；指出的迟到朋友圈回调边界已通过失败后通过的测试修复：失效后保留合法路由场景 ID，采用固定公开标题、封面，仍不记发起事件。

## 验收记录和外部边界

- 已完成：SDK 固定版本及指纹；真实 SDK 隔离和撤回测试；统一授权状态机；44 个路由入口；业务成功事件及首次提示/设置开关。
- 本地检查：`pnpm check`（格式、ESLint、Stylelint、类型）全部通过；`pnpm test` 为 93 个测试文件、410 项测试通过。
- 构建：`pnpm build:mp-weixin`、`pnpm build:h5` 通过；微信 10 个相关页面的 page-meta 保持固定首节点。H5 产物不含友盟 SDK 或两个统计请求域名。
- 包体：配置用户 AppKey 后的正式微信构建主包文件合计 458,007 字节（约 447 KiB，不含普通子包）；这是本地文件测量，不是微信上传审核结果。
- 开启分支：仅在独立子进程设置非有效验证标识 `integration-test-key` 和统计开关，构建到 `dist/analytics-verification/mp-weixin`；44 个路由及 page-meta 校验通过。没有用该标识向友盟验证收数；普通构建不含此验证标识，真实环境文件未改动。
- 独立代码审查：完成。发现并修复热启动来源使用冷启动信息的问题，新增回归已通过；未留下明确 P1/P2。审查者仅做只读检查，未修改或提交代码。
- 外部准备：用户已提供一个 AppKey，并明确授权本地及正式构建使用同一个应用标识；未访问控制台确认应用类型、登记事件、配置漏斗或修改微信后台合法域名。Git 忽略的本机环境文件仅更新统计开关及 AppKey，API 等原设置保持原值。
- 首次正式配置复核：当时 production 统计开启、development 统计关闭；正式微信产物包含已提供的 AppKey，授权、SDK 撤回、设置开关与联系事件的 18 项定向回归通过。
- 本地配置复核：按用户后续指示，Vite development 和 production 均读取同一个 AppKey 且统计开启。已重启确认属于本项目的微信开发编译器，`dist/dev/mp-weixin` 构建完成并确认包含该 AppKey；10 页 page-meta 校验通过，授权状态机、真实 SDK 隔离与设置开关的 18 项定向回归通过。仍须用户明确同意才创建 SDK；没有向友盟模拟用户事件来证明后台收数。
- 待真实验收：体验版 iOS/Android 来源、事件参数、页面返回和撤回请求；友盟后台接收；正式发布后的报表对账。自动化不替代以上验收。

上线条件：隐私说明及 SDK 清单发布到产品实际使用位置；平台隐私配置与采集一致；完成受控联调和真实设备收数核验；正式版 debug/enableVerify 固定关闭。回退时设置 `VITE_ANALYTICS_ENABLED=false` 并重新构建发布。
