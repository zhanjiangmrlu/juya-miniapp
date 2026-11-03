# 背景压缩与静态服务

交付 PNG 保留原字节和 853×1844 尺寸。应用优先读取清单中的 q82 WebP 插画与 q82 JPEG 纸纹；失败后仅重试一次原 PNG，仍失败则保留底色和正文。没有缩放或重新裁切。

使用已有 Pillow 环境生成，不增加项目依赖：

```sh
../juya-api/.venv/bin/python scripts/compress-page-backgrounds.py
../juya-api/.venv/bin/python scripts/compress-page-backgrounds.py --check
```

清单记录 Pillow/libwebp/libjpeg 版本、完整 SHA、尺寸和字节预算。使用相同编码器版本可逐字节复现；升级编码器后若哈希变化，需同步 `src/shared/constants/ui.ts` 的变体文件名。脚本不改写原 PNG，也不自动删除旧变体。

本地 H5 开发与构建已将新变体加入精确白名单，分别返回 `image/webp` 和 `image/jpeg`。微信包仅包含 URL，不内嵌这些背景；外部服务应同时保留原图与变体，先发布变体再发布引用它们的客户端。

上线时，在现有静态文件服务根目录/路径配置中为带 12 位内容哈希的背景应用以下响应规则；具体资源根目录沿用环境当前配置：

```nginx
# 放入对应静态服务配置；继承现有 root，不改变资源根目录
location ~ "^/miniapp/static/backgrounds/.+-[a-f0-9]{12}\.(webp|jpg)$" {
    types {
        image/webp webp;
        image/jpeg jpg;
    }
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
}
```

原 PNG 地址继续沿用既有缓存策略，不能加 immutable 后在同一路径覆盖文件。OSS/CDN 需配置等效的 Content-Type 和 Cache-Control 对象元数据。不要将不存在的文件以长期缓存的成功响应或 HTML 返回；上例不为 404 添加 immutable 缓存头。

2026-11-03 已按授权将六个变体上传既有测试 OSS 静态前缀，公网字节与响应头验证见 `docs/verification/test-background-compression-upload-20261103.json`；没有修改 ACL、bucket 策略或生产环境。
