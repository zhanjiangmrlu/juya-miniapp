# V1.5 小程序前端实施进度

- 分支：`feature/v1.5-20261011`；起始 HEAD：`e5f8e2b`，起始工作区干净
- 需求：20261011 开发交付整合确认版；方案：00、01、05、06、07、08
- 状态：REAL_HTTP_PARTIAL_BLOCKED_BY_CROSS_CONTENT_FAVORITE_STATE，真实前六步已通过，后端收藏状态回填缺内容命名空间导致复习422，等待权威修复后复跑
- 最终消费契约：BFF `b38294b`，`tests/fixtures/contracts/v15-b38294b/openapi.json`／`provider.d.ts`；固定Git原始JSON SHA256 `6c6105d3b3d0e201b3824ecef796e38a595bc30e574b7b87aa3c04f049c4e780`
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

## 剩余项全量收口（新授权，进行中）

- 当前前端基线 `50e453a`；上游消费改为已提交BFF `19f28ef`／`6c86134`，已保存独立 `v15-19f28ef` OpenAPI/TS，不覆盖3f历史；新固定JSON为62路径、71操作、61schema，SHA256 `f498f24dfc926519aae5fd424ffcba0755ccae590044b0bbadd996ebf7b07ee5`
- 已接POST本人资料，沿用受控avatar_url，不猜对象URL；权威阶段NEW/ENTITLED/null优先于客户端旧进度，null为等待鉴权；具体代码门禁完成后回填
- 并行责任继续限定：音频/录音、收藏/复习、短文及随后反馈/账号；主执行者负责本人资料/联系管理/学习分区/真实浏览器脚本/最终门禁
- 真实无Mock页面脚本：`scripts/run-v15-h5-e2e.mjs`；使用相邻juya-admin已安装Playwright，只操作实际页面与监听真实HTTP，不用page.route，不替换BFF鉴权
- 协调可统一启动专用H5：仓库本机进程 `VITE_API_BASE_URL=http://127.0.0.1:18011`、`VITE_USE_MOCK_API=false`、`VITE_LOCAL_DEV_MODE=false`，运行 `pnpm exec uni -p h5 --port 15189 --host 127.0.0.1`；不写.env、不重启共享进程
- 脚本进程环境：`JUYA_QA_BASE_URL`、`JUYA_QA_H5_URL=http://127.0.0.1:15189`、`JUYA_QA_ACCESS_TOKEN`、`JUYA_QA_REFRESH_TOKEN`、`JUYA_QA_ENTITIES` JSON（scene_id；完整验收还需word_card_id、short_reading_id；允许附带user_id/series_id/revision_id）、`JUYA_QA_OUTPUT_DIR`；运行 `node scripts/run-v15-h5-e2e.mjs`
- 凭据仅进入新浏览器临时存储，不保存storageState/HAR；截图遮挡本人编号/微信号/昵称/头像/输入框，HTTP只记录method/path/status/request_id/字段名。缺实体明确NOT_RUN并非零退出，不以局部通过标全部完成
- 上游新增审计项：固定6c86134 ReadingPreview未产progress_summary，列表/到期安全阅读进度摘要缺权威输入；现有cover_url虽声明，但authority未装配安全封面解析。前端不补造这两项，待协调BFF补齐后继续消费
- 录音权威开关和短文运营顺序继续等待本轮正式提交；实际私有环境由协调负责，当前脚本准备状态不代表真实HTTP已验收
- 剩余需求逐项审计见 `docs/implementation/v15-gap-audit.md`；旧资料POST/头像/阶段/准备映射/短文重放请求已由19f28ef/6c86134交付，不再列为未开发；短文摘要/安全封面及最终录音/排序契约继续单列代码依赖
- 本轮范围提交：短文 `86b537f`（39项），收藏 `3dc4d60`（77项），音频 `a342df3`（112项），反馈/账号 `cd994bd`（65项）；范围结果不能替代最终全仓门禁
- 主执行者已补资料/联系/权益离页及账号清理保护、真实POST消费者、头像回读、资料入口曝光和退出提示清理；新增学习退出提示测试已观察RED→GREEN
- 真实脚本已阻断所有API非2xx和requestfailed，无默认容错例外；权威stage=null及短文已完成不能误报通过。脚本语法/ESLint与4项19f消费者检查通过，真实HTTP仍未运行
- 本轮门禁（14:17—14:20）：129文件659测试通过；修正单个测试import排序后 `pnpm check` exit0；H5和mp-weixin正式构建exit0，page-meta16页通过。缺BASE的真实脚本预检非零退出、0请求、0网络失败；这不是服务联调通过
- 脚本复核修正：关闭浏览器后再次汇总迟到网络失败并判失败；录音关闭场景实际选第二句、原音取址200并核对切片resource_id；本人资料联系提示通过真实“稍后再说”处理
- 反馈草稿离开表单后的跨账号清理正在补全局store保护；此项复核结束及最终BFF契约消费前不标READY
- 草稿全局身份保护已提交 `0cb57de`；反馈/账号最终复核的冷启动页面冻结、撤回标记、来源重载、无效补充取消已读正在RED→GREEN修复
- 本轮正式中间消费基线 `a9a97b8eaed183a7b60a0d17c8be116016ba35f4`，fixture：`tests/fixtures/contracts/v15-a9a97b8/openapi.json`／`provider.d.ts`；64 paths／73 operations／67 schemas，固定Git内容JSON SHA256 `e3d47760bfbab61818c4a4e373105dbeb10c8b6c5e91f2f00d481d93b90e55ae`；旧fixture只保留历史回归，最终BFF如续改契约将再次同步
- 已发布录音严格布尔、运营稳定排序及短文独立安全历史；前端正在补场景历史分页、短文独立已读数/历史摘要和生成类型消费。安全封面及预览进度摘要仍待后续正式契约
- 真实脚本种子前提：scene_id 为 recording_enabled=false、至少2句且第2句有真实 slice_target_id/slice_version 的dialogue；word_card_id 为同英文2词卡、中文释义不同且义项/来源稳定独立；short_reading_id 为未完成纯文本篇且包含标签。脚本已实际验证双义项分别收藏并加入同轮完整复习；缺条件明确失败，不能以跳过通过
- 协调现纯文本种子不足以验原音；最小同版SQL/素材绑定与独占loopback字节端口规则见 `docs/implementation/v15-local-audio-seed.md`。保留原SQLResourceSigner/Authorizer，只替换隔离存储端口，实际HEAD/hash/短时HMAC校验，不能恒定返回200；本地资源证据不等于OSS云或真人听音
- 新增权威配置审计项：需求6.3无权提示的“可配置次级资料入口”前端目前消费可选profile_completion_enabled，但正式LearningCatalog extra=forbid仅items/user_stage/authorization_pending，admin源码无该配置（仅local_dev/Mock有true）。这不是当前HTTP已启用能力，需上游确认并正式交付bool或明确可消费配置端口；前端不把contact_prompt_eligible偷换成无权入口开关
- 上游 `c9e2f14` 已提交安全cover_url取址（公开JSON不变），前端已有nullable直显消费；新独立ReadingHistoryPage提供30.4需要的安全进度和独立计数，采用阅读记录区，取代早前因缺progress_summary而无权威数据的阻塞。仍不从本地伪造列表/预览徽标，不要求重复发明字段
- 历史正式消费已提交 `2a10f76`：场景全部分页后筛选、短文独立安全history/计数/分页、下线404留页及身份/页面失效；11文件76范围测试。375/390/768/1024px实际Mock浏览器检查无横溢；截图亲验历史卡片及按钮在footer上方，390加载至3条且下线留页；场景历史实际显示第二页共2条。证据 `.v15-artifacts.local/history-visual/`，不是真实HTTP
- 最终本地门禁快照（14:37—14:40）：135文件705测试通过；check exit0（临时浏览器证据脚本归档为txt后不参与源码lint）；H5/mp-weixin构建exit0、page-meta16页通过。最新脚本补独立短文完成后history GET和实际已读卡片回读、两Medium银行卡不同释义展示；语法/ESLint通过
- 本轮复核Critical草稿隔离已由 `0cb57de` 修复；4项账号/反馈Important已由 `c114a24` RED→GREEN修复（最终范围76项）；学习权威stage=null/pending=false仍等待确认，新增回归RED→GREEN。schema1录音及次级资料配置等待正式BFF新增契约后继续核对
- 最终BFF `b38294b` 已正式交付schema1外层recording_enabled及LearningCatalog.profile_completion_enabled。已按正式生成类型补消费者测试，旧版adapter严格透传外层字面bool、缺失默认禁录，3项录音缺口观察RED→GREEN；资料次级入口沿用严格bool及会话一次实际曝光，不再作为上游缺口
- 真实脚本末尾新增375/390/414/768/1024视口的实际scene/word-card/纯短文/history读取、末尾滚动、水平边界、固定操作区避让及脱敏截图，结果逐项记viewports。每次导航前等上一页实际API结算；没有真实结果前不将Mock截图记为本轮HTTP证据
- 最终冻结消费者门禁（14:46—14:47）：136文件710测试通过，`pnpm check`、H5/mp-weixin正式构建exit0，page-meta16页通过。新历史功能独立只读审查Critical0/Important0；此前复核问题均有RED→GREEN及正常成功分支回归
- 最终fixture必须使用 `tests/fixtures/contracts/v15-b38294b/openapi.json`，与后端Git原始JSON的LF字节hash一致；b382之后进度/换行说明/容器忽略提交不改变公开契约。最终运行器必须核对实际mounted JSON与该fixture语义相等，不能再指向a9历史fixture

## 首次真实页面失败修复

- 协调真实运行 `ac6a4281563744979c914cc3132c717b`：学习阶段、场景译文/收藏、发音resolve前三步PASS，禁录阅读完成步骤FAIL；11个实际API请求均2xx，0 network failures/0 page_errors，尚未发起切片signed-url。不据此标原音或完成通过
- 根因复现：H5编译后的录音按钮是UNI-BUTTON；禁用节点带disabled="true"但缺role/aria-disabled，Playwright.isDisabled错误判false。在独占Mock H5 15193实际DOM观察停止/回听/重录均出现该差异
- 修复保留业务disabled条件及原验收断言，为4个录音控制增加role=button和相同条件的aria-disabled；新增配置关闭/恢复语义回归RED→GREEN。实际H5复验禁用按钮aria-disabled=true且isDisabled=true，可用按钮false，未触发麦克风或改种子
- 真实脚本失败报告新增仅本脚本数字行号script_line，避免泛化错误失去定位，同时不输出Playwright完整错误/正文/凭证。真实禁录、任意选句、原音授权和完成全部仍要求实际通过；共享环境不由本对话重启
- 修复门禁（15:10—15:12）：136文件711测试通过；修正新增fixture必需source_locator后check exit0，定向7项复验通过；H5/mp-weixin正式构建exit0、page-meta16页通过。仅新建的独占Mock预览15193已核对进程身份并停止，不触及协调私有服务

## 第二次真实页面脚本失败修复

- 协调运行 `b848dbaa6ca7498fa2bdb7084760ed5a` 已确认禁录、实际第二句选中、切片原音取址与完成PASS，且已有词卡双义及银行截图；完成截图为空背景，不能把该截图算作成果页可见证据
- 本次未生成browser-results.json；只读日志定位source-resolution待响应Promise超时未处理，Node直接退出。responseFor现在提前观察拒绝并返回原Promise，原await仍报错；catch尝试保存脱敏failure.png后照常报告FAILED/非零退出，不弱化真实GET或状态码断言
- 独占Mock H5 15193复现实际DOM：返回原文文本仅1个，点击内部SPAN反复被其UNI-BUTTON拦截，并非重复文本或预取；点击.page-actions下实际.app-button后正常导航并带sourceLocator/contentVersion。源码来源GET仅在returnSource点击后发生，没有详情自动预取
- 脚本改为点击按钮容器，同类翻卡下一张/完成、联系提示稍后再说、资料保存同步修正；不force点击、不改UI、不删除入口。翻卡逐张等待当前序号/卡片，完成后等待实际首页内容，避免路由过渡或点击旧卡片
- 场景完成现在在点击前监听真实GET /scenes/{id}/result并断言200；截图前等待学习完成标题、本次学习已记录、3张成果卡及成果明细可见，不能只靠waitForURL。独占Mock截图completed-visible.png已亲验完整成果内容，此证据不是真实HTTP或云音频验收
- 本地受影响复验：原文字点击5秒失败、按钮容器点击通过；翻卡两张/完成首页可见、资料保存按钮正常点击通过。提取实际responseFor进行延迟拒绝复验：未处理拒绝0次，原Promise仍拒绝；node --check及pnpm check全部通过。只有验收脚本与本进度说明变更，不重复全套711测试/双端构建或真实批量种子；独占15193已核对进程身份并停止，真实后续步骤仍待协调少量记录复跑

## 第三次真实复习422定位

- 实际运行 `36e4eac6df574822898d2a09e28dba2d` 前六步PASS，包括来源GET200/版本定位导航与成果GET200；review-full-snapshot POST /api/v1/reviews返回422 REVIEW_CARDS_INVALID，失败报告及截图可靠落盘，0 network failures/0 page_errors
- 实际词卡步骤DELETE两个ID与先前对话收藏相同，随后重存词卡；四张复习队列仍保留已取消的对话两张。不是通过去重/过滤取消ID就可接受的结果，跨内容收藏必须独立
- 前端已核对：src/stores/favorites.ts targetKey、src/stores/scene.ts seedState、useScenePage.referenceFor均包含content_type/content_id；favorite-service.createReview发送card_ids和snapshot_schema=2，未将分组ID当快照ID。失败截图显示第1张/4，路由逗号拆分无误
- 后端只读根因：juya-miniapp-api/src/juya_miniapp_api/modules/learning/detail_aggregation.py attach_favorite_states仅以(entry_type,entry_id,sense_id,source_id)调用repository.states；favorites/snapshots_sql.py states查询及字典键同样缺content_type/content_id，所以共享稳定entry/sense/source的合法对话/词卡被回填同一个favorite_id。后端负责人需让协议、内存与SQL实现、调用和回填键全部携带内容命名空间；本对话不越界修改BFF
- 前端补跨类型/跨内容ID状态隔离回归；脚本在词卡取消之前阻断CROSS_CONTENT_FAVORITE_STATE_MISMATCH，收藏POST核对返回content_type/content_id，最终全队列仍要求无重复且每个已保存ID仍在权威银行活跃集合。不删ID、不改seed词条身份、不降复习201/完成200断言，待后端正式修复后继续原四张真实队列
- 本轮仅受影响门禁：favorite-snapshots/review-analytics/use-scene-page共3文件45项通过，node --check、pnpm check及git diff --check通过；无页面源码变更，不重复全套测试/双端构建，不启动或重启服务、不生成真实数据
