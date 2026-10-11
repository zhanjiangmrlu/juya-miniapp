# 私有页面验收的同版音频种子

供协调运行器准备。客户端脚本不替换API响应，不生成签名，不修改共享数据库。纯文本场景不能证明“录音关闭后原音仍可用”；该步骤至少需要第二句真实绑定及可读取字节。

实际依据：admin-api `modules/v15_access/resources.py` 的 SQLResourceSigner.binding/audio/asset/**call**，`infrastructure/db/v15_schema.py` 的 sentence_audio_slice，以及 `tests/integration/test_v15_resource_signer.py` 的真实SQL插入。字段和规则以最终运行时为准。

## 最小同版绑定

1. 隔离场景的已发布 `scene_revision.content_snapshot` 为 schema2；`dialogue[1]` 有稳定 `id`，其 `slice_target_id` 和 `slice_version` 分别等于下面音频目标、音频版本的 public_id。start_ms/end_ms 必须在真实整段 duration_ms 内；content.audio 的 target_id/version_id/duration_ms 指向同版整段。所有引用放进同一已发布修订，不能借通用媒体接口取址。
2. 整段和第二句切片分别登记 `media_asset`：public_id、object_key=`sealed/media/audio/<独占ID>.wav`、asset_type=`audio`、content_type=`audio/wav`、真实size_bytes/SHA256/duration_ms、status=`CONFIRMED`、security_status=`PASSED`、created_by/created_at。这仅是明确发布状态的隔离fixture，不能计作后台校对或版权验收。
3. 分别建立 `audio_target(public_id,stable_key,target_type)`，整段 WHOLE、切片 SENTENCE；`audio_version(public_id,target_id,asset_id,version_no,source,status,created_at)` 使用内部 numeric target_id/asset_id，version_no=1、source=MANUAL、status=ACTIVE。实际资源校验按public_id读版本后JOIN这两张表，不能将public_id直接塞进numeric外键。
4. 第二句 `sentence_audio_slice` 必填：public_id、content_type=dialogue、content_id=场景public_id、revision_id=修订public_id、sentence_id=该句id、source_audio_version=整段版本public_id、source_sha256、start_ms、end_ms、target_id=切片目标public_id、resource_version=切片版本public_id、asset_id=切片素材public_id、dependency_hash、status=CONFIRMED、actual_duration_ms、slice_sha256、byte_size、confirmed_by、confirmed_at、encoding_config、created_at。源/切片hash和长度来自实际文件，不填任意伪值。取址时会按修订、句ID、目标及版本查询，并要求CONFIRMED且confirmed_by非空。
5. 有效本人会话和当前OPEN/FORMAL/LIMITED权限必须通过原SQLAuthorizer；审核配置 recording_enabled=false。返回SceneDetail须实际带第二句slice引用。请求路径为 `GET /api/v1/scenes/{scene_id}/resources/{slice_target_id}/signed-url?revision_id={revision_id}`，资源服务先核当前发布、权益、固定切片绑定及媒体审核，再返回 resource_id/url/expires_at。

## 独占本地字节端口

可以在协调拥有的运行器依赖注入点将 OssProvider 的存储端口绑定到独占loopback服务，同时保留原 SQLResourceSigner 和SQL授权、绑定、媒体校验，禁止直接替换ResourceSigner为恒定成功。

- `head_object(object_key)` 必须读取本地真实字节并提供size、sha256、content_type，与SQL登记事实一致；找不到或不匹配必须失败。
- `sign_get_url(object_key, ttl)` 使用本轮随机内存密钥产生短时HMAC受控URL，服务只监听127.0.0.1；GET/HEAD校验对象白名单、签名及到期后才返回字节。URL可用 `Expires` 明确秒级期限（SQLResourceSigner会复核）。密钥及完整签名URL不得落报告。
- 如浏览器请求Range，返回实际对应范围、206和正确Content-Range；GET/HEAD的Content-Type和长度必须正确。停止本轮独占服务并清理自产文件，不修改已有OSS桶或共享进程。
- 最小文件可使用明确自创PCM/WAV并从同一源按固定范围裁切；记录源/切片实际字节与hash。此证据只能证明本地固定资源授权、取址与浏览器操作，不能证明真人发音、真实句首句尾、听音校对或OSS。

当前脚本断言实际第二句选中、当前句文案、原音按钮可用、取址200及resource_id一致、禁录状态和完成POST。云OSS、真实微信/麦克风、人工听音仍单列；本地端口返回了音频也不能合并为这些验收通过。
