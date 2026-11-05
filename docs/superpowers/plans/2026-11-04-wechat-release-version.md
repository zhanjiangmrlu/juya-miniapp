# 小程序 release 自动版本 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 从 `release` 构建上传时自动在最近成功上传版本上加 1，无须手工指定版本号

**Architecture:** Node.js 管理候选版本、生产构建、官方 CLI 上传和成功记录，Git 提交及同步保证串行跨电脑接续。独立构建目录与上传状态日志保证不影响日常构建，并能在微信成功而 Git 失败时恢复

**Tech Stack:** Node.js、pnpm、Git、微信开发者工具 CLI、Vitest

**Spec:** `docs/superpowers/specs/2026-11-04-wechat-release-version-design.md`

## Global Constraints

- 只处理 `juya-miniapp` 的 `release` 生产包；测试包沿用原流程
- 以最后成功上传而非正式上线为准；初值 `1.0.0` / `100`
- 上传版本与包内 `versionName` 一致；`versionCode` 按成功上传次数递增
- 本地构建和明确失败不推进成功记录；不明确结果必须核对
- 新文件使用 kebab-case；函数采用箭头函数并添加参数含义注释；测试放在 `tests/`
- 提交标题使用 `type(scope): 中文说明`
- 本次不实际上传或推送；未来发布命令会自动提交并推送版本记录，此行为需用户确认方案

## Review Focus

- 未上线再次上传必须从最近成功记录递增，不能重复旧候选版本
- 微信上传成功但 Git 推送失败后恢复时，不得再次上传
- 超时或中断不能当作确定未上传并自动重复使用版本
- `test` 的 `1.5.0` 清单不能覆盖生产上传记录或决定生产候选版本
- 开发者工具路径、工作树锁及独立产物需要适配 Mac 和 Windows

---

### Task 1: 版本记录与状态转换

**Files:** Create `release/wechat-version.json`, `scripts/release-mp-weixin.mjs`, `tests/unit/scripts/wechat-release.spec.ts`

**Interfaces:** 读取并严格校验成功记录，产生 `{ version, versionCode }` 候选值；提供上传中、成功、明确失败、待核对状态的持久化接口

- [x] 先写版本递增、`1.0.9 → 1.0.10`、损坏记录拒绝、连续成功和失败不推进的测试，运行确认失败
- [x] 实现最小版本计算及原子记录写入，初始记录引用已有 `1.0.0` 上传回执
- [x] 测试结果不明确与成功但记录未同步时阻止下一次上传，运行确认通过

### Task 2: 生产构建上传及 Git 接续

**Files:** Create `scripts/release-mp-weixin.mjs`, `tests/unit/scripts/wechat-release.spec.ts`; Modify `package.json`（`dist/` 已被忽略，无需修改 `.gitignore`）

**Interfaces:** `pnpm release:mp-weixin [--dry-run|--build-only|恢复入口]` 使用 Task 1 的状态接口，消费官方 CLI 上传结果；Git 同步仅包含版本和清单，不夹带其他改动

- [x] 先写基于临时 Git 仓库及模拟 CLI 的测试：非 release、脏工作区、远程落后、锁冲突均在上传前拒绝，运行确认失败
- [x] 实现分支和远程检查、共享锁、独立生产构建、官方上传、成功记录提交与推送
- [x] 覆盖不上传模式、微信明确失败、成功后第二次自动递增，以及成功但 Git 提交/推送失败的恢复；确认模拟器未调用审核或发布
- [x] 测试超时/中断进入待核对状态，恢复入口不重复上传
- [x] 运行新测试集，Expected: 全部通过

### Task 3: 接续说明与完整验收

**Files:** Modify `AGENTS.md`, `HANDOFF.md`; Create `docs/operations/wechat-release.md`

- [x] 说明默认命令、基线、成功上传递增、手动上传后的同步、异常恢复及每次发布自动 Git 提交/推送的行为
- [x] 更新后续工作指令，禁止 release 上传继续手填版本；保留体验版手动切换流程
- [x] 运行 `pnpm test --maxWorkers=2` 和 `pnpm check`，Expected: 全部通过
- [x] 在 release 测试夹具或隔离副本执行真实生产候选包构建，Expected: 构建和已有页面/主包检查通过，成功记录仍为 `1.0.0`
- [x] 审查完整 diff，确认无凭据、真实上传、审核、发布或远程推送；完成后按中文提交规范保存本地实现

用户明确批准后完成实现。版本状态逻辑复用发布脚本，构建与官方上传独立在 `scripts/wechat-release-build.mjs`，避免为少量状态转换额外拆模块。测试先红后绿；审查发现的提交后中断、额外清单改动两项均有回归测试。全量524测试、静态检查、独立生产构建通过；成功版本记录仍为1.0.0。交付保留在本地功能分支，不真实上传或推送实现。
