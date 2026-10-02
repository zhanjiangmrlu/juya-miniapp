# 场景学习并行复核与补修交接

日期：2026-10-02。开发分支：main；起始基线：`2c0b6b6`。本轮修复录音、跟读页面与学习请求的生命周期竞态，新增 17 项回归测试。代码门禁及构建通过；开发 API 的非零音频区间仍有一项共享阻塞，见下文。

## 范围与设计复核

本轮仅修改 `src/features/recording/recording-controller.ts`、其测试、`src/features/scene/use-scene-page.ts`、其测试、`src/pages/scene/shadowing.vue`、新增页面测试及本文档。未修改共享组件、共享服务、`scene-service.ts/spec`、路由、后端、环境文件或统筹台账。

设计基准为 [句芽英语 Figma，2475:158](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2475-158)。本轮重新读取并查看 M09（2479:473）、M09S（2479:549）、M14（2479:895）、M16（2479:1035）的设计上下文与截图；完整 33 状态映射沿用 [首次场景交付](./figma-scene-delivery.md)。本轮没有新增视觉样式或素材替换。

源码复核确认：Unicode 点击区间采用码点切分，完整语块优先于重叠单词；词卡、收藏与来源返回保留稳定 entryId、sourceLocator、revisionId、entryVersion；音频区间由发布响应提供；授权错误清空受保护内容，普通资源错误保留正文；录音不上传、不评分。已有区间、词卡与音频测试随全量门禁再次通过。

## 修复及回归证据

每组缺陷先增加失败测试，再修改对应实现，随后运行目标测试与全量门禁。只读代码复核发现的首次加载返回、重复完成与清理期间点句问题，也均转为失败测试后修复。

| 模块       | 复现问题                                                                                    | 修复后的行为                                                                                             | 新增测试 |
| ---------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| 录音控制器 | 权限或设备启动尚未完成时停止、退出；启动期间重复点击                                        | 停止取消尚未完成的录音意图；启动任务保留到迟到设备停止及文件删除结束；退出等待清理；重复启动只开一次设备 | 3        |
| 录音控制器 | 重录删除旧文件期间切句；旧停止失败；重复停止；设备启动期间回听旧录音                        | 旧重录任务不覆盖新句；旧停止响应不污染新状态；重复停止仍得到 RECORDED；设备启动期间不并行回听旧录音      | 4        |
| 场景请求   | 旧收藏 403 在新页面加载后返回；完成响应在隐藏后返回；隐藏期间词卡响应返回；两次点词响应逆序 | 请求绑定本次场景模型与页面代次；迟到响应不清空新模型、不导航、不写进度；只有最新词卡选择保存对应句位置   | 4        |
| 跟读页面   | 首次加载未完成就隐藏；首次加载隐藏后返回；原音等待停止录音时退出或再次切句                  | 不在隐藏页面创建录音端口；返回等待旧端口清理后可恢复；退出和新交互取消排队的旧原音                       | 4        |
| 跟读页面   | 重复点完成；完成成功后等待设备清理时点句子                                                  | 完成期间禁用重复提交与句子、原音、录音操作，首个成功完成仍执行唯一导航                                   | 2        |

目标回归文件为 `recording-machine.spec.ts`（19 项）、`use-scene-page.spec.ts`（11 项）、`shadowing.spec.ts`（6 项），合计 36 项，其中本轮新增 17 项。页面测试挂载真实 Vue 页面并使用真实 RecordingController，仅替换录音设备端口、Uni 生命周期与场景依赖，覆盖异步先后顺序与导航结果。

## 浏览器复核

独立预览地址：[场景详情](http://127.0.0.1:5294/#/pages/scene/detail?sceneId=scene-coffee-shop)。进程环境为 `VITE_API_BASE_URL=http://127.0.0.1:8091`、`VITE_USE_MOCK_API=false`、`VITE_LOCAL_DEV_MODE=true`，输出为 `dist/dev/scene-followup-h5`，未写入仓库环境文件。

浏览器证据目录：`C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24`。

| 覆盖                 | 数量及结果                                                                         | 证据                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 390 宽的全部设计状态 | 33 个状态，另加 1 个真实签名请求中断降级状态                                       | [结果与请求记录](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/browser-results.json) |
| 375、768 宽          | 各 12 个基础页面及词卡、语块卡、原图弹层状态                                       | 同上，共 58 张截图                                                                                                                  |
| 词卡及列表           | 词卡来源为权威快照；关闭前后滚动不变；375 宽 32px → 32px                           | [375 词卡](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/M09S-375.png)               |
| 原音及录音           | 整段、五句播放暂停；首句区间自然结束；模拟麦克风录音、停止、回听、暂停、切句与离页 | [390 回听](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/M14PR-390.png)              |
| 响应式几何与资源     | 无横向溢出；已记录的图片全部加载；固定操作不与 TabBar 重叠；无页面脚本错误         | [768 对话](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/M09-768.png)                |
| 资源失败             | 中断音频签名请求后进入 M15，五句正文仍可读                                         | [失败截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/M15-network-error-390.png)  |

390 状态集合：M08、M09、M09S、M09T、M09U、M12、M13、M14、M15、M16、M17、M18、M09P0–P5、M09I2–I5、M14P1–P5、M14I2–I5、M14PR、M14IR。375 和 768 覆盖前 12 个基础与弹层状态。

自动化脚本：[browser-followup.cjs](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/browser-followup.cjs)。直接使用系统 Chrome 与 bundled Playwright，授予模拟麦克风权限。M16 为直接读取开发成果数据的画面检查，本轮完成接口的竞态覆盖由页面测试提供。

上述截图能证明界面状态、资源加载和浏览器事件。开发音频为静音占位，麦克风为 Chromium 模拟设备，不能证明真实人声、正式内容或微信设备音频体验。当前浏览器安全区为默认值；本轮没有重新取得微信真机顶部 47px、底部 34px 安全区证据，交由统筹继续验收。

## 共享缺陷：开发音频端点不支持 Range

状态：待统筹修复，建议 P2。归属 `juya-miniapp-api/src/juya_miniapp_api/api/local_dev.py` 的 `resource_bytes`，本轮未改后端。

直接向 `http://127.0.0.1:8091/local-dev/resources/coffee-audio` 发送 `Range: bytes=0-99`，返回 200、完整 2208044 字节，缺少 `Accept-Ranges` 与 `Content-Range`。Chrome 的音频 `seekable` 为 `[0,0]`；点击第五句应从 20 秒起播，实际三次采样为 0.879、1.887、2.904 秒，按钮虽显示第五句暂停，设备却从零播放。因此本轮实际开发链路的非零句区间不能判定通过。

复现与采样：[audio-range-probe.cjs](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/audio-range-probe.cjs)、[audio-range-issue.json](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/audio-range-issue.json)。

建议开发资源使用支持字节范围的文件响应，或完整实现正确的 206/416 响应、Content-Range 与长度；修复后重跑第五句、暂停继续、自然区间结束及微信设备播放。

为区分端点与前端问题，另做浏览器交付夹具：仍取 8091 的同一静音 WAV，只在浏览器拦截资源响应并补充正确 Range 支持。第五句播放一秒后设备时间为 20.870 秒，暂停保持时间，继续后在 25 秒自然停止；签名接口 403 会清空受保护句子。该夹具证明前端在正确响应下的行为，不能替代开发 API 修复或 OSS 验收。

证据：[range-fixture-check.cjs](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/range-fixture-check.cjs)、[range-fixture-results.json](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fbca-06c7-7b60-823a-5eaf867c4f24/range-fixture-results.json)。

## 最终门禁与交接边界

2026-10-02 17:19 的最终验证，以下命令依次执行且退出码为 0：

```powershell
pnpm check
pnpm test
$env:UNI_OUTPUT_DIR='dist/build/scene-followup-h5'
$env:VITE_USE_MOCK_API='false'
pnpm build:h5
$env:UNI_OUTPUT_DIR='dist/build/scene-followup-mp-weixin'
pnpm build:mp-weixin
```

`pnpm check` 包含格式、ESLint、Stylelint 与类型检查。全量测试 64 个文件、216 项通过；两个构建均完成。全量结果来自并行主分支在该时间的工作区；本轮新增测试单独列于上文。

提交使用 `Local\JuyaV13ParallelGitCommit` 互斥锁，仅暂存上述 7 个自有文件，提交说明为 `fix(场景): 修复录音与学习操作的生命周期竞态`。未推送或部署；提交 SHA 可由 `git log -1 -- docs/figma-scene-followup.md` 查询。

代码与浏览器状态复核已完成；开发音频 Range、正式发布修订与真实 OSS、微信开发者工具及真机麦克风/听感、安全区、生产验收仍由统筹组织。总台账由统筹按本文证据更新。
