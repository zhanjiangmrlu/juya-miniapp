#!/bin/sh
set -eu
umask 022

package=/home/admin/app/juya-miniapp-h5-package.tgz
base=/opt/juya
web="$base/juya-miniapp-h5"
version="${BUILD_NUMBER:-manual}-$(date +%Y%m%d%H%M%S)-$$"
mkdir -p "$base/juya-miniapp-h5-releases" "$base/juya-miniapp-h5-backups"
exec 9> "$base/.juya-miniapp-h5-deploy.lock"
flock -n 9
release=$(mktemp -d "$base/juya-miniapp-h5-releases/$version.XXXXXX")
chmod 755 "$release"
previous=
changed=0

# 发布失败时恢复之前的 H5 网站路径，旧版本文件保留供回滚
finish() {
  code=$?
  trap - EXIT
  if [ "$code" -ne 0 ] && [ "$changed" -eq 1 ]; then
    if [ -n "$previous" ]; then
      ln -s "$previous" "$web.rollback.$$"
      mv -Tf "$web.rollback.$$" "$web"
    else
      unlink "$web"
    fi
    printf 'DEPLOY_FAILED_ROLLED_BACK\n' >&2
  fi
  exit "$code"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# 检查 H5 制品与 Nginx 配置，不能把微信代码包当作静态网站部署
test -s "$package"
tar --no-same-owner --no-same-permissions -xzf "$package" -C "$release"
site="$release/dist/build/h5"
test -s "$site/index.html"
test -d "$site/assets"
chmod -R u=rwX,go=rX "$site"
asset=$(sed -n 's/.*src="\([^"]*\.js\)".*/\1/p' "$site/index.html" | head -n 1)
case "$asset" in /assets/*.js) ;; *) printf 'Invalid H5 entry JS path\n' >&2; exit 1 ;; esac
test -s "$site$asset"
nginx -t

# 首次发布保留旧目录，后续发布通过符号链接切换 H5 版本
if [ -L "$web" ]; then
  previous=$(readlink -f "$web")
  test -d "$previous"
elif [ -e "$web" ]; then
  test -d "$web"
  previous="$base/juya-miniapp-h5-backups/$version"
  mv "$web" "$previous"
  changed=1
fi
ln -s "$site" "$web.next.$$"
mv -Tf "$web.next.$$" "$web"
changed=1

# 用测试域名核对 HTTPS 首页和实际入口 JS，TLS 或内容校验失败会回滚
test_domain=test-h5.juyayingyu.com
curl --fail --silent --show-error --max-time 10 \
  --noproxy '*' --resolve "${test_domain}:443:127.0.0.1" \
  "https://${test_domain}/" > "$release/http-index.html"
cmp -s "$site/index.html" "$release/http-index.html"
curl --fail --silent --show-error --max-time 10 \
  --noproxy '*' --resolve "${test_domain}:443:127.0.0.1" \
  "https://${test_domain}${asset}" > "$release/http-entry.js"
cmp -s "$site$asset" "$release/http-entry.js"
printf 'DEPLOY_OK service=juya-miniapp-h5 version=%s\n' "$version"
printf 'Verified: H5 index and entry JS; API acceptance is separate\n'
