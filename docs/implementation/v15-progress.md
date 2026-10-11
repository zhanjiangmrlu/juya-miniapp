# V1.5 小程序前端实施进度

- 分支：`feature/v1.5-20261011`；起始 HEAD：`e5f8e2b`，起始工作区干净
- 需求：20261011 开发交付整合确认版；方案：00、01、05、06、07、08
- 状态：LOCAL_VERIFIED_WAITING_BFF_FINAL_CONTRACTS_AND_HTTP，尚未 READY_FOR_INTEGRATION
- 范围：只修改 juya-miniapp；不切分支、不推送、不部署、不重启共享服务

## 任务与所有权

1. 主执行者：同版本场景 adapter、直显词汇／语块、整篇译文、学习模块与阶段分区、档案／成果／兼容路由、运行时接线、最终验证
2. audio 子任务：发音四状态、有界轮询、唯一播放所有权、M14 本地三态录音
3. favorites 子任务：稳定快照收藏、两银行、完整翻卡、当前来源三态
4. short-reading 子任务：独立纯阅读与进度、标签局部状态、安全预览

## 基线核对与裁定

- 已确认单句旧实现是整段加时间区间；schema2 只接受实际单句资源，时间点保留整段定位
- 已确认旧收藏由客户端提交正文，新流程只提交稳定引用；旧查词弹层不作为主流程
- Ruling：沿用已授权分支与本文件作持久进度台账，不另建 worktree；08 协作方案允许独立子任务代理，按文件边界并行执行
- 长难句／语法沿用07方案明确边界：可变配置及准备校验，本版不发布缺少独立内容模板要求的占位页面
- fixtures、静态样式和构建不代表真实 API／云端／微信验收

## 当前验证

- 起始 `git status --short`：无输出
- 最终门禁（2026-10-11 12:33）：`pnpm check` exit0；`pnpm test` 117文件552例通过；`pnpm build:h5`／`pnpm build:mp-weixin` exit0；page-meta 16页通过；循环chunk警告已消除
- 正式微信包主包597561 bytes，总包713460 bytes；最大业务包scene 24851 bytes，所有包低于限制；Mock词汇图不进入正式产物
- 账号清理以统一同步代次驱动业务store清空，session不反向依赖业务store；清空学习保留身份、退出清空令牌，迟到响应不回填

## 契约与跨仓库依赖

- 按05冻结字段实现 fixture，随后只读 BFF 实际源码核对
- BFF已产出 pronunciation、favorite-snapshots、short-readings 公共路由；消费者已按实际DTO核对并补充共享HTTP契约fixture，真实服务联调尚未执行
- 集成请求：本人 `/me` 目前只有 `avatar_object_key`，需要权威可展示 `avatar_url`；当前 `/me/profile` 仅 PATCH，uni-app 微信方法清单无 PATCH，请 BFF 提供同语义真实 POST/PUT 兼容端点。前端不会用未确认别名或 method-override 猜接口
- 集成请求：场景动态录音审核开关尚无实际字段，当前 schema2 可选 `recording_enabled` 为暂定 adapter 输入；缺失时录音保守关闭，原音／阅读／完成可用
- 场景schema2／旧版adapter13例、阅读主体3例、场景编排13例、学习分区6例、本人PATCH1例通过（fixture／端口测试）
- BFF公共 `modules/pronunciation/router.py` 已出现，音频消费者按真实 resolve/task 参数调整；集成问题：BFF `_response` 尚未接受 admin-api 的 `RUNNING`／`RECOVER`，需要映射为 PREPARING（否则首次准备503）。请协调后端修正

## 当前模块证据（2026-10-11）

- 音频第一提交 `a0c299d`：受控发音、唯一播放所有权、本地录音与取消；14文件87例通过
- H5独立预览 `http://127.0.0.1:5187/`，仅进程注入 Mock，不修改 .env，不使用或重启5173/5174
- 390px实测词汇两卡169×246px；主体末尾语块bottom672px，固定操作top696px；语块图片区0
- 正式M09／完整内容、M05、M27、M16、M36、M42设计上下文及截图已读取；火苗使用交付包指定透明PNG
- 场景375／390／414／768／1024与档案／成果已有实际浏览器截图，临时证据在 `.v15-artifacts.local/`
- 审查发现的账号退出缓存、进度发送期间丢最后位置、清空学习后迟到写回、整段任一句起播、M15失败入口、旧版音频范围兼容、收藏账号隔离、开放复习过滤与旧短文来源定位均已修复；复验未发现残留Critical／Important
- 收藏提交 `312c6f7`／`c4fc9bf`，音频后续提交 `836526a`，短文提交 `0ddb2db`；收藏56测试与5宽度44张截图、短文30测试与5宽度截图、音频假设备Blob回听及退出revoke通过，均为本地证据
- BFF集成请求新增：LearningCatalog需权威用户阶段（当前DTO没有user_stage）；短文列表目前按public_id排序，需要实际编辑顺序；complete幂等重放仍需先重新鉴权
- 数据库迁移、共享服务刷新、真实跨服务验收由原协调对话负责

## 下一集成条件

- 继续等待上述真实BFF资料保存／头像URL、录音开关、权威阶段、发音准备状态及短文顺序／重新鉴权修正；收到后只在本仓适配消费者及测试，不越界修改后端
- 当前已产出公共接口的消费者适配完成，未声称真实共享HTTP服务／云端／微信通过；已知未产出字段仍不满足最终READY条件

## 外部待验收

- 实际微信 AppID 静默登录、昵称头像与麦克风授权
- iPhone／安卓／平板听音、切片句首句尾、本地录音回听与生命周期
- OSS 短签名、Range、版权／真人试听、生产审核

## 已发布接口消费与联调准备（2026-10-11）

- 本轮前端基线 `1e620d0`；只读消费协调交付的 BFF `3f9207a002cd0ae5cf02af0d44a87413e50fb30e`（56操作、58DTO、7示例），不根据后端未提交工作区猜新增字段
- 固定契约证据：`tests/fixtures/contracts/v15-3f9207a/`，OpenAPI SHA256 `26b84eb97d0483ac66e5dd501524d74f62a62d638502b00aebdcc74b26f8b60c`；JSON逐字节保留，TS提取提供方components类型；消费者检查实际路径、method、query/body字段与必填项、Bearer和稳定幂等键
- 修正历史收藏 nullable版本及revision、SCENE来源、空资料缺失提示；不虚构版本1、不将source_id当定位、不以旧audio覆盖明确pronunciation=null；取消及翻卡继续按favorite_id可用
- 场景发音resource_version=null归一为未指定，避免轮询传字符串null；实际单句切片使用详情已提供的target/version
- 标准错误保留request_id，外部错误码只查自有映射；刷新后仍401清当前失效会话；命令在身份等待前绑定清理代次，迟到响应及重试不进入新账号，旧登录／刷新不能保存或清理后来会话
- 375／390／414／768／1024px浏览器实际验证历史收藏详情与翻卡缺失提示，完整刷新后复习1/1；证据为本地Mock，不是HTTP验收
- 真实联调准备见 `docs/implementation/v15-http-checklist.md` 与 `scripts/probe-v15-http.mjs`；脚本要求明确BASE_URL，无默认端口，只读GET；拒绝HTML／错误JSON／缺方法契约，公开探测校验通过后才发送身份请求，不落盘token/正文/签名URL；缺少地址时exit2，不发送请求
- 协调尚未提供可用真实BASE_URL及隔离账号/发布内容标识：真实HTTP全部 `NOT_RUN_ENVIRONMENT_UNAVAILABLE`；不重启服务、不猜端口、不以Mock或健康检查替代业务验收
- 仍待最终JSON/TS：头像URL、微信兼容资料保存方法、录音审核开关、权威阶段、RUNNING/RECOVER公共映射、短文运营顺序及完成重放前重新鉴权；这些条件未满足前不标记READY
- 本轮最终门禁（13:40—13:42）：`pnpm check` exit0；`pnpm test` 121文件577例通过；H5／mp-weixin构建exit0，page-meta16页通过；微信主包601122 bytes、总包717617 bytes，最大业务包scene24851 bytes
- 审查两项Important（探测误报与跨账号重放）均已修复，独立只读复审Critical0／Important0；运行时刷新、登录启动、等待身份及迟到401均有内存复现实证，探测8例为内存fixture，不是后端HTTP
