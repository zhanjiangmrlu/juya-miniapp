# OSS资源自动发布

## 触发入口

| 命令                                                | 资源处理                                                   | 微信包处理                             |
| --------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| `pnpm build:mp-weixin:test`                         | 构建及校验成功后同步测试桶juya-test，并验证测试公网地址    | 只生成包，不自动上传微信               |
| `pnpm release:mp-weixin`                            | 构建及源码校验通过后同步生产桶juya、生产静态镜像及公网地址 | 成功后才上传微信，并沿用原版本记录流程 |
| `pnpm build:mp-weixin` / `pnpm build:h5`            | 不上传OSS                                                  | 只构建                                 |
| `pnpm release:mp-weixin --build-only` / `--dry-run` | 不上传OSS                                                  | 不上传微信、不推进成功版本             |
| 开发热更新 / `pnpm test`                            | 不上传OSS                                                  | 无线上发布                             |

release恢复模式不重复同步资源或上传微信。资源同步在微信上传日志建立之前进行，失败不会消耗版本；已有部分对象可在修复后再次核对，不会覆盖或删除旧资源。

## 新增图片

1. 将实际用于页面的图片放进 `resources/oss/<业务目录>/`，文件名采用 `用途-<SHA256前12位>@3x.jpg` 等内容版本形式；SVG和字体可不带@3x。文件或内容变化时生成新哈希文件名，并更新页面引用
2. 页面继续使用统一环境静态根地址；上传脚本自动发现哈希资源，无需逐个登记上传任务。页面引用、本地H5精确白名单仍需随功能开发同步，上传本身不会把图片插入页面
3. 执行对应发布命令。测试固定发布至测试桶及测试OSS域名，生产固定发布至生产桶并通过现有生产静态域名读取，不从Git分支或VITE变量猜目标桶

说明文档和JSON不上传。`publish-archive.json`记录7份历史非哈希原图，它们继续归档，不与现有线上同名资源自动互相覆盖；修改这些原图会明确报错，应先创建新的哈希版本及引用。禁止符号链接，单资源上限16MiB，生产镜像单批JSON上限32MiB。

## 私有配置

本机已从指定账号资料建立 `.private/asset-publish.local.json`，权限0600，整个.private目录被Git忽略。其他电脑或CI可配置同样的私有文件，或通过 `JUYA_ASSET_PUBLISH_CONFIG` 指定文件位置；不要使用VITE前缀传递密钥。私有文件不复制到前端src或微信包。

结构如下，所有值均为占位说明：

```json
{
  "test": {
    "accessKeyId": "填写测试凭据",
    "accessKeySecret": "填写测试凭据"
  },
  "production": {
    "accessKeyId": "填写生产凭据",
    "accessKeySecret": "填写生产凭据",
    "mirror": {
      "host": "现有生产静态服务主机",
      "username": "现有SSH用户",
      "password": "既有SSH密码；与privateKeyFile二选一",
      "privateKeyFile": "可选私钥文件路径",
      "hostKeys": ["由既有可信known_hosts公钥计算的SHA256十六进制指纹"]
    }
  }
}
```

生产镜像固定发布到当前静态目录，仅按已校验的内容哈希文件生成精确只读Nginx路径及一年immutable缓存；不允许从配置指定任意命令或服务器目录。SSH必须匹配已信任指纹。配置有备份、文件原子替换、nginx检查及失败恢复，仅在新增路径时平滑重载，不重启API或数据库。旧资源不会自动清理。

## 检查与故障恢复

- 离线预览：`node scripts/asset-publish.mjs test --dry-run` 或 `production --dry-run`，只列出文件和目标桶，不读取凭据、不联网、不写资源
- 成功回执：`dist/asset-publish/test.json` 或 `production.json`，只有资源路径、哈希、状态等非敏感信息
- 未变资源通过鉴权读取比对后跳过；缺失资源用禁止覆盖PUT创建，随后读取确认；同名内容冲突、权限错误、公网SHA/MIME/长期缓存不正确均终止发布，不会擅自修改桶ACL或策略
- 生产静态服务配置备份保存在静态根目录同级的 `asset-publish-backups/`；正常失败会恢复配置，异常中断可据此核对。不要为解决发布失败覆盖同名对象、扩大桶权限或删除旧资源
- 微信上传结果不明确仍按wechat-release操作说明核对，禁止盲目重传；资源成功不等于微信上传成功

Node依赖锁定ali-oss6.23.0、ssh2 1.17.0，关闭可选本地加速模块安装脚本，使用其JavaScript/Node内置加密实现；生产服务器需现有Python3与Nginx命令。首轮验证见[自动发布验收](../verification/asset-publish-20261104.md)。
