# 正文发音优化微信测试包（2026-11-02）

- 固定源码：`3d127526ee825806928add94b06afde8950d78c7`，已推送远程test
- 微信官方CLI上传：`1.5.0-r17.06.1102.3`成功；体验版由用户手动选择，本次未切换
- 明确绑定测试API、既有AppID及测试静态资源/字体配置，排除本地登录及私有项目配置
- 官方统计总包1353655B、主包1059596B；页面、共享音频入口和包体检查通过
- Node22.23.3下95文件445测试、check、H5和微信构建通过
- 测试双角色API及全部Worker/dispatcher已同步更新，生产环境未改；后台、后端固定版本及核验见[完整发布记录](https://github.com/zhanjiangmrlu/juya-api/blob/test/docs/verification/word-audio-test-release-20261102.md)

预加载与音频互斥行为已有自动化覆盖；iPhone/Android实际出声及500ms目标尚待用户切换体验版后验证，不能以包上传成功推断。
