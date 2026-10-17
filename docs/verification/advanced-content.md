# Advanced content and native return evidence

2026-10-17, isolated local API/database, real Redis/Celery Worker and Tencent-generated WAV.

- After the admin batch published two reviewed candidates and saved a new full catalog order, the learning list followed that order. The original stable card retained completion and 1-card/1-day statistics after its publication changed. Screenshot: `mini-published-order.png`.
- The new card displayed the uploaded image, actual dialogue duration, complete translation block and controlled vocabulary audio. A cached word replay reached playing in the browser. Screenshot: `mini-batch-pronunciation.png`. These are H5/WAV observations, not WeChat MP3 or device acceptance.
- Both contact and identity editors now use the same three-choice guard for custom return and a WeChat native `page-container` barrier for system return. The barrier re-arms after a system close and waits for `afterleave` before an approved real page return. A missing close acknowledgement keeps the editor; an unsupported WeChat version cannot begin edits.
- Three native event-boundary regressions cover continue/save failure, closure acknowledgement/no double navigation, and timeout/unsupported capability. These simulate platform callbacks; they do not prove physical gesture behavior.

Latest checks: 36 unit/contract tests, format/lint/style/TypeScript, H5 and MP-Weixin builds passed. Compiled WXML contains `page-container`, zero duration, no overlay, `beforeleave`/`afterleave`; 9 pages and exactly two bottom tabs verified.

References: [DCloud page-container documentation](https://doc.dcloud.net.cn/uni-app-x/component/page-container.html), [uni-app page lifecycle](https://uniapp.dcloud.net.cn/tutorial/page). WeChat's component page could not be read through the documentation browser. The implementation uses WeChat's built-in component; no uni-app-x component package was added.

Remaining device acceptance: real wx.login, native right-swipe/Android back and text entry with the barrier active, image pinch/pan, full audio seeking/pause/non-overlap and avatar selection/upload. New production deployment, private OSS and mixed load acceptance remain pending.

## 独立审查后的未知结果恢复

完成提交响应未知、卡片随后发布新版本时，结果查询若404，使用内存中冻结的原正文和原幂等键重试；服务端确定拒绝旧版本后才释放操作，下一次主动提交可以使用新版本。联系方式同样先确认原提交，不把后续输入替换到旧键；正文仍不写本地持久存储。两个新增回归先失败再通过；完整38项测试、格式/脚本/样式/类型检查、H5及9页MP构建通过。真机和真实微信接入仍待验收。
