# 整合08页面布局与文案实施计划

用户已批准聊天方案并要求直接实施。

Goal: 在整合08 3a6355f 基线上调整首页、列表、详情，保留现有业务链路。
Architecture: Vue3 uni-app模板与scoped SCSS局部调整，复用登录恢复、权限、笔记和音频。
Spec: /Users/lubi/Desktop/juya/句芽英语-整合08增量修改需求-页面布局与文案-20261108.docx

## 约束

文案和状态遵循需求，视觉遵循Figma yVnE9TCSoRS5sv4vAuxsBX。说明12px/390，触控至少44px。无接口、数据或后台变动。固定三Tab，游客登录入口在滚动区。

## 任务

- [x] 首页：更新index.spec.ts中的精确三段文案与原入口断言，guest-home.spec.ts验证登录入口处于滚动区；先运行失败，再改src/pages/home/index.vue
- [x] 列表：learning-list.spec.ts覆盖新标语与游客单行入口；先运行失败，再改src/pages/learning/index.vue，沿用两个Tab与loginReturn
- [x] 详情：detail.spec.ts覆盖整行标题、独立工具行、授权优先、无笔记隐藏、正文前受限提示；先运行失败，再改src/sub-packages/scenes/detail.vue
- [x] 验证：pnpm test --maxWorkers=2及pnpm check；H5与本地微信隔离构建；浏览器截图核验390/375/414与游客/已登录/有无PDF。复用现有PDF及登录回退回归，不声称浏览器代替真机
- [x] 新鲜上下文审查、处理实质问题、记录UI01—UI12证据

## Review Focus

长标题换行、免费卡上的有效授权、草稿PDF不开放、登录取消保留双Tab、原生PDF返回保持暂停与倍率。

## 执行记录

基线干净；已存在原生隔离工作树，直接使用；本轮不发布。

执行决定：新增展示使主包预算失败，原样迁移仅场景使用的分词/高亮与发音准备模块到场景分包；保持原450KiB约束，无业务算法变化。真实微信原生交互保持待真机复验，不以浏览器模拟替代。
