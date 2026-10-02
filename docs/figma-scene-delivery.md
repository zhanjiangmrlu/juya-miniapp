# 场景学习与音频跟读交付

交付日期：2026-10-02。开发分支：main。负责人范围为场景页、音频、录音、词卡、学习成果及 scene/audio store。本提交不包含统筹持有的 scene-service.ts 与共享目录，也不修改总台账。

## 设计与状态覆盖

已逐一读取 Figma 设计上下文并查看 33 个画板截图。原文件 [句芽英语设计](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2475-158)。

| 状态                                                                           | Figma node | 路由                          | 触发与数据来源                                      | 浏览器证据                                                                                                       |
| ------------------------------------------------------------------------------ | ---------- | ----------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| [M08](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-419)    | 2479:419   | /pages/scene/detail           | 打开授权场景页面                                    | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M08-390.png) |
| [M09](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-473)    | 2479:473   | /pages/scene/dialogue         | 打开授权场景页面                                    | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09-390.png) |
| [M09S](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-549)   | 2479:549   | /pages/scene/dialogue         | 点击 latte 片段，GET 固定版本词卡                   | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09S.png)    |
| [M09T](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-641)   | 2479:641   | /pages/scene/dialogue         | 点击完整语块，GET 固定版本词卡                      | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09T.png)    |
| [M09U](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-733)   | 2479:733   | /pages/scene/detail           | 详情页点击授权原图                                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09U.png)    |
| [M12](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-787)    | 2479:787   | /pages/scene/vocabulary       | 打开授权场景页面                                    | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M12-390.png) |
| [M13](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-841)    | 2479:841   | /pages/scene/chunks           | 打开授权场景页面                                    | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M13-390.png) |
| [M14](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-895)    | 2479:895   | /pages/scene/shadowing        | 打开授权场景页面                                    | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14-390.png) |
| [M15](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-975)    | 2479:975   | /pages/scene/audio-failed     | 音频签名请求中断进入降级正文，重试可恢复            | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M15.png)     |
| [M16](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-1035)   | 2479:1035  | /pages/scene/completed        | 完成接口成功后读取成果接口                          | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M16-390.png) |
| [M17](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-1089)   | 2479:1089  | /pages/scene/restore-position | 保存第 2 句后重新打开恢复页                         | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M17.png)     |
| [M18](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-1143)   | 2479:1143  | /pages/scene/return-source    | 收藏来源携带 entryId、sourceLocator、修订及词条版本 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M18.png)     |
| [M09P0](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-569)  | 2507:569   | /pages/scene/dialogue         | 点击整段播放，真实 play 事件后显示暂停              | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09P0.png)   |
| [M09P1](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-653)  | 2507:653   | /pages/scene/dialogue         | 点击第 1 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09P1.png)   |
| [M09P2](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-737)  | 2507:737   | /pages/scene/dialogue         | 点击第 2 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09P2.png)   |
| [M09P3](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-821)  | 2507:821   | /pages/scene/dialogue         | 点击第 3 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09P3.png)   |
| [M09P4](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-905)  | 2507:905   | /pages/scene/dialogue         | 点击第 4 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09P4.png)   |
| [M09P5](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-989)  | 2507:989   | /pages/scene/dialogue         | 点击第 5 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09P5.png)   |
| [M14P1](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-638)  | 2508:638   | /pages/scene/shadowing        | 点击第 1 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14P1.png)   |
| [M14P2](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-732)  | 2508:732   | /pages/scene/shadowing        | 点击第 2 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14P2.png)   |
| [M14P3](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-826)  | 2508:826   | /pages/scene/shadowing        | 点击第 3 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14P3.png)   |
| [M14P4](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-920)  | 2508:920   | /pages/scene/shadowing        | 点击第 4 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14P4.png)   |
| [M14P5](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-1014) | 2508:1014  | /pages/scene/shadowing        | 点击第 5 句播放按钮，真实 play 事件                 | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14P5.png)   |
| [M14PR](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-1108) | 2508:1108  | /pages/scene/shadowing        | 本地录音停止后点击当次回听                          | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14PR.png)   |
| [M09I2](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-713)  | 2510:713   | /pages/scene/dialogue         | 第 2 句播放后暂停，真实 pause 事件                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09I2.png)   |
| [M09I3](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-797)  | 2510:797   | /pages/scene/dialogue         | 第 3 句播放后暂停，真实 pause 事件                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09I3.png)   |
| [M09I4](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-881)  | 2510:881   | /pages/scene/dialogue         | 第 4 句播放后暂停，真实 pause 事件                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09I4.png)   |
| [M09I5](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-965)  | 2510:965   | /pages/scene/dialogue         | 第 5 句播放后暂停，真实 pause 事件                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M09I5.png)   |
| [M14I2](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1049) | 2510:1049  | /pages/scene/shadowing        | 第 2 句播放后暂停，真实 pause 事件                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14I2.png)   |
| [M14I3](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1143) | 2510:1143  | /pages/scene/shadowing        | 第 3 句播放后暂停，真实 pause 事件                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14I3.png)   |
| [M14I4](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1237) | 2510:1237  | /pages/scene/shadowing        | 第 4 句播放后暂停，真实 pause 事件                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14I4.png)   |
| [M14I5](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1331) | 2510:1331  | /pages/scene/shadowing        | 第 5 句播放后暂停，真实 pause 事件                  | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14I5.png)   |
| [M14IR](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1425) | 2510:1425  | /pages/scene/shadowing        | 回听中点击暂停                                      | [截图](C:/Users/Administrator/.codex/visualizations/2026/10/02/01a0fb49-5969-7a63-b51a-bf963b0ddaf1/M14IR.png)   |

M09I1、M14I1 为附加的第 1 句暂停验证；设计清单中的 I2-I5 和 IR 已分别捕获。P/I 状态共享页面组件，状态来自设备回调而非查询参数模拟播放。录音回听截图使用 Chromium 模拟麦克风生成的本地音频。

## 实现闭环

- 场景标题、系列、正文、词汇、语块、时间区间和原图资源标识均来自已授权的发布响应；列表数量与所有按钮目标均根据数据计算
- 原图通过 scene.getResource(sceneId, resourceId, revisionId) 获取当前发布修订的签名，支持查看完整原图和一次重新签名
- 句子使用同一整段资源的 start_ms/end_ms 区间；整段、逐句、词条播放共用唯一音频控制器，时间更新达到区间结束即停止
- PLAYING/PAUSED 由真实设备 play/pause 回调驱动；继续播放保留设备时间，切目标时取消旧监听、旧签名响应与排队设备回调
- 媒体 403 最多重签一次；签名 API 返回 401/403/404/409/410 时清空正文与资源；普通音频失败保留可读正文并进入 M15
- 点击区间按 Unicode 码点计算，重叠时完整语块优先；词卡通过固定 revision_id、entry_version、source_locator 请求权威快照
- 词卡收藏携带固定版本与来源，成功更新已收藏状态；关闭词卡保持实际列表滚动，浏览器实测打开前后均为 40px
- 滚动测量限制在当前页面实例，避免历史隐藏页面污染可见句定位；位置写入本机缓存和服务端进度队列
- 跟读任意句均可开始；首次录音才请求权限，拒绝后原音仍可用；切句、原音、录音、回听保持互斥
- 本地录音支持停止、回听、暂停、重录和 60 秒设备停止；切句后的旧文件仍归属原句；页面隐藏、卸载、完成与授权失效时释放设备和临时文件
- 权限请求迟到及重复点击均已覆盖测试；退出后迟到的麦克风会释放，重复请求只获取一次麦克风
- 完成学习接口成功后进入成果页；成果与三个明细入口读取既有服务；“开始翻卡复习”遍历完整收藏页，将真实词汇卡片 ID 带入 review-front
- 来源返回要求明确 entryId，使用固定修订/词条版本重新取权威来源；缺失或无效条目不会冒认第一条词汇
- 页面返回时重新核验本页授权，完整模型必须匹配路由场景 ID，防止其他页面共享 store 的正文串场

## 素材与复用

播放三角形和暂停竖条均为 Figma 原始 SVG 导出，保存于 src/features/audio/assets。导出节点包括 2483:566、2483:568、2481:1324、2507:735、2507:651、2508:730。暂停图标组合对应画板中的两个原始竖条，不以字符替代播放/暂停图标。

场景原图由统筹 API 发布资源返回；页面代码没有固定咖啡图片地址。复用已有 PageHeader、TabPageLayout、AppState、统一 API 客户端、收藏复习页与幂等进度队列。新增场景容器、标题、原图查看器、来源/恢复展示组件，复用词卡与音频按钮。

## 验证证据

独立 H5 地址 [场景预览](http://127.0.0.1:5292/#/pages/scene/detail?sceneId=scene-coffee-shop)，输出 dist/dev/scene-h5。API 为统筹 8091 联调服务，VITE_USE_MOCK_API=false，VITE_LOCAL_DEV_MODE=true，未修改仓库环境文件。

浏览器已验证授权正文/原图、三个词汇和三个语块、固定版本 GET 词卡及 POST 收藏、整段和五句播放/暂停、中文开关、词卡关闭不跳位、稳定来源恢复、模拟麦克风录音回听、完成接口成功后的成果页及真实翻卡入口。网络中断验证 M15 自动降级和重新加载恢复。静音资源用于播放事件与时间区间验证。

| 视口     | 主要操作底部                                                           | 底栏顶部 | 结果                 |
| -------- | ---------------------------------------------------------------------- | -------- | -------------------- |
| 375×812  | 对话 724px；词汇/语块/恢复 723px；跟读 730px；失败页 723px；成果 727px | 738.91px | 操作可见，无横向溢出 |
| 390×844  | 对话 756px；词汇/语块/失败/成果/恢复 755px；跟读 760px                 | 768px    | 操作可见，无横向溢出 |
| 768×1024 | 主要操作 861px                                                         | 874.34px | 操作可见，无横向溢出 |

短屏详情原图高度缩为 225px，短屏对话区域允许内部滚动，跟读与失败行适当收紧；平板按实际底栏占用预留操作间距。M08-M17 的三个视口截图在同一证据目录中，以 Mxx-375/Mxx-390/Mxx-768 命名。词卡采用平板最大宽度 640px；原图查看最大宽度 700px。

- 全量 Vitest：58 文件、173 测试通过（16:01 最终验证）
- 场景持有文件 ESLint、Stylelint、Prettier 检查通过
- vue-tsc --noEmit 通过
- H5 构建输出 dist/build/scene-h5；微信构建输出 dist/build/scene-mp-weixin；最终源版本已重建，两个编译命令均退出 0

## 验收边界

本轮完成前端实现、单元测试、本地真实 HTTP 联调与 Chromium 浏览器验证。联调 API 的咖啡资源、授权与成果计数为统筹提供的开发样本，样本音频为静音；词卡显示服务端真实快照，部分文字与 Figma 演示内容不同。浏览器录音由模拟麦克风生成，页面本地文件链路已验证。

正式发布内容的可听发音、正式 OSS 签名过期行为、微信真机录音权限/后台行为和最终生产授权仍需要相应环境验收。微信构建成功不代表这些真机项已经完成。后端发布资源、素材授权和共享入口的集成验收由统筹记录。
