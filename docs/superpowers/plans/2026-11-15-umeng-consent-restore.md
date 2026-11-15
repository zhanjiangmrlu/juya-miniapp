# 友盟手动许可统计恢复实施计划

> **For agentic workers:** 使用 superpowers:executing-plans 在当前会话逐项实施

**Goal:** 在 test 恢复用户手动开启后上报、关闭后停止的统计链路
**Architecture:** 复用隔离官方 SDK、按账号/版本许可和后端五类事件授权
**Tech Stack:** Vue 3、uni-app、umtrack-wx 2.8.0、FastAPI、SQLAlchemy
**Spec:** ../specs/2026-11-15-umeng-consent-restore-design.md

## Global Constraints

- 原 test 工作区；仅测试构建/环境开启，生产保持关闭
- 不暴露真实密钥；自动测试使用隔离夹具；不操作原业务库
- 不新增业务事件；现有五类成功事件及标准基础统计
- 无推送、远程部署或微信上传

## Review Focus

- 首次开启时处于当前页面，也能生成访问统计
- 离线关闭、异步初始化和逐事件授权迟到均不能重新开启
- 新披露发布后旧版本许可不能运行
- 未配置、错误环境及H5产物不能含真实SDK
- SDK随机标识生命周期对留存/新增口径的影响必须说明

### Task 1: 测试客户端及许可控制

- [x] 更新 analytics-config、真实SDK和组件回归，先确认test开启失败
- [x] 恢复测试SDK工厂与配置，保留生产门禁，修正开启后的当前页面上报和撤回竞态
- [x] 执行配置、SDK、隐私和构建契约验证

### Task 2: 测试API及新版披露

- [x] 增加显式配置/新版披露/旧许可失效/关闭后事件拒绝回归并确认失败
- [x] 恢复受控测试能力，更新版本化披露及前端状态文案
- [x] 执行API定向与完整测试及静态检查

### Task 3: 最终验证与交付

- [x] 两仓完整检查，微信test/production隔离构建及实际产物边界检查
- [x] 审查最终变更，更新HANDOFF及操作/验证记录，说明真机与远端未验边界

## Execution Ledger

- 用户已确认恢复基础统计＋五类业务事件；在指定test分支原地实施

- Task 1: 配置、当前页、UUID先RED；真实SDK和编译模块26项GREEN，生产产物保持关闭
- Task 2: 新版披露/许可先RED；API20项SQLite及MySQL20项GREEN；完整SQLite796/60，Node条件补跑5通过
- Ruling: 只持久保存同许可随机UUID以保持基础新增/留存口径，事件队列不落盘；冷启动失效清理新增3项RED→GREEN
- Review: 独立审查P2冷启动UUID残留已修复并复核，18项定向复验通过，无新重要问题

- Task 3: 最终小程序142文件/861测试、完整check通过；微信测试私有配置构建及meta/包体检查通过（543353B），测试SDK/Key/API及无生产API布尔核验通过；生产双模式无SDK构建通过。独立复核无新重要问题。无提交/推送/部署/上传
