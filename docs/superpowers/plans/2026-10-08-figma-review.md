# 小程序 Figma 并行复查补修计划

> **For agentic workers:** 使用 superpowers:executing-plans 执行所属任务；三个用户可见对话并行工作，当前对话统一验收。步骤采用复查、复现、补修、验证、交接顺序

**Goal:** 对照当前 Figma 逐屏复查 69 个设计状态，修复可确认的视觉差异，保留已有业务交互并交付最新证据

**Architecture:** 三个对话独占业务页面和模块，统筹独占公共组件、布局、全局样式、共享 store、服务与契约。沿用 main 工作目录，用独立浏览器、端口和构建目录；Git 暂存与提交串行执行

**Tech Stack:** Vue 3、TypeScript、uni-app、SCSS、pnpm、Vitest

**Spec:** https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2475-158；页面映射见 ../../figma-restoration-ledger.md；用户已批准三个并行对话加当前对话统筹的执行方式

## Global Constraints

- 遵守仓库 AGENTS.md；在 main 开发，中文 Conventional Commit，不创建分支、worktree、PR，不推送或部署
- 修改前读取所属源码、Figma design context 和截图；不得用旧交付记录代替本轮设计与浏览器证据
- 复用已有组件、SCSS 和原始素材；不引入 Tailwind；动态内容保留接口来源
- 不重写原有业务；若发现功能缺陷先复现，限所属范围修复并补必要回归测试
- 页面、资产、测试和交接文件均按下表归属；共享问题记录到本组交接文档，统筹处理
- 不改 .env、不记录凭据；使用进程环境变量；不得停止其他对话或既有服务
- 单组只运行所属检查、测试和独立构建；统筹最后运行全仓 check、test、H5 与微信构建
- 暂存与提交使用同一 Windows named mutex Local\JuyaFigma20261008GitCommit；一次 shell 调用完成 acquire、检查暂存区、仅添加本组文件、提交、finally release；严禁 git add .、git add -A、reset 或覆盖其他改动

## Review Focus

- 375×812 短屏：弹窗、词卡和底部按钮可达，无横向溢出
- 390×844 基准：逐状态比对布局、字号、颜色、间距、图标及图片比例
- 768×1024 大屏：内容最大宽度、弹层和固定操作不与导航重叠
- 请求失败、权限失效和空数据：保留既有业务降级，不因视觉补修露出受保护正文
- 播放暂停、录音切句和离页：已有生命周期与状态机保持有效；模拟设备和静音资源不能作为正式试听或真机验收

## 任务与文件归属

| 任务 | 状态                                                                                     | 独占目录                                                                                                                                                                                                                                                                        | 独占交接文件                               | 独立端口/输出                                                                         |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| 入口 | M01/M01S/M02/M03/M05/M05S/M06/M07，8 状态                                                | src/pages/home、src/pages/learning、src/features/home、src/features/learning                                                                                                                                                                                                    | docs/figma-20261008-entry.md               | 5391；dist/dev/figma-20261008-entry-h5、dist/build/figma-20261008-entry-*             |
| 场景 | M08/M09/M09S/M09T/M09U/M12–M18、M09P0–P5/M09I2–I5/M14P1–P5/M14I2–I5/M14PR/M14IR，33 状态 | src/pages/scene、src/features/scene、src/features/audio、src/features/recording、src/features/vocabulary-sheet、src/features/learning-progress、src/features/learning-result                                                                                                    | docs/figma-20261008-scene.md               | 5392；dist/dev/figma-20261008-scene-h5、dist/build/figma-20261008-scene-*             |
| 个人 | M19–M25/M27–M47，28 状态                                                                 | src/pages/favorites、src/pages/profile、src/pages/entitlement、src/pages/feedback、src/pages/account、src/features/favorites、src/features/profile、src/features/contact-profile、src/features/entitlements、src/features/messages、src/features/feedback、src/features/account | docs/figma-20261008-personal.md            | 5393；dist/dev/figma-20261008-personal-h5、dist/build/figma-20261008-personal-*       |
| 统筹 | 公共问题与最终验收                                                                       | src/components、src/layouts、src/styles、src/stores、src/services、src/shared、src/static、src/pages.json、src/pages/compat、配置、中央台账                                                                                                                                     | 本计划、docs/figma-20261008-integration.md | 5390；dist/dev/figma-20261008-integration-h5、dist/build/figma-20261008-integration-* |

## Task 1–3: 所属页面复查与补修

- [x] 阅读 AGENTS.md、中央台账、2026-10-02 本组交付及最终集成记录，核对文件归属
- [ ] 当前 Figma 完整设计证据仍有缺口：入口 8/8、个人 28/28；场景 23/33 高保真 context、17/33 独立设计 PNG，额度恢复后补取其余。已取得全部 69 状态当前 metadata，不作为高保真替代
- [x] 对当前实现获取 390×844 全状态截图，375×812 和 768×1024 验证基础页、弹层与长内容；记录每项实际覆盖，不冒称未截图状态
- [x] 将确认的视觉差异列为复现步骤、预期、实际、所属文件；动态文字差异单独说明
- [x] 修复所属差异并复核截图、素材加载和有效几何；功能缺陷先证明失败，再补修和验证
- [x] 运行本组格式、ESLint、Stylelint、目标测试；独立 H5 与微信构建；记录命令、退出码、截图和保留的验收边界
- [x] 写入本组交接文档，提交本组文件；没有代码缺口时明确报告复查结果，不为提交制造修改

## Task 4: 统筹集成

- [x] 确认基线 main/6ddc756 工作区干净，43 个正式页面文件齐全
- [x] 当前 Figma 69 状态逐节点对应既有台账，无缺失映射
- [x] 启动前 pnpm check、65 文件/224 项测试、独立微信构建通过
- [x] 启动并等待三个对话完成，保存 threadId 和交接状态；三个交付提交为 dfb0dd3、7c7f2d1、4753be4
- [x] 处理交接中的公共问题，确认三个范围没有越权修改
- [x] 复核公共布局、导航、素材、短屏与长内容的最终浏览器表现
- [x] 在所有源码修改落地后运行 pnpm check、pnpm test、独立 H5 与微信构建、git diff --check；全部通过
- [x] 更新中央台账与最终集成记录，中文提交，逐组报告提交、测试、证据和未完成边界；保留 Figma 额度造成的设计证据缺口

## 2026-10-08 执行裁定与独立审查

实际本轮业务修改保持纯样式及原始 SVG，未改动 API、事件、状态机、权限或提交规则。对卡片、录音区、来源句、翻卡和紧凑行用真实浏览器几何证明差异；公共长内容遮挡由统筹独立复现失败，再修复到 12 图/40 断言通过。没有增加镜像源码的样式字符串单元测试

公共任务增加 src/static/home/capsule-close.svg 原始设计素材对齐，由统筹独占；原样复制后根 16×16，SHA256 与当前 Figma 原始文件相同。M06/M07 导航归属、M07 确认需求文案、M01S 必要关闭入口保留既有交互；设计同步差异记录在集成台账

独立只读审查已完成，覆盖最终候选 12 个源码/资源文件，未发现本轮引入的 P0/P1/P2 问题；设计额度缺口和真实设备/外部环境仍不属于已通过验收。全仓 check、测试 65 文件/224 项、统一非 mock H5/微信构建和差异检查全部通过
