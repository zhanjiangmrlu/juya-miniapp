# 当前披露与实际状态（2026-11-11）

CHG0041用户新决定覆盖旧SDK披露范围。本版测试及生产均不装载真实友盟SDK，旧VITE_UMENG_ENABLED和后端client_transport不能恢复；SDK2.8.0含设备型号及自动会话，不符合严格五类成功事件与最小引用的范围。新[隐私指引](privacy-chg0041-20261111-v2.txt)及[可选统计说明](analytics-chg0041-20261111-v2.txt)为v2，用户协议仍沿用chg0040-20261110-v1；旧scope不继承新许可。下文旧接入分析仅作历史核查，不能作为重新启用授权。

常驻路径账号→设置→隐私说明，游客公开可查；许可状态与未运行状态分别展示。真实统计关闭期间不伪称accepted、不建立分析收据、不缓存未来补报。必要收藏、进度、成绩及打卡继续按原业务规则。

---

# CHG-0040 文案依据与核实边界

核对日期：2026-11-10。规则依据仅使用微信、友盟、阿里云及政府机关公开的一手资料；第三方转述未作为规则依据。正文是按本项目实际功能独立起草的文案，没有套用其他 App 的隐私模板。

## 官方资料

1. [微信：小程序隐私协议开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)
   - 已直接读取官方页面正文，页面标注最后编辑于 2026-07-28。
   - 工具的网页正文服务无法打开该域名时，使用 Python urllib 直接请求相同官方 URL，识别并解压 gzip 后读取 main 正文；没有依赖第三方镜像。
   - 采用的规则：按实际处理内容配置指引；调用对应隐私接口前完成必要声明和用户明确同意状态同步；拒绝需要有失败处理；平台授权步骤不能由自建协议文本替代。
2. [微信：小程序用户隐私保护指引内容介绍](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/miniprogram-intro.html)
   - 同上方式读取完整 main 正文，页面标注最后编辑于 2026-07-28。
   - 采用的规则：填写真实主体、联系方式、信息用途和保存期限；可通过补充文档说明小程序内的权利入口；补充文档是纯文本且不超过100KB。
   - 与本项目相关的当前接口映射：chooseAvatar/nickname 对应头像昵称；chooseImage/chooseMedia 对应选中照片。原政策链接复制API已取消，页面改为完整第三方披露和可选中文本URL，不再为了政策阅读调用剪切板接口，因此无需为该已移除功能新增剪切板信息类型。SDK埋点验证继续保持关闭。
3. [友盟：微信小程序统计SDK集成说明](https://devs.umeng.com/docs/147615/detail/147619)
   - 已通过联网工具读取官方正文。该说明适用于 2.3.2 及以上；具体集成包须另行核对。
   - 采用的事实：useOpenid=false 使用随机ID；自动获取OpenID、上传用户信息、埋点验证可配置；埋点验证可能使用剪切板；SDK 本身有客户端缓存和发送策略。仅设置业务开关不足以证明SDK自动行为已经停止。
   - 页面默认值与示例不是本项目配置；本项目是否实际采集某字段以最终构建和请求解码核验为准。
4. [友盟：公开隐私政策](https://www.umeng.com/page/policy/)
   - 已通过联网工具读取；所返回页面标示生效日期为 2021-10-29，列示友盟同欣（北京）科技有限公司、北京锐讯灵通科技有限公司。
   - 采用的规则：应披露实际接入的SDK及用途，获得授权后再初始化，并结合具体产品核对数据范围。
   - 该页面提供跨产品通用说明，不能把其中 App 设备标识/权限模板直接当成微信小程序的实际采集清单。该原文包含多种二次处理场景，接入前还须核实所选服务的合同、可选功能、独立处理者角色及退出/删除协助路径。
   - 链接时效注意：同日访问 [友盟另一官方入口](https://www.umeng.com/policy) 跳转到 https://developer.umeng.com/docs/147377/detail/3038360，但工具未返回可读正文；[policy.html](https://www.umeng.com/policy.html) 的搜索摘要与打开正文返回版本不一致。草案沿用项目现有公开链接，发布前应在真实浏览器核对当前最终政策及适用主体，不把缓存摘要当成最终版本。
5. [国家网信办：中华人民共和国个人信息保护法](https://www.cac.gov.cn/2021-08/20/c_1631050028355286.htm)
   - 官方公开文本经联网检索核对；[市场监管总局公开全文](https://www.samr.gov.cn/zw/zfxxgk/fdzdgknr/bgt/art/2023/art_f374e8245320413181742e6d1baf4366.html)用于交叉核对。
   - 草案所涉重点：第14—19条的明确选择、便捷撤回、告知与最短保存；第21—25条的委托及对外提供；第28—31条的儿童信息；第44—50条的个人权利。没有把法定义务写成当前已完成某项清理的事实。
6. [阿里云：隐私政策最新入口](https://help.aliyun.com/zh/document_detail/2705226.html)
   - 从官方“法律声明—阿里云隐私政策—最新”逐级读取，使用其现行政策入口，避免把检索返回的历史版本列为现行规则。
   - 官方政策中的服务方定义为阿里云计算有限公司；只引用服务方及公开规则入口，不把阿里云App的SDK权限当作句芽小程序处理范围。实际OSS地域与外部审核状态来自下列目标环境只读核对。

## 用户确认与目标环境事实更新

- 用户通过主代理明确允许公开：服务提供者名称“句芽英语”、个人信息保护邮箱 juyaenglish@163.com。使用服务名称，不宣称它是已验证工商登记企业名，不编造联系地址。
- 用户明确选择保留友盟，允许如实披露SDK必要基础信息、自动会话/页面指标及五类业务事件；这已替代最初“只允许最小五事件”的范围。独立明确同意、有效登录、当前版本、有效配置、撤回即停及换号隔离继续适用；原始OpenID/UnionID、登录凭据与个人输入仍禁止。
- 主代理只读核实实际测试 mini Settings：environment=test，storage_backend=oss，oss_region=cn-shenzhen，OSS主机为深圳官方端点；feedback_safety_enabled=false，未配置审核服务主机；会话有效期配置7天。正文不把7天会话期写成所有个人信息保存期。
- 业务服务中国境内、对象存储中国深圳事实按主代理确认纳入草案；没有独立核实生产配置，因此不得把测试事实直接当作生产验收。
- 保存期限按提供相应功能所必要期间及法定要求表述，权利请求通过公开邮箱人工处理并依法及时答复；未承诺固定15天/30天、自动注销或历史删除已完成。备份轮换、分项期限制度与第三方具体期限仍在metadata保留待核实状态。

## SDK探针对应的数据披露

已读取同一工作区sdk/feasibility-report.md和sdk/probe-result.json。探针对锁定umtrack-wx2.8.0执行内存捕获，仅用fixture数据，没有真实网络发送。草案按以下类别披露；最终受控适配仍须核验不能仅据探针声称接通：

| 数据类别            | 探针中的键                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| SDK/应用/环境       | h.dt、sv、ak、device_info（探针为空）、appid、app_env、app_version、sdt、platform                                                |
| 系统/微信/语言/机型 | h.psv、pv、os、ov、lang、dm、db、dmf、did、dn；did在此版本来自model，不是IMEI                                                    |
| 屏幕与显示/性能     | h.rl、pr、fss、t5、bml、sbh、sat、sal、sar、sab、sah、saw、sw、sh、hs                                                            |
| 网络                | h.ac；连接本身的IP地址由接收服务处理                                                                                             |
| 随机标识与账号      | h.it、itr.ud（友盟UUID）、itr.puid、a.active_user.puid/provider；禁止历史um_unid污染和原始OpenID/UnionID                         |
| 会话/事件控制       | h.st、ts、ttn（关闭验证时为空）、traceId；a.sn会话id/start_time/end_time/duration/options.scene及pages；a.e内事件id/ts与允许属性 |
| 自定义业务事件      | page_enter、content_open、audio_play、favorite_change、learning_complete                                                         |

不将云配置、A/B、自动分享或健康探测等额外通道默认为本次允许范围。最终适配若未阻断这些行为，必须先修正实现或重写披露并取得所需新许可，不能直接把“SDK必要”作为无限扩展范围。

## 当前源码依据

以下均为 2026-11-10 本地工作树的只读核对，未据此推断远程已部署或生产已上线：

- API src/juya_api/auth.py：主动微信 code 交换；OpenID 经 lookup 形成匹配标识；句芽内部账号、会话；退出仅撤销会话。
- API src/juya_api/profile_api.py：主动编辑昵称头像；联系方式旧提交接口410；当前没有自助注销/个人数据删除入口。
- API src/juya_api/learning_models.py、listening_models.py：收藏、完成、按日打卡与听读进度；不把它们等同于第三方分析事件。
- API src/juya_api/feedback_api.py、feedback_models.py：本人反馈、选中图片、补充及回复、阅读状态；接口需要 learner 身份。
- API src/juya_api/feedback_safety.py、storage.py、config.py：反馈安全检查可向可配置网关发送文字/图片；存储可以是本地或OSS，需核实实际环境，不能按依赖包猜成已启用。
- API deploy/render-nginx.py：版本化访问日志为时间、环境、服务、类别、方法、状态、耗时、请求ID；不能据此声称所有实际代理层均不处理IP，也不能凭此声称日志保存固定天数。
- API src/juya_api/privacy_contracts.py、privacy_service.py、privacy_api.py：terms/privacy/analytics 三类文件；非空完整正文目录；确认版本、账号独立统计选择及修订；五事件、属性白名单；真实 receiver 未启用时拒绝接收。
- 小程序 src/services/analytics.ts：真实调用硬关闭，available=false；src/shared/constants/privacy.ts 定义五事件和六类属性键。
- 小程序 src/services/privacy-service.ts：按账号保存独立选择、撤回先本地关闭、版本核对及身份切换保护。
- 小程序 src/components/app-privacy-sheet/app-privacy-sheet.vue：游客公开说明、独立开关、当前未运行文案、三份正文入口。
- 小程序 src/features/profile/components/profile-page-view.vue：游客可以打开隐私说明，“我的反馈”位于已登录分支；反馈 index/create 亦调用 account.ensure。
- 小程序 src/sub-packages/account/policy.vue：当前完整展示本项目第三方统计披露与可选中的友盟官方URL，不再调用剪切板API；本项目披露正文与友盟官方原文区分。
- 小程序 docs/operations/umeng-analytics.md：只把顶部 CHG-0040 关闭状态作为当前说明；下方32事件及登录勾选联动是明确标注的历史记录，不纳入正式披露。

## 文案落地方式

- terms.txt、privacy.txt、analytics.txt 是三份用户可读全文草案。
- documents.draft.json 与现有 PolicyDocument 契约一致，每项只有 kind/version/title/content，可在核实替换后作为私有政策配置的输入。
- metadata/questions.json 是事实核实清单；metadata/manifest.json 标记未就绪和禁止直接发布，不是向用户展示的正文。
- 最新三份正文已替换事实占位，可供集成审阅；manifest仍标记publication_ready=false，因为第三方具体保留规则、最终SDK控制与微信后台实际声明需要进一步核验，不能仅凭正文无占位认定整体就绪。
- 当前文案已由主代理按条件启用方式落仓，private正文同步该版本；补齐正文不代表真实SDK或数据接收已验证，也不自动授权修改远程配置或发布。
- 三份草案拟定更新/生效日期均为2026年11月10日；若实际发布不在该日，需同步更改日期和适用版本。正文已由主代理改为默认关闭、满足当前账号及许可等条件时启用，状态需与真实运行一致。播放事件口径已改为用户主动播放且播放器报告实际开始才记录，失败点击不记。

## 最后补核实：SDK四接口及复制入口取消

已逐页直接读取微信官方getSystemInfo、getNetworkType、getAccountInfoSync、getLaunchOptionsSync、requirePrivacyAuthorize文档，并再次核对官方隐私接口映射和指引填写说明。完整结论与URL见wechat-sdk-api-privacy-audit.md。

- 四个SDK API均未列于官方隐私接口映射；无须仅为这四API强制添加requirePrivacyAuthorize。官方明确该接口是可选辅助能力。
- getSystemInfo官方仍提醒可能触发系统权限弹窗，并推荐使用拆分API；不能把“不在隐私接口映射”误写为绝不弹窗。
- 最小预设信息类型是头像昵称、选中图片两项；设备、网络、会话等真实统计处理仍写入补充文档，不能因无需接口弹窗而不披露。
- getLaunchOptionsSync返回范围包含query、shareTicket等；SDK只应取得允许的场景值等受控字段，不向友盟传完整启动对象。
- 根代理已取消政策复制API；当前private三份正文已从落仓JSON同步，取消剪切板收集说明，audio_play改为主动播放且播放器报告实际开始才记。没有修改产品代码或微信后台。
