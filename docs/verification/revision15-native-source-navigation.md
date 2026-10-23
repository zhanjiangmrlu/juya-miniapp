# 2026-10-23 微信卡片入口运行错误修复

用户在本地微信开发者工具点击学习卡片，出现`_state.sent(...).openSourceScene is not a function`，不能进入详情。

## 根因与改动

源码`navigation.ts`在来源入口用动态`import('@/services/source-queue')`。当前uni微信编译器输出为`await "./source-queue.js"`，得到路径字符串后继续调用`.openSourceScene`，原生运行时失败；Vitest源码转换和H5支持动态import，因此旧检查与构建成功没有发现这个平台差异。

改为静态导入`openSourceScene`，微信产物使用真实CommonJS require。保留原队列的本人归属、持久幂等／未知回执恢复、原生跳转失败回滚和错误提示，不改来源顺序或学习成绩。依赖链经检查没有回到navigation形成循环；API模块初始化只读平台存储，不发网络请求。

## 回归与验证

- 新`tests/contracts/mp-source-navigation.spec.ts`用真实uni编译器构建到临时独立目录，执行生成的navigation、source-queue、learning-queue与operation模块；只替换微信原生／Vue宿主和业务网络边界，不把队列入口替换成假函数
- 学习、收藏、学习记录、某日打卡四种来源均先失败：没有产生原生详情跳转；修后均通过，并核对真实队列POST参数、日期、稳定操作键、详情URL及无错误toast
- 3个原导航／登录／退出测试在模块加载前补齐原生存储宿主，解决静态依赖合法初始化时测试环境没有uni的问题；没有修改业务断言
- 完整60文件／265项通过；完整`pnpm check`通过；H5及微信构建通过；12页面／两底栏验证通过
- 当前持续编译目录仍为`dist/dev/mp-weixin`，local-share模式使用原开发API与本地后端。开发者工具重新打开同一项目后，实际点击现有卡片图片成功进入详情，正文、完整音频、译文、8个重点词汇及完成按钮均正常显示，无原错误提示
- 没有点击完成学习、修改成绩、上传或发布版本；打开详情依既有规则写入真实阅读开始状态，列表显示学习中

截图保存在工作区私有`.private/miniapp-hot-reload/source-navigation-fixed.png`。此开发者工具证据不等同iOS／Android真机全面验收。
