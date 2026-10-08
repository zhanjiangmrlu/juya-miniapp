# 场景组 2026-10-08 补证及真实 HTTP 续查

起点 main/`4b0960d`，延续场景组原独占范围。此前 `7c7f2d1` 的23个context、17张设计PNG及缺证记录保留在 [初次交接](figma-20261008-scene.md)，本文补齐缺口并记录新差异、最终实际HTTP验证。未改中央台账、公共组件/layout/store/service、其他仓库或.env；不创建分支、worktree、PR，不推送或部署。

当前本组33/33状态均有本轮高保真context与设计PNG；没有剩余设计读取缺口。设计只作为对照，未用于实现图片。全部状态在实际8091开发API上重新取得390×844截图，前12个基础/弹层状态另外覆盖375×812与768×1024。

## 补证来源与逐项闭环

设计 evoGqXQ4pI3Q3cdLpc6NOc，节点从中央台账提取；按 figma-design-to-code 读取明确节点，Vue/TypeScript/SCSS及skillNames参数保持一致，context请求包含截图，小批量顺序读取。此次补证没有再次触发额度错误。

补齐context10项：M14P2、M09I2、M09I3、M09I4、M09I5、M14I2、M14I3、M14I4、M14I5、M14IR。
补齐设计PNG16项：M09P0、M09P1、M09P2、M09P3、M14P1、M14P2、M14P3、M14P5、M09I2、M09I4、M09I5、M14I2、M14I3、M14I4、M14I5、M14IR。

M14P2 context及M09P0 PNG复用统筹本次取得的证据，原始目录为 `C:/Users/Administrator/.codex/visualizations/2026/10/08/01a1193a-1cf5-7c13-a7c7-320a32d90799/continuation/design`，已复制入本组补证目录，其余9context/15PNG由本组顺序取得。此前同轮有效证据仅按实际路径复用，未冒称全部设计由此次重新调用。

续查证据目录：C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation。合并索引为 `design-evidence.json`，逐状态审阅映射为 `state-review.json`。M09I3新context与此前同轮PNG共同闭环。

| 状态  | 节点                                                                               | 当前高保真context                                                                                                                      | 当前设计PNG                                                                                                                            | 最终实现390                                                                                                                            | 本次核对                               |
| ----- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| M08   | [2479:419](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-419)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M08.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M08.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M08-390.png)   | 基础/弹层布局、资源及动作复核          |
| M09   | [2479:473](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-473)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09-390.png)   | 基础/弹层布局、资源及动作复核          |
| M09S  | [2479:549](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-549)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09S.txt)           | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09S.png)           | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09S-390.png)  | 基础/弹层布局、资源及动作复核          |
| M09T  | [2479:641](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-641)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09T.txt)           | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09T.png)           | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09T-390.png)  | 基础/弹层布局、资源及动作复核          |
| M09U  | [2479:733](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-733)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09U.txt)           | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09U.png)           | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09U-390.png)  | 基础/弹层布局、资源及动作复核          |
| M12   | [2479:787](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-787)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M12.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M12.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M12-390.png)   | 基础/弹层布局、资源及动作复核          |
| M13   | [2479:841](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-841)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M13.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M13.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M13-390.png)   | 基础/弹层布局、资源及动作复核          |
| M14   | [2479:895](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-895)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14-390.png)   | 基础/弹层布局、资源及动作复核          |
| M15   | [2479:975](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-975)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M15.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M15.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M15-390.png)   | 基础/弹层布局、资源及动作复核          |
| M16   | [2479:1035](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-1035) | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M16.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M16.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M16-390.png)   | 基础/弹层布局、资源及动作复核          |
| M17   | [2479:1089](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-1089) | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M17.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M17.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M17-390.png)   | 基础/弹层布局、资源及动作复核          |
| M18   | [2479:1143](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2479-1143) | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M18.txt)            | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M18.png)            | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M18-390.png)   | 基础/弹层布局、资源及动作复核          |
| M09P0 | [2507:569](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-569)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09P0.txt)          | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09P0.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09P0-390.png) | 整段播放；阅读行保留高亮，五句圆钮浅绿 |
| M09P1 | [2507:653](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-653)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09P1.txt)          | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09P1.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09P1-390.png) | 指定句高亮/暂停图标                    |
| M09P2 | [2507:737](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-737)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09P2.txt)          | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09P2.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09P2-390.png) | 指定句高亮/暂停图标                    |
| M09P3 | [2507:821](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-821)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09P3.txt)          | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09P3.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09P3-390.png) | 指定句高亮/暂停图标                    |
| M09P4 | [2507:905](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-905)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09P4.txt)          | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09P4.png)          | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09P4-390.png) | 指定句高亮/暂停图标                    |
| M09P5 | [2507:989](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2507-989)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09P5.txt)          | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09P5.png)          | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09P5-390.png) | 指定句高亮/暂停图标                    |
| M14P1 | [2508:638](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-638)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14P1.txt)          | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14P1.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14P1-390.png) | 对应句与计数、绿色暂停原音标签         |
| M14P2 | [2508:732](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-732)   | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14P2.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14P2.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14P2-390.png) | 对应句与计数、绿色暂停原音标签         |
| M14P3 | [2508:826](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-826)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14P3.txt)          | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14P3.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14P3-390.png) | 对应句与计数、绿色暂停原音标签         |
| M14P4 | [2508:920](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-920)   | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14P4.txt)          | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14P4.png)          | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14P4-390.png) | 对应句与计数、绿色暂停原音标签         |
| M14P5 | [2508:1014](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-1014) | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14P5.txt)          | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14P5.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14P5-390.png) | 对应句与计数、绿色暂停原音标签         |
| M14PR | [2508:1108](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2508-1108) | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14PR.txt)          | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M14PR.png)          | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14PR-390.png) | 模拟录音回听；两条原始3×12暂停SVG      |
| M09I2 | [2510:713](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-713)   | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09I2.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09I2.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09I2-390.png) | 指定句高亮/继续图标                    |
| M09I3 | [2510:797](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-797)   | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09I3.txt) | [此前同轮证据](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/design/M09I3.png)          | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09I3-390.png) | 指定句高亮/继续图标                    |
| M09I4 | [2510:881](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-881)   | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09I4.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09I4.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09I4-390.png) | 指定句高亮/继续图标                    |
| M09I5 | [2510:965](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-965)   | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09I5.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M09I5.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M09I5-390.png) | 指定句高亮/继续图标                    |
| M14I2 | [2510:1049](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1049) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14I2.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14I2.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14I2-390.png) | 对应句与计数、绿色播放原音标签         |
| M14I3 | [2510:1143](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1143) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14I3.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14I3.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14I3-390.png) | 对应句与计数、绿色播放原音标签         |
| M14I4 | [2510:1237](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1237) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14I4.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14I4.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14I4-390.png) | 对应句与计数、绿色播放原音标签         |
| M14I5 | [2510:1331](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1331) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14I5.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14I5.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14I5-390.png) | 对应句与计数、绿色播放原音标签         |
| M14IR | [2510:1425](https://www.figma.com/design/evoGqXQ4pI3Q3cdLpc6NOc?node-id=2510-1425) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14IR.txt) | [本次补证](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/design/M14IR.png) | [实际HTTP390](C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/M14IR-390.png) | 暂停回听；原始播放SVG与录音状态保留    |

375/768的实际HTTP截图覆盖 M08、M09、M09S、M09T、M09U、M12、M13、M14、M15、M16、M17、M18，命名 `状态-375.png`、`状态-768.png`。P/I只在390独立触发，其他宽度复核基础页，不冒称33状态全三宽覆盖。逐状态对照图为 `comparison-current.png`、`compare-states-0.png` 至 `compare-states-3.png`，最终单状态PNG与JSON几何为验收依据。

## 新确认差异与所属补修

| 差异                       | 复现与原因                                                                                                                           | 补修及复验                                                                                                                                                               | 文件                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| M14播放/暂停原音文字不可见 | 播放任意原音后inline按钮取得active类，继承白色文本；背景由inline保持透明，白色录音区上白字不可见。真实浏览器计算色为rgb(255,255,255) | inline单独指定primary文字色；播放/暂停均为rgb(78,127,59)。inline-audio-probe.cjs RED→GREEN；不影响compact/large/pill                                                     | audio-button.vue                                       |
| M14原音按钮横向位置        | 活动态标签自然宽48px，暂停条x293/x299；设计2508:781标签80px、右端354，条节点2508:824/825为x258/x264                                  | 仅inline使用104px右对齐容器；仅playing时80px标签及7px间距；暂停后保留自然宽播放标签。inline-geometry.cjs三尺寸播放/暂停6截图、33断言RED→GREEN                            | audio-button.vue                                       |
| M14PR回听暂停条少1px       | 前次复用句子暂停3×11条；当前M14PR原图为3×12、圆角0.7                                                                                 | 使用figma-use只读exportAsync导出2508:1198原始SVG，两个回听暂停条按根尺寸3×12渲染，间距4；逐字节与原始导出一致                                                            | pause-replay-white.svg、recording-controls.vue         |
| M09P0首句圆钮错误活动配色  | 整段播放时第1句仅作为阅读行高亮，却将其高亮透传给逐句AudioButton.selected，使圆钮深绿；设计五个圆钮均浅绿                            | 新增可选展示prop audioSelectionVisible，默认true，仅整段播放时关闭阅读高亮对圆钮选中色的传递；行高亮、音频目标与事件保持。整段浅绿、阅读行高亮、切第2句深绿三项RED→GREEN | dialogue.vue、dialogue-list.vue、dialogue-sentence.vue |

新SVG根尺寸3×12、153字节；SHA256：
`4fdcd220f50cf65673603923f277c25c13542b310b67912abc57d9fe66b00d60`。
原始导出保存 `design/pause-replay-export.json`，逐字节比对与哈希证据为 `pause-asset-proof.json`。素材只位于本组 `src/features/audio/assets`，没有修改共享 `src/static`。句子暂停仍使用原资产，SVG宽高属性没有被覆盖。

独立只读审核已核对级联、SVG根尺寸、默认prop对跟读/失败页的保护，确认没有阻断问题。新增inline几何也经独立审核：compact/large/pill不匹配宽度、字体或wide标签规则，业务状态计算与事件没有改变。API、事件、点击区间、绑定、音频/录音状态机、禁用、收藏/完成与业务流程均保留。原音标签与圆钮配色改变仅影响呈现。

动态内容和业务状态仍来自API：成果1/6/3与12天、词卡解释与画板示例存在数据差异，录音可重录状态以控制器为准；不为画板灰态禁用业务动作或硬编码文字。平台字体渲染差异不被宣称为像素级完全相同。

## 实际 HTTP 链路与结果

5396独立H5使用 `VITE_API_BASE_URL=http://127.0.0.1:8091`、`VITE_USE_MOCK_API=false`、`VITE_LOCAL_DEV_MODE=true`、`dist/dev/figma-20261008-scene-real-h5`。浏览器API经Vite同源代理实际请求8091；本次API为统筹启动的JUYA_LOCAL_DEV_MODE服务，内容及身份是本地开发样本，不是正式微信身份、生产数据库或真实OSS。

`browser-real.cjs` 没有接口响应fulfill/route夹具，58截图、203断言、0页面脚本错误，最终记录147个浏览器API响应，状态均200。包含33设计状态390截图、12基础/弹层在375及768截图、另1网络错误降级截图；媒体与图片实际加载。只有最后一项对签名请求做abort错误注入，明确区别于正常真实HTTP请求，降级后五句正文仍可读。

`http-workflow.cjs` 在统筹重启修复后的8091上运行，15断言通过、2截图、0脚本错误：

| 实际链路                      | HTTP及验证结果                                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 场景打开、资源签名、图片/音频 | POST open和GET固定修订signed-url为200；原图及播放器实际加载                                                                         |
| coffee-audio字节范围          | 直接8091发送Range bytes=0-99返回206，Accept-Ranges=bytes，Content-Range=bytes 0-99/2208044，Content-Length=100，实际100字节         |
| 固定词卡                      | GET word-latte为200，revision=01JLOCAL000000000000000001，entryVersion=1，source=sentence:sentence-1:entry:word-latte，权威原句匹配 |
| 收藏保存                      | 浏览器POST /favorites为200，发送固定词条、来源、修订和幂等键，画面更新已收藏                                                        |
| 收藏读取与列表                | GET刚创建的收藏及GET列表均200，sources含发布修订、entryVersion与word-latte entry_snapshot；源原句正确                               |
| 按保存来源返回原文            | 使用刚读取sources的真实定位/修订/词条版本进入return-source，再发固定词卡请求并显示对应原句                                          |
| 完成学习                      | 用户按钮触发唯一POST complete=200；成功后导航completed并GET result，3成果卡显示1/6/3                                                |
| 本次测试收藏清理              | 只删除脚本刚创建的收藏，DELETE=200，不删除默认或其他测试收藏                                                                        |

完成服务本地返回空progress，成果接口为开发计数，故这里只验浏览器/API契约与导航，不宣称生产计数、幂等落库或正式授权验收。实际请求记录见 `browser-results.json`、`http-workflow-results.json`；截图 `M09S-favorited-real-390.png` 和 `M16-completed-real-390.png`。

`audio-real.cjs` 不拦截响应，实际开发静音WAV与Range解码三项通过：第5句约20.562s起播，暂停保持20.589s，最高采样25.168s后停止释放设备。结果 `audio-real-results.json`。这是实际HTTP媒体定位，仍不属于正式声音试听。

浏览器录音仍使用Chromium模拟麦克风，真实本地blob回听、暂停、切句与隐藏清理用于状态验证，未将模拟设备写成真实麦克风/微信真机通过。

## 长内容与最终门禁

长内容不能修改共享API开发样本。本次另用独立 `browser-long-fixture.cjs` 的明确响应夹具复跑18句对话含中文、18句跟读、18词条、超长词卡：三个尺寸各4张，共12截图、40断言、0脚本错误，底部动作与收藏可达。该结果保留fixture身份，不混入实际HTTP计数或冒充8091服务验收。

最终所属范围Prettier、ESLint、Stylelint及 `git diff --check` 均退出0；目标Vitest13文件63项通过。独立非mock H5构建 `dist/build/figma-20261008-scene-real-h5`、微信构建 `dist/build/figma-20261008-scene-real-mp-weixin` 均退出0。全仓check/typecheck/test和最终统筹构建由统筹另行运行。

复跑服务（不修改.env）：

```powershell
$env:UNI_OUTPUT_DIR='dist/dev/figma-20261008-scene-real-h5'
$env:VITE_API_BASE_URL='http://127.0.0.1:8091'
$env:VITE_USE_MOCK_API='false'
$env:VITE_LOCAL_DEV_MODE='true'
pnpm dev:h5 --port 5396 --host 127.0.0.1
```

另一个终端执行：

```powershell
node 'C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/browser-real.cjs'
node 'C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/inline-audio-probe.cjs'
node 'C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/whole-play-visual.cjs'
node 'C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/inline-geometry.cjs'
node 'C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/audio-real.cjs'
node 'C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/http-workflow.cjs'
node 'C:/Users/Administrator/.codex/visualizations/2026/10/08/01a11941-3cf8-7e53-8a90-5b31ab1f833b/continuation/browser-long-fixture.cjs'
pnpm exec vitest run src/pages/scene src/features/scene src/features/audio src/features/recording src/features/vocabulary-sheet src/features/learning-progress src/features/learning-result
$env:VITE_USE_MOCK_API='false'
$env:UNI_OUTPUT_DIR='dist/build/figma-20261008-scene-real-h5'
pnpm build:h5
$env:UNI_OUTPUT_DIR='dist/build/figma-20261008-scene-real-mp-weixin'
pnpm build:mp-weixin
```

长内容fixture脚本使用仍在运行的本组5392服务，与5396真实HTTP脚本分开；所有脚本使用独立Chrome context。日志为 `browser-real.log`、`long-fixture.log`、`target-tests.log`、`build-h5.log`、`build-mp-weixin.log`。

## 共享问题与剩余验收

此次本组未新增未关闭公共缺陷。统筹修复本地API新建/默认收藏缺失sources/版本/snapshot，本组等8091重启后复验保存→读取→返回原文已通过；本组没有改API文件。前轮公共底栏留白在当前长内容验证仍通过。

本组当前设计证据缺口已关闭。真实微信/安卓/iPhone麦克风权限、后台行为、正式发音和耳机试听、真实OSS签名过期/重签、生产数据/授权仍待对应环境验收。开发服务Range、静音音频与模拟录音不会被算作这些项目通过。
