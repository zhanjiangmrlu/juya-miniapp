# 统筹协作更新

页面对话在构建与交付前读取本文件，统筹只在这里记录共享变更，不修改页面负责范围

## 2026-10-02

- GET /me 正式补deletion摘要，账号冷启动等待期可由现有App逻辑跳M48，7天撤回后的profile.deletion会变为空。local_dev同样保存注销状态，重新加载可验证

- 来源跳转请带所属收藏 item.entry_stable_id 作为 entryId 参数；同句多个词不能只用 sourceLocator 冒认第一词。场景页会精确按entryId定位（场景对话已确认）
- runtime/startup循环已消除：运行时客户端创建后注入configureSessionBootstrap，App先初始化运行时再静默登录。构建循环chunk警告应消失

- M36已有 LimitedEntitlement.achievements：completed_scenes/learning_days/favorite_vocabulary/favorite_phrases。不要取首个场景的全局result。口径：激活至到期时间内，完成场景与收藏按该活动固定scene_ids过滤去重；learning_days为此时间窗内实际学习操作的北京时间去重天数（USER_ACTIVE事件），不使用streak。全局GET场景result统计接口也将补齐供M18使用

- 15:02 共享更新：PageHeader已修正返回按钮+leading造成额外行的错误，默认centered=false，显式centered=true标题居中；H5状态栏0回退30px。PublishedScene.series从tags首项恢复。咖啡本地fixture已补为3词3语块并保持稳定ID，需要统筹8091进程重启后生效
- 权益共享契约补scene_ids与server_now。正式admin缺失internal /entitlements路由正在补齐，并投影每个活动固定scene_ids；请按选中权益scene_ids过滤目录，避免混用多个活动
- M41正式链路已支持screenshots可选数组。页面服务 supplement(id,text,screenshots=[]) 可携带该数组，整反馈仍最多1张。M31维持此前reason组合方案。请所有对话在下一次构建前重读本文件

- 14:49 原首页对话已结束并提交 c12ecdb，入口对话现在可以继续修改首页组件。个人页面 M41 截图补充由统筹扩展 API，调用 feedbackService.supplement 可增加 screenshots 可选参数，仍限制整条反馈最多1张；请保留上传与提交功能。共享契约相关反馈将保持兼容旧无截图请求

- 14:46 集成更新：mock-transport重复fixture变量已修复，5190 H5现可运行。UserProfile.contact_prompt_eligible 已加入共享契约；正式GET /me新增该布尔字段，后台判定当前开放场景完成>=3且从未填写/撤回、从未曝光。services/profile-response.ts 提供 adaptUserProfile，将正式juya_number映射为juya_id，请个人服务getProfile使用该适配器。学习历史和权益字段扩展仍在核对正式响应

- 联调 API 已启动 http://127.0.0.1:8091，独立于现有8000/8001服务
- H5启动时进程环境设置 VITE_API_BASE_URL=http://127.0.0.1:8091，VITE_LOCAL_DEV_MODE=true，VITE_USE_MOCK_API=false；不要改写仓库.env文件
- 为避免多个uni进程覆盖构建目录，请使用独立UNI_OUTPUT_DIR（例如dist/dev/entry-h5、scene-h5、personal-h5）
- ensureSession(forceWechat=false) 已由 services/startup.ts 提供。App启动使用此入口；HTTP受保护请求也会等待身份建立。首页retry须ensureSession(true)，失败清空摘要并展示当前页网络弹窗
- FavoriteItem新增english/chinese/translation/phonetic/explanation/audio可选字段；FavoriteSource新增scene_title/revision_id/entry_version/entry_snapshot。真实后端从sources.entry_snapshot获得释义，可在领域服务调用 services/favorite-response.ts 的adaptFavoriteItem(item)
- 联系资料更正正式API只接受reason，后台同样通过申请原因接收新微信号。M31可将新号和原因组成reason提交，不添加未获后端支持的proposed_wechat_id字段；组合文本不得超过500字符
- 最新local_dev场景打开返回PublishedScene/PreviewScene。scene-coffee-shop含五句、单份音频、标时、latte及语块。资源GET、词条GET、提示曝光POST已就绪。原图为Figma原始图片；静音音频仅供状态机联调
- 场景词卡收藏POST必须携带revision_id、entry_version（正式后端必填）
- 导航栏和底栏选中项按业务所属页定位，Figma个别画板选中标签与高亮底色不一致时不得让“我的”页面选中“学习”

- 只读入口摘要已增加 SceneSummary.trial_sentence，正式目录仅对OPEN场景投影首句，不调用open、不登记学习开始。8091重启后本地目录亦有此字段；入口请使用该字段

- 入口复验当前仅发现 recording-machine.spec.ts:21 deferred Promise<unknown> 与 hasPermission Promise<boolean> 类型不兼容，请场景对话修正为 Promise<boolean>。trial_sentence 已正确位于 SceneSummary

- 15:38 统筹复验：全量typecheck exit 0，recording权限泛型已修；8091已重启，真实H5 /home/first-visit 可见只读 trial_sentence 且首次浏览不登记 open。微信开发者工具已登录，统筹准备自有编译目录自动化验证

- 15:58 共享最终修正：PageHeader centered 内容改为普通 centered-content 类，微信工具内置WXSS编译已通过，H5外观不变。非mock构建移除演示静音与大图，真实接口小程序产物约455KB；8091目录封面改为API自有绝对URL，页面仍按接口渲染，不再依赖打包castle-card.png。API重启已完成
- 微信开发者工具3.17.2 iPhone12/13模拟器已实际跑通整段播放/暂停、latte词卡开关和跟读导航，正在补逐句与其他页检查；这些是工具证据，真机录音/试听仍为人工待验收
