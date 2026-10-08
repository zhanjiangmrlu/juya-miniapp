# 2026-10-08 个人模块真实 HTTP 续开发交接

本轮接续个人 Figma 提交 `4753be4`，使用独立 H5 `5397` 与统筹的隔离开发 API `8093`，`VITE_USE_MOCK_API=false`。浏览器没有使用 `page.route` 伪造响应或直接注入 store；写入均通过页面操作。API 使用开发身份与内存适配器，真实 socket HTTP 联调不等于生产基础设施验收。

## 本组修改

仅提交以下三个代码/测试文件及本交接：

- `src/features/contact-profile/contact-form.ts`：将五个正式联系状态转换为“未填写/待联系/已联系/暂无法联系/不希望联系”，未知状态显示“状态待确认”，待更正文案优先。修改能力和次数仍使用服务端结果。
- `src/features/contact-profile/contact-form.spec.ts`：新增七项回归，覆盖五状态、未知状态和待更正优先，并检查修改能力不变。
- `src/pages/profile/contact-manage.vue`：只读标记改为“仅查看”，副标题改为“当前联系资料暂不可自行修改”。避免仅凭不可编辑推断“已核对”；保存、同意和更正处理不变。

真实 API 返回 `CONTACTED`、`can_self_edit=false` 时，页面原来显示“CONTACTED/已核对”，修复后显示“已联系/仅查看”。新回归首次六项失败，修复后十二项全通过；修改页在 375×812、390×844、768×1024 下无横向溢出或动作遮挡。

## 实际请求与截图证据

[证据目录](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-4053-7340-92f6-3aaa50d333cb/personal-real)保留请求、响应、脚本、截图及日志。JSON 已脱敏令牌、临时代码、上传策略、签名、密钥和微信号；以下业务路径省略 `/api/v1`。

| 证据文件                                                                             | 实际链路与结果                                                                                                                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseline.json`、`socket-readback.json`                                              | 默认收藏详情及版本来源定位、翻卡 `POST /reviews` 与完成、本人资料、权益分区/截止异常、消息已读及关联反馈均经真实 HTTP；业务响应 200。                                     |
| `new-favorite.json`                                                                  | 语块页真实收藏 `put together`，`POST /favorites` 200；载荷带版本及来源，响应包含快照；银行→详情→来源→固定版本原文定位通过。                                               |
| `writes-before.json`                                                                 | 未同意拒绝且无 PUT；同意后 `PUT /me/contact` 200 并读回；空原因拒绝，填写后 `POST /me/contact/corrections` 200。                                                          |
| `writes-current.json`                                                                | 实际 filechooser 选择 PNG→上传凭据 200→8093 `/local-dev/uploads` 204→提交反馈 200→reload 读回同一对象键；申请注销 PENDING→reload 保持 PENDING→撤回 REVOKED→刷新本人数据。 |
| `contact-status-before.json`、`contact-status-after.json`、`contact-responsive.json` | 联系状态修复前后响应/页面，以及三尺寸中文和可访问动作检查。                                                                                                               |
| `review-pronunciation.json`                                                          | 背面英文点击保持背面，签名 200、音频 206 `audio/wav`，按钮进入“暂停”；是开发静音样本传输/状态证据。                                                                       |

关键截图：`contact-status-before-390.png`、`contact-status-after-390.png`、`contact-final-375/390/768.png`、`new-favorite-source-390.png`、`feedback-selected-390.png`、`feedback-created-detail-390.png`、`deletion-pending-390.png`、`deletion-revoked-390.png`。均在上述目录。

共 39 项链路断言通过，无页面脚本错误；另有发音 HTTP、三尺寸联系状态和直接 socket 读取记录。37 个 PNG 包含诊断与最终状态；原 28 状态的完整设计复查仍见 `figma-20261008-personal.md`。

统筹先修复默认/新建收藏快照并重启 8093，本组随后完成来源复验、截图提交和注销撤回。**证据采集后，统筹再次将 API 8091/8092/8093 重启到 `86dcd8d`，内存样本已重置。** JSON 与截图是采集时证据，不能视为当前实例仍保留写入数据；初次联系写入与后续复验也分属不同实例。

## 验证与复跑

| 检查                                      | 结果/日志                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| 本组 Vitest                               | 25 文件、82 项通过；`vitest-final.log`                                                  |
| 联系状态回归                              | 修复后 12 项通过；`contact-regression-green.log`                                        |
| 目标 Prettier/ESLint/Stylelint、diff 检查 | 退出 0                                                                                  |
| 独立非 mock H5 构建                       | 退出 0；`build-h5.log`，输出 `dist/build/figma-20261008-personal-real-h5`               |
| 独立非 mock 微信构建                      | 退出 0；`build-mp-weixin.log`，输出 `dist/build/figma-20261008-personal-real-mp-weixin` |

在 `D:\个人\juya\juya-miniapp`，使用 `VITE_API_BASE_URL=http://127.0.0.1:8093`、`VITE_USE_MOCK_API=false`、`VITE_LOCAL_DEV_MODE=true`、`UNI_OUTPUT_DIR=dist/dev/figma-20261008-personal-real-h5`，执行 `pnpm dev:h5 --host 127.0.0.1 --port 5397 --strictPort`。构建时 `VITE_LOCAL_DEV_MODE=false` 并使用上表独立目录。

证据目录的 `baseline.cjs`、`socket-readback.cjs` 可复跑读取；`new-favorite.cjs` 和 `writes-current.cjs` 会创建开发收藏/反馈及申请并撤回注销，只用于授权的隔离 8093。联系写入复跑前需核对服务端能力。全仓门禁、公共 API 和最终集成由统筹负责，本组不继续扩大截图或构建。

## 待验收边界

- 上传确认指现有契约的直传 HTTP 204 成功及提交/读回对象键，没有单独 `uploads/confirm` 接口。开发 receiver 接收后丢弃文件，不能证明真实 OSS 对象、内容校验或持久化；multipart 日志未暴露实际文件包体。
- 开发限时权益缺 `server_now`/固定 `scene_ids` 且已过启动截止，本轮仅验证分区与异常摘要；默认反馈已过七天重开窗口，新反馈没有管理员回复，未验证真实补充/重开或权益完整生命周期。
- 未验证真实微信身份、MySQL/Redis 持久化、管理端跨服务、正式音频试听、真机图片/录音或生产部署。注销只验证开发 PENDING/REVOKED，未经过真实七天等待。

按 `Local\JuyaFigma20261008GitCommit` 持锁核对索引，仅暂存上述三文件和本交接，中文 Conventional Commit，finally 释放锁。未清空学习数据、修改其他组源码/配置/.env、推送、部署或停止其他服务。
