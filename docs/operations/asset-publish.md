# OSS资源自动发布

## 触发入口

| 命令                                                | 资源处理                                                   | 微信包处理                             |
| --------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------- |
| `pnpm release:mp-weixin:test`                       | 构建及校验成功后同步测试桶juya-test，并验证测试公网地址    | 资源同步成功后自动上传微信开发版本     |
| `pnpm build:mp-weixin:test`                         | 构建及校验成功后同步测试桶juya-test，并验证测试公网地址    | 只生成包，不自动上传微信               |
| `pnpm release:mp-weixin`                            | 构建及源码校验通过后同步生产桶juya、生产静态镜像及公网地址 | 成功后才上传微信，并沿用原版本记录流程 |
| `pnpm build:mp-weixin` / `pnpm build:h5`            | 不上传OSS                                                  | 只构建                                 |
| `pnpm release:mp-weixin --build-only` / `--dry-run` | 不上传OSS                                                  | 不上传微信、不推进成功版本             |
| 开发热更新 / `pnpm test`                            | 不上传OSS                                                  | 无线上发布                             |

release恢复模式不重复同步资源或上传微信。资源同步在微信上传日志建立之前进行，失败不会消耗版本；已有部分对象可在修复后再次核对，不会覆盖或删除旧资源。

## 新增图片

1. 将实际用于页面的图片放进 `resources/oss/<业务目录>/`，使用固定逻辑名，例如 `images/name@3x.png`；代码通过 `assetUrl('images/name@3x.png')` 取得地址，不手写远程哈希URL
2. 换图时直接替换这个文件，文件名和代码引用保持不变。构建自动计算内容SHA256前12位，生成 `images/name-<hash>@3x.png` 的版本映射；分享封面的文件名、字节数和尺寸也从同一映射取得
3. 执行对应发布命令。测试固定发布至测试桶及测试OSS域名，生产固定发布至生产桶并通过现有生产静态域名读取，不从Git分支或VITE变量猜目标桶

例如原来已有 `images/name.png`，新增两张图并替换它后，只创建3个新的远程版本对象，未变图片不重复上传。旧对象保留，旧包继续读取旧地址；新包使用新图。已经安装的旧包不会因为本地换图立即改变，采用新包后生效。

上传器和编译器共用资源扫描模块，构建输出仅包含公开映射，不含图片二进制、凭据和本机路径；原图不进入微信包。测试构建记录独立的 `dist/asset-build/<构建ID>.json`，正式release记录 `dist/release/asset-manifest.json`。编译结束及资源发布前核对完整来源哈希和映射；中途换图会阻断，必须重新打包，避免“包引用旧图、上传了新图”。H5构建及本地 `/design-assets/` 预览使用相同版本映射；开发时修改资源自动重启预览，不上传OSS。

历史哈希文件继续兼容，无需批量改名。首页及两张分享图新增固定名副本作为后续换图入口，初始内容相同，远程对象自动合并复用；旧文件保留供历史包和记录核对。新增图仍需在页面接入 `assetUrl`，上传本身不会自动把图片插入页面。

说明文档和JSON不上传。`publish-archive.json`记录7份历史非哈希原图，它们继续固定归档，不自动覆盖线上同名对象；修改这些归档原图会报错，应另外创建固定逻辑名并接入页面。禁止符号链接，单资源上限16MiB，生产镜像单批JSON上限32MiB。导航、操作图标、关键品牌标识和失败兜底仍保留本地。

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

Node依赖锁定ali-oss6.23.0、ssh2 1.17.0、image-size2.0.4（仅构建时读取图片尺寸），关闭可选本地加速模块安装脚本，使用其JavaScript/Node内置加密实现；生产服务器需现有Python3与Nginx命令。首轮验证见[自动发布验收](../verification/asset-publish-20261104.md)。

固定逻辑名与同名换图的本轮验证见[版本映射验收](../verification/asset-version-mapping-20261104.md)。

测试一键上传使用 `pnpm release:mp-weixin:test`，生产使用 `pnpm release:mp-weixin`，两者均只上传微信开发版本，体验版由用户手动切换，不提交审核、不正式发布。测试版自动以北京时间生成 `1.5.0-test.YYYYMMDD.HHmmss` 形式的版本，不推进生产版本记录或提交Git。输出及回执位于独立的 `dist/test-release/<任务ID>/`，不会覆盖本地开发或生产发布目录。需要微信开发者工具已登录并开启服务端口。
