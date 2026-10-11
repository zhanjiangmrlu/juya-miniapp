# V1.5 真实 HTTP 与页面联调清单

## 契约基线与当前状态

以协调交付的 BFF 提交 `3f9207a002cd0ae5cf02af0d44a87413e50fb30e` 为本轮固定消费基线。
源 OpenAPI SHA256 为 `26b84eb97d0483ac66e5dd501524d74f62a62d638502b00aebdcc74b26f8b60c`。
JSON、7份示例以及提供方生成 TS 的 components 类型保存在 `tests/fixtures/contracts/v15-3f9207a/`；消费者契约测试为 `tests/contracts/v15-provider-consumers.spec.ts`。

当前没有协调确认的可用 BASE_URL、隔离账号凭证与发布内容标识，所有真实 HTTP 步骤为 **NOT_RUN_ENVIRONMENT_UNAVAILABLE**。
本轮测试中的传输端口、示例和 Mock 均不能证明真实 HTTP、数据库或授权链路通过。
不修改 `.env`，不重启共享服务，不以8001健康检查或演示登录推定V1.5业务就绪。

## 环境就绪后的只读探测

在本仓 PowerShell 运行，地址由协调对话确认；脚本没有默认地址。

```powershell
$env:JUYA_QA_BASE_URL = Read-Host '协调确认的 BFF BASE_URL'
# 如已有隔离测试账号短期 access_token，可在本机进程设置 JUYA_QA_ACCESS_TOKEN
# 未设置时本人资料、目录步骤为 NOT_RUN_AUTH_REQUIRED，不能视为鉴权通过
node scripts/probe-v15-http.mjs
Remove-Item Env:JUYA_QA_ACCESS_TOKEN -ErrorAction SilentlyContinue
```

脚本仅 GET `/health/ready`、`/openapi.json`、`/learning/modules`、`/me`、`/learning/catalog`。
8秒超时，不跟随重定向；校验JSON最小结构及8组关键路径的HTTP方法，拒绝200 HTML和空契约。
健康、OpenAPI和模块结构都通过后才允许发送身份请求；仅记录状态、字段名、request_id与缺失方法/路径。
任何失败／未执行均非零退出；结果在忽略目录 `.v15-artifacts.local/http-contract-probe.json`，不包含token、本人资料、正文和签名URL。
该报告只证明探测到的HTTP入口，仍需以下页面、请求和落库回读验收。

## 页面与请求验收顺序

前置资料由协调侧提供：实际小程序AppID与有效 `wx.login` code、隔离测试账号、已发布场景和词卡、两个不同义项/来源的同词条、实际单句切片、无音频/有音频短文、发布新版本和撤销权限的控制入口。
每步记录环境及两服务提交、method/path、HTTP状态、request_id、响应字段、页面结果、落库回读证据、结论及阻塞项。
完整token、本人联系方式、正文内容和媒体签名查询串不进入台账或截图。

| 顺序 | 页面/请求                                                                         | 参数与响应校验                                                                                                                     | 页面/数据证据                                                                                                            |
| ---- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | POST `/api/v1/session/wechat`；POST `/session/refresh`                            | body分别为code/device、refresh_token；无Bearer；读取真实access_token/refresh_token/session_id，不要求expires_in                    | 实际微信登录；同账号并发401只刷新一次且原命令同幂等键重试；切账号立即取消旧命令与刷新，不向新账号重放；刷新后仍401清会话 |
| 2    | GET `/learning/modules`、`/learning/catalog`；`pages/learning/index`              | 模块名/顺序原样读取；当前基线catalog只有items/authorization_pending                                                                | 启停后刷新、全部关闭、只读预览；等待权威阶段字段后验证已有权益用户布局                                                   |
| 3    | POST `/scenes/{scene_id}/open`；`sub-packages/scene/detail?sceneId=…`             | Bearer及Idempotency-Key，无body；区分schema2、旧发布、PREVIEW；词卡content_type=word_card                                          | 英文全文、译文默认收起、本篇词/语块直显；空区块隐藏；不同义项独立收藏                                                    |
| 4    | GET `/scenes/{scene_id}/resources/{resource_id}/signed-url?revision_id=…`         | 只用详情实际资源与修订；返回resource_id/url/expires_at                                                                             | 整段定位高亮、任一句起播、实际slice单句文件、失败M15、重签、退出无迟到播放；人工听音单独验收                             |
| 5    | POST `/favorite-snapshots`；GET列表与详情；DELETE详情                             | POST只稳定引用，不传正文；同次命令固定幂等键；列表游标透传；DELETE返回active=false，不按204处理                                    | 两银行、完整分页和翻卡；同词不同义项/来源独立；取消真实状态与复习队列一致；回读同一favorite_id                           |
| 6    | 历史收藏列表/详情/翻卡                                                            | nullable版本、SCENE、legacy_incomplete、missing_fields；pronunciation=null不猜目标；空资料不能用当前正文覆盖                       | 保存信息及缺失提示可读；取消仍可用；清空/换账号后迟到详情和createReview不回填                                            |
| 7    | GET `/favorite-snapshots/{id}/source-resolution`                                  | EXACT仅当前target_content_version的唯一locator；UPDATED不携带定位；NO_ACCESS无原文入口                                             | EXACT定位高亮，更新从顶部进入；源模块/权益关闭仍保留本人收藏，但不能恢复受限全文/媒体                                    |
| 8    | POST `/pronunciations/{target}/resolve`；GET `/pronunciations/tasks/{task}`       | body/query仅favorite_id或完整内容引用与可选resource_version；GET携带target_id；只消费READY/PREPARING/FAILED/UNAVAILABLE            | 准备有界轮询、停止/离页取消；仅can_retry=true重试；过期重新resolve；本人收藏按独立授权；不提交文本/purpose/user_id       |
| 9    | POST `/reviews`；POST `/reviews/{id}/complete`                                    | card_ids及snapshot_schema=2、固定Idempotency-Key；完成无body                                                                       | 所有分页卡片纳入；取消卡移队列；旧会话不能复习已取消/重收版本；完成与打卡实际回读                                        |
| 10   | GET `/short-readings`和`/{id}/preview`；`sub-packages/short-reading/index`        | 仅安全摘要；cursor透传；当前排序只保留服务端顺序                                                                                   | 模块关闭直接路由拒绝；无全文/译文/签名泄露；等运营排序契约后再验收顺序                                                   |
| 11   | POST `/short-readings/{id}/open`；`sub-packages/short-reading/detail?contentId=…` | 无body；paragraphs_en为ID/english对象；整篇translation_zh；whole_audio可null；progress的saved_content_version                      | 纯阅读、双标签局部状态、整篇译文、可选全文音频；无词条/查词/分句；同版唯一来源段落才定位                                 |
| 12   | PUT `/short-readings/{id}/progress`；POST `/{id}/complete`                        | PUT版本/段落/字符offset/递增client_sequence；页面只提交段落开头offset=0，不发送像素；完成body版本+固定幂等键，返回progress/created | 本地像素恢复不冒充字符定位；乱序不覆盖；版本更新位置失效但读完保留；完成重放、撤权后拒绝及数据库回读                     |
| 13   | GET短文专属resource signed-url                                                    | revision_id与实际全文target；禁止场景或通用媒体回退                                                                                | 真实有音频/无音频短文、过期重签、退出互斥；音频内容人工验收                                                              |
| 14   | 本人档案、昵称头像、录音跟读                                                      | GET /me；头像upload-policy；目前只有PATCH /me/profile，等待发布真实微信兼容方法；recording_enabled也待发布                         | 当前未确认开关不启用录音；不拼avatar_object_key成URL；新接口确认后再验收真实微信头像/昵称保存                            |
| 15   | 422/409/429/503/401异常；清空学习数据与退出                                       | 标准code/message/request_id/details；409刷新正文后建新引用；429不密集重试；清空只在隔离账号执行                                    | 正文/媒体授权状态立即失效；合法快照仍受独立复习规则保护；request_id可关联，不循环刷新或伪造成功                          |

## 专用前端联调预览

收到实际BASE_URL及合法隔离会话后，可在新终端启动独占H5端口，配置仅限当前进程：

```powershell
$env:VITE_API_BASE_URL = $env:JUYA_QA_BASE_URL
$env:VITE_USE_MOCK_API = 'false'
$env:VITE_LOCAL_DEV_MODE = 'false'
pnpm exec uni -p h5 --port 5189 --host 127.0.0.1
```

H5没有真实微信 `wx.login` 能力。页面真实BFF鉴权验收应使用协调提供的隔离账号合法短期会话，或在微信开发者工具完成实际登录；不能自动退到演示身份。
若在H5手动接入合法会话，在浏览器uni存储中设置实际access/refresh令牌并重新加载，凭证仅在本机临时使用，不提交或输出。
真实微信登录、麦克风/头像授权、云OSS、版权和设备听音另列验收，不从H5请求成功推定通过。

## 待发布字段与复核条件

已知待BFF最终JSON/TS：avatar_url、POST/PUT本人资料、权威录音开关、用户阶段、RUNNING/RECOVER对外映射、短文运营排序与完成重放前鉴权。
协调发布新提交后新增独立契约快照与类型校验，不覆盖3f9207a固定证据，不根据工作区临时字段猜接口。
