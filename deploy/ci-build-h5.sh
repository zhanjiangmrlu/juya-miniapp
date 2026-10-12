#!/bin/sh
set -eu

# 云效源固定为 test 分支；H5 使用同源小程序 API，避免嵌入本机或后台地址
export VITE_API_BASE_URL=https://test-h5.juyayingyu.com
export VITE_USE_MOCK_API=false
export VITE_LOCAL_DEV_MODE=false
export VITE_ANALYTICS_ENABLED=false
export UNI_OUTPUT_DIR=dist/build/h5

npm install -g pnpm@11.22.0 --registry=https://registry.npmmirror.com
pnpm install --frozen-lockfile --prod=false --registry=https://registry.npmmirror.com
pnpm check
pnpm test
pnpm build:h5
test -s dist/build/h5/index.html
test -d dist/build/h5/assets
