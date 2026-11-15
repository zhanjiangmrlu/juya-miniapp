# 友盟手动开关恢复验证（2026-11-15）

## 范围

用户授权在两仓现有test分支修改验证，并明确选择恢复标准基础统计＋五类业务事件。无推送、远程部署、微信/OSS上传或生产变更；原业务库及本地预览进程保持。

## 行为

- 小程序仅显式配置的微信test构建载入隔离SDK，其他模式含production继续关闭。
- 测试API必须显式配置客户端通道且发布umeng-20261115-v3的privacy/analytics材料；旧材料/许可不生效。必要terms版本沿用。用户重新明确允许后才开始。
- 当前页面在手动开启时即开始页面计时；五类业务事件仍经后端校验。未允许时不初始化，不补报。
- 撤回即取消请求/定时器、丢弃队列并删除随机标识，离线保持关闭。账号切换、过期、披露失效及初始化/授权迟到均受代际门禁。
- 唯一落盘SDK字段为同一账号/许可的随机UUID，避免冷启动重复新增；队列不落盘。独立审查发现冷启动失效许可的旧UUID残留，新增三类RED→GREEN回归后修复；仅清本统计命名空间，不触及业务存储。复核无新重要问题。

## 已执行验证

- test启用配置、手动许可后当前页和跨启动UUID回归先失败，再实现通过。
- 真实锁定SDK的缺前置条件、五类事件、撤回迟到/初始化、离线队列/账号隔离、UUID及冷启动失效回归通过。
- 微信test启用/production开启旧变量/production关闭三种隔离构建通过。实际编译bootstrap、service和SDK模块在VM中执行，原生网络捕获验证：未允许无请求；手动允许后实际页面及内容payload存在；关闭后前台恢复及60秒计时无新请求，UUID清空。仅替换Vue/微信端口，不替换被测业务模块。
- API完整SQLite回归796通过/60条件跳过；其中Node路径缺失的Swagger检查随后补跑5通过。跳过主要为真实MySQL/Redis条件，不能冒充完整真实MySQL结果。
- 目标隔离MySQL已校验数据库juya_verify、专用datadir/端口/UUID和数据库限定权限，privacy20项通过；不连接原业务库。
- API ruff检查/格式（366文件）与mypy（96源码）通过。接口仅描述更新，mini契约与生成类型已同步。

小程序最终完整测试142文件/861项通过；pnpm check的Prettier、ESLint、Stylelint及TypeScript全部通过。实际私有测试配置构建生成于dist/analytics-test/mp-weixin，20页/三Tab及共享音频检查通过，主包source543353B、预留20%转换后652024B，保留平台余量。内存核对仅含正确测试AppKey、测试API和SDK/友盟上报域名，无生产API地址；两仓改动文件不含真实测试AppKey。生产变量开启/关闭两种隔离构建均无SDK、AppKey或上报域名。

独立审查复核P2修正并定向18项通过，无新重要问题。构建只调用uni build及本地校验，不执行OSS同步/微信上传；原dist/dev热更新未替换。

## 运行说明和边界

测试API设置JUYA_ANALYTICS_CLIENT_TRANSPORT_ENABLED=true、JUYA_PRIVACY_DOCUMENTS_PATH指向本轮bundle；小程序私有测试Key与账号资料在内存核对一致。微信request合法域名需包含https://umini.shujupie.com。

没有操作微信后台域名/隐私配置，也没有真实设备和友盟控制台接收证明。模拟端口捕获及API accepted不代表友盟入库。远程测试API和已上传包仍是原版本，须后续部署测试API及上传新包后人工验收，不宣称当前远程已恢复收数。生产需另行授权启用及发布。

完整日志仅本机/tmp/juya-umeng-*.log，无真实密钥。
