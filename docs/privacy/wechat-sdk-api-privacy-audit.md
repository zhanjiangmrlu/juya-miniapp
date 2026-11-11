# SDK四接口与微信平台隐私授权核对

核对日期：2026-11-10。只读核对微信官方接口页、《小程序用户隐私保护指引内容介绍》及官方开发指南。网页工具无法打开官方域名时，直接请求同一官方URL并解压gzip读取main正文；未用第三方转述代替。

## 结论

本次SDK调用的四个接口均未列于微信官方的隐私接口映射，接口页也没有要求在调用前完成平台隐私同意。因此，**无需仅因为这四个接口，在用户明确选择统计之后、SDK初始化之前强制新增wx.requirePrivacyAuthorize**。

这只回答微信的接口授权机制。SDK读取并向友盟发送这些信息仍须等待本项目的可信有效登录、当前协议及统计版本、独立明确统计许可和有效配置；未被微信接口拦截不代表允许先采集。

| API                                                                                                                              | 官方说明及返回范围                                                                                                                                              | 本次平台隐私授权判断                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [wx.getSystemInfo](https://developers.weixin.qq.com/miniprogram/dev/api/base/system/wx.getSystemInfo.html)                       | 获取系统信息，包含机型、品牌、系统、微信/基础库版本、语言、屏幕及权限开关状态等；2.20.1起停止维护，推荐拆分接口。官方另提醒该接口可能因获取系统权限触发授权弹窗 | 未列于官方隐私接口映射；不能据此说绝不会出现授权弹窗。这个系统权限提示不能直接等同于平台隐私接口同意步骤                                                  |
| [wx.getNetworkType](https://developers.weixin.qq.com/miniprogram/dev/api/device/network/wx.getNetworkType.html)                  | 网络类型；API还可返回信号、系统代理及弱网状态等；本项目仅按SDK实际发送的网络类别披露                                                                            | 未列于映射；接口页未规定requirePrivacyAuthorize前置                                                                                                       |
| [wx.getAccountInfoSync](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/account-info/wx.getAccountInfoSync.html)   | 返回小程序AppID、环境和版本及插件账号信息，指的是应用账号信息，不是用户OpenID、昵称或手机号                                                                     | 未列于映射；接口页未规定requirePrivacyAuthorize前置                                                                                                       |
| [wx.getLaunchOptionsSync](https://developers.weixin.qq.com/miniprogram/dev/api/base/app/life-cycle/wx.getLaunchOptionsSync.html) | 启动参数，含path、scene、query、shareTicket、referrerInfo、extraData、forwardMaterials、hostExtraData等                                                         | 未列于映射；接口页未规定requirePrivacyAuthorize前置。但应只向SDK交付允许的场景值，不得因API无需弹窗就转发完整query、分享票据、来源私有extraData或文件信息 |

## requirePrivacyAuthorize是否必调

[官方API说明](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/privacy/wx.requirePrivacyAuthorize.html)把它定义为模拟隐私接口调用、触发隐私弹窗的辅助接口，并明确可以根据实际情况选择使用；它不是所有第三方SDK初始化的统一前置要求。

对头像昵称、选中图片这类实际列入映射的接口，仍须按[官方隐私协议开发指南](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/PrivacyAuthorize.html)完成声明和用户同意状态同步。可以用官方默认弹窗，或按需自定义流程；若需要提前触发该流程，可以选择requirePrivacyAuthorize，但不应把它当成友盟独立统计许可，也不应把拒绝该辅助步骤当成拒绝一切基本服务。

getSystemInfo已停止维护。若希望减少其读取权限开关、触发系统权限提示的可能，可在SDK隔离端口按其需要用getDeviceInfo、getWindowInfo、getAppBaseInfo组合返回必要字段，避免读取无关权限状态。该建议来自官方替代方向，不代表本次必须改变SDK包或已证明所有设备行为；最终仍须用目标微信版本测试。

## 最小后台填写与补充内容

按[微信官方信息类型与接口映射](https://developers.weixin.qq.com/miniprogram/dev/framework/user-privacy/miniprogram-intro.html)，本项目当前需要的预设隐私接口类型是：

1. **昵称、头像**：主动设置本人账号资料；chooseAvatar按钮、nickname输入。
2. **选中的照片或视频信息**：仅收集用户主动选中的图片，用于头像和私人反馈截图/照片；不收集视频、不读取整个相册、不强制附图。chooseImage实际用于头像及反馈。

政策复制API已取消，policy.vue改为页内完整披露及可选中URL；本次不新增剪切板声明。SDK埋点验证继续关闭。未使用的手机号、定位、通讯录、麦克风、相册写入、硬件标识或其他App权限不得套入。

本次四个SDK API没有出现在官方映射中，**没有查到必须为它们另新增“设备信息”平台授权项目的规则**。但SDK实际处理的数据仍应在补充文档完整披露：设备/系统/微信/基础库信息，屏幕/显示/性能信息，AppID/环境/版本/SDK信息，网络类别及请求IP，随机UUID与句芽内部账号编号，自动会话/页面指标及五类业务事件。后台若有相应自填项可同步填写，不能只写五事件，也不能声称这些设备数据不属于个人信息处理范围。

还须填写真实主体、公开邮箱、保存规则及第三方信息。具体可用文本见wechat-privacy-config.md；privacy.txt和analytics.txt合并的wechat-supplement.txt是21KB级纯文本，可用于补充披露。

## 发布状态边界

代理未读取或操作微信公众平台后台，不声称上述类型已经声明或审核通过。官方填写说明区分现网与提审版本入口；用户需按实际目标版本更新，不把一个入口的修改误认为另一版本已经生效。
