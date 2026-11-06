# 学习笔记与列表分区验收（2026-11-06）

本轮在 `test` 分支本地实现整合07学习笔记增量。未推送、部署、上传OSS或微信包；本地配置、业务数据和原 `dist/dev` 热更新目录保留。

## 交付行为

- “全部场景”沿用待学集合；“含学习笔记”由服务端按已发布有效PDF筛选，包含已学卡。两个Tab独立保存可信结果、页数、真实总数、加载和失败状态；首屏失败不填0，缩页重建快照，空集合清除旧行。
- 来源为 `learning_notes`。正常笔记正文首张和下一张用 `require_study_note=true` 原子准入，合法卡保留默认开始规则，失效候选只推进队列索引，网络失败保留重试；普通 `learning` 不要求PDF。
- 详情仅有当前有效发布附件时显示入口。每次打开/重试只读刷新详情，以独立笔记版本申请受控票据；下载结束后再次服务端验权/版本核对，账号及跨代迟到响应只回收自己文件。
- 打开原生PDF前暂停完整音频和词汇/词典发音、取消在途播放。文档期间抑制外部续播；实际 `onHide/onShow` 返回后保留译文、位置、真实进度及倍率，由用户手动续播。`openDocument` 成功不是关闭事件。
- PDF登录意图及笔记来源完整保留；正文更新的恢复为只读，新账号登录后自动重验当前笔记，不新增开始/完成/打卡。普通首次正文和普通后台音频规则保留。
- 主动换Tab回顶部，详情返回保留原Tab与真实滚动；首页新进入默认全部。无栈、冷恢复的标题栏返回笔记来源。

## 最终命令结果

最终检查、测试数量、构建及预算数值见本文末尾最终记录。使用Node22.23.3和pnpm11.25.0。

```sh
pnpm check
pnpm test
UNI_OUTPUT_DIR=dist/study-notes-final-build/h5 VITE_API_BASE_URL=http://127.0.0.1:8394 VITE_STATIC_ASSET_BASE_URL='' VITE_REMOTE_FONTS=false pnpm build:h5
UNI_OUTPUT_DIR=dist/study-notes-final-build/mp-weixin VITE_API_BASE_URL=http://127.0.0.1:8394 VITE_STATIC_ASSET_BASE_URL='' VITE_REMOTE_FONTS=false pnpm exec uni build -p mp-weixin --mode development
UNI_OUTPUT_DIR=dist/study-notes-final-build/mp-weixin node scripts/verify-mp-page-meta.mjs
UNI_OUTPUT_DIR=dist/study-notes-final-build/mp-weixin node scripts/verify-mp-package-budget.mjs
```

完整测试中的 `remote-font-build.spec.ts` 另行构建test/production，断言主包小于既定450KiB，未放宽阈值。仅场景运行时使用的 `use-reading-position.ts` 原样移入场景分包，其测试同步迁移；前后原实现字节一致。详情15×17官方SVG也保留单份于场景分包；H5实际200、微信产物存在，列表/已学/空态图标对应12×14、12×12、40×48原始尺寸。首页、听读、底部导航未改。

## 行为测试与审查修复

本提交内的回归依据：

- `tests/unit/composables/use-scene-list.spec.ts`：服务端筛选query、真实有效页收缩/清空、失败快照、账号与请求代次隔离
- `tests/unit/features/learning/learning-list.spec.ts`：双Tab、计数/失败、账号同时清理；`scene-card.spec.ts`：授权与独立复习维度
- `tests/unit/services/{learning-queue,source-queue,navigation}.spec.ts`：失效候选索引、合法来源、冷恢复和登录安全目标
- `tests/unit/sub-packages/scenes/{study-note,study-note-platform,detail-completion}.spec.ts`：每次重验、服务端撤权/换附件、跨代文件所有权、guard与来源返回
- `tests/unit/features/learning/{audio-controller,scene-word-preload}.spec.ts`：暂停两路及迟到请求、文档生命周期保留实例/手动续播、只读恢复401保留意图
- `tests/unit/features/account-login.spec.ts`：真实登录按钮保留PDF意图，普通登录仍首页，既有分享承接保持

主要新增行为均先复现RED再修复GREEN，包括旧请求迟到删除新文件、正文变更及401的登录意图丢失、缩页残留、跨账号授权回退、无栈返回及原子准入。两轮独立定向复审已关闭阻断问题。

## 真实浏览器与证据边界

[版本化结果摘要](study-notes-20261106/verification-summary.json)记录真实390×845 Chrome、独立SQLite/HTTP及合成账号结果，不包含会话或资源票据。

- 两Tab使用真实总数，免费与受限笔记混合显示，已学项保留复习标识；受限点击只显示授权提示，无提前正文/PDF请求，真实详情403。
- 详情返回DOM `scrollTop` 为120→120，主动换Tab为0，首页实际入口重新进入默认全部；长标题无横向溢出，入口高度≥44且独立右对齐。
- 队列返回候选后移除PDF，最终guard真实409，SQLite该候选开始数不增，合法下一张开始数为1。真实后端缩页2/清空0时无陈旧行。
- 实际store.restore A→B后B列表失败，不显示A两栏或授权。真实发布正文b2后恢复/重试只读；401后经实际同意/登录按钮恢复全新合成账号，该卡开始数0，自动重验PDF。
- H5不能取得真实微信身份或打开微信原生文档。登录身份交换仅在私有夹具边界注入合成会话；浏览器最终显示微信内查看提示。原生下载/打开及耳机事件只按SDK端口行为测试采信。

| 证据                | 截图                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 全部/笔记列表       | [全部](study-notes-20261106/mini-all-390.png)、[笔记](study-notes-20261106/mini-notes-390.png)                                            |
| 免费/受限与已学     | [混合权限](study-notes-20261106/mini-notes-mixed-access-390.png)                                                                          |
| 长标题入口          | [完整换行](study-notes-20261106/mini-long-title-note-390.png)                                                                             |
| 真后端空集合/失败   | [空态](study-notes-20261106/round1-real-empty-390.png)、[新账号失败](study-notes-20261106/round1-account-b-failure-390.png)               |
| guard后合法下一张   | [下一张](study-notes-20261106/round1-guard-next-390.png)                                                                                  |
| 401实际登录按钮承接 | [登录](study-notes-20261106/round2-readonly-401-login-390.png)、[自动笔记请求](study-notes-20261106/round2-new-account-auto-note-390.png) |

## 待验与已知边界

iOS/Android微信、蓝牙耳机和系统面板真机验收未完成，不能用H5或端口模拟替代。未承诺撤回用户已导出的文件。

集中修复后，旧Tab下拉的成功/失败回执仅能重置发起该请求的可见分区和浏览代次。下一次合法下载前清扫上次异常退出遗留的完整自有格式PDF，排除活动下载、打开的文档及无关文件。回归覆盖A→B、A→B→A，以及包含孤儿和活动文件的模拟微信文件目录。真实设备强杀与磁盘回收仍待验证。

## 最终记录

- `pnpm check`：格式、ESLint、Stylelint、类型检查全部通过
- `pnpm test`：114文件、625测试全部通过；包含原450KiB test/production断言
- 隔离H5及微信local构建：全部通过，18页面、三底Tab、共享音频入口校验通过
- 微信local使用本地字体：主包865822B；按平台预算加20%估计1038987B，仍留1058165B，要求保留102400B
- 标准远程字体test主包459435B、production主包458354B，两者均低于450KiB（460800B）；不以本地字体开发包冒充标准发布包大小
- 四份图标非空、主包/分包位置及两端引用核对通过；微信详情SVG与源码原字节一致，H5资源实际200，原dist/dev保留，OpenAPI与后端解析一致
- 本轮未推送、上传或部署。iOS/Android与耳机真机待验
