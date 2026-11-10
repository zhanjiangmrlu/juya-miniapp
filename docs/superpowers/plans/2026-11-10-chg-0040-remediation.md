# CHG-0040 审计问题修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复审计 A01—A07，保留本地 test 热更新使用测试数据，逐项记录真实验收与外部限制。
**Architecture:** 延续 Vue/uni-app 与现有协议/账号许可 API；微信入口使用静态模块引用；按 Figma 区分首告/触发/错误状态。用户已授权据实际项目补齐文案，正文与第三方实际行为必须一致。
**Tech Stack:** Vue3、TypeScript、uni-app、FastAPI、MySQL。
**Spec:** ../../verification/chg-0040-requirements-design-audit-20261110.md 与原 CHG-0040 Word、Figma M01—M08。

## Global Constraints

- 现有 test 工作区与微信项目实时验收，不创建另一个工作树覆盖当前预览。
- 保留原业务数据、会话、资料与学习权限；不静默登录、不重放收藏/完成、不自动续播。
- 正式材料依据实际主体与功能撰写，不编造主体、邮箱、保存/删除能力。
- 无有效登录、独立许可、完整配置时无新增分析；用户已明确调整范围：保留五类业务事件，并如实披露 SDK 必要设备/系统/网络、随机标识、内部账号和自动会话/页面字段；原始微信身份、凭据和个人输入继续禁止，不把SDK私有请求协议当正式API。
- 不以隔离测试、接口200或发布健康代替真实友盟接收/真机验收。

## Review Focus

- 已有会话首页仍须评估新版协议，不能吞掉导入异常。
- 新版两种登录按钮都必须执行真实微信编译处理函数，busy/取消/失败保留正确状态。
- 首告、触发、失败及窄屏高度不同，链接在微信 flex 默认样式下仍左对齐。
- 正文与业务真实字段/处理者一致，配置缺失不取得虚构同意。
- SDK自动字段/匿名ID/队列/请求必须经过验证，不能以密钥存在直接放开。

### Task 1: 微信主流程回归与修复

**Files:** app-login-prompt.vue、pages/home/index.vue、tests/contracts/mp-source-navigation.spec.ts。
**Interfaces:** 消费现有 session、useAccountStore、privacy、considerHomeConsent；产出真实编译的两种登录和已有会话首页可执行路径，不改HTTP契约。

- [x] 添加实际编译组件/首页回归，修复前复现登录异常及已有会话跳过判断。
- [x] 用静态导入修复两入口，运行定向及全量 pnpm test，预期全部通过。

### Task 2: Figma 交互文案与布局

**Files:** app-consent-dialog、app-privacy-sheet、login-prompt 上下文及对应测试。
**Interfaces:** 保留 login(enabled)/close/policy 事件；增加可选明确账号动作上下文，不改变URL安全返回。

- [x] 写收藏听读文案/错误重试/取消行为回归，再实现；首告、触发与失败态按 Figma 分别设置原生 scroll-view 高度并保留视口上限，44/46px操作区域。
- [ ] 政策链接和控件用类选择器显式覆盖微信flex默认样式；微信截图核对 M01—M08 可达状态，格式/lint/style/typecheck全部通过。

### Task 3: 协议正文与实际发布配置

**Files:** 三份版本化政策、policy.vue、API政策加载/配置及验证文档（具体落点依据现有配置/部署边界确定）。
**Interfaces:** kind/version/title/content，版本 chg0040-20261110-v1；匿名政策与可信账号的已确认版本保持一致。

- [x] 核对微信官方规则、运营主体/联系渠道/存储/权利入口与源码，完成三份准确正文。
- [ ] 先验匿名阅读/返回与版本变更测试，再接入真实配置，验证目录与正文一致，三选择及首告可达。配置条件不足明确记录，不伪造完成。

### Task 4: 统计链路与最终核验

**Files:** 按实际SDK审计结果确定，复用已有五事件/许可门禁与后端校验。
**Interfaces:** 可信业务账号、许可revision、event_id与五事件白名单；供应商数据协议必须有官方支持。

- [x] 调查锁定 SDK 自动字段和网络。用户明确保留友盟并扩大必要字段披露后，完成隔离运行时、独立许可/版本/账号门禁、拒绝/撤回/换号/迟到回调回归。生产构建仍禁止。
- [ ] 全量检查、真实微信产物与本地热更新复核，独立审查；更新 A01—A07 和 T396—T415 状态，只标确实已验证项。
