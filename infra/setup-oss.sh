#!/usr/bin/env bash
# 一次性脚本：在阿里云 OSS 创建 Bucket 并启用静态网站托管。
#
# 前置条件：
#   1. brew install ossutil
#   2. ossutil config       # 一次性输入 AccessKey、SecretKey、默认 region
#
# 用法：
#   bash infra/setup-oss.sh
#   # 或自定义参数：
#   BUCKET=my-name REGION=cn-beijing bash infra/setup-oss.sh

set -euo pipefail

BUCKET="${BUCKET:-crush-chat-debugger}"
REGION="${REGION:-cn-hangzhou}"

echo "==> 创建 Bucket: $BUCKET  (region: $REGION, acl: public-read)"
if ossutil ls "oss://$BUCKET" >/dev/null 2>&1; then
  echo "    Bucket 已存在，跳过创建。"
else
  ossutil mb "oss://$BUCKET" --acl public-read -e "oss-$REGION.aliyuncs.com"
fi

echo "==> 启用静态网站托管 (index/404 都指向 index.html)"
WEBSITE_XML=$(mktemp)
trap 'rm -f "$WEBSITE_XML"' EXIT
cat > "$WEBSITE_XML" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<WebsiteConfiguration>
  <IndexDocument><Suffix>index.html</Suffix></IndexDocument>
  <ErrorDocument><Key>index.html</Key></ErrorDocument>
</WebsiteConfiguration>
EOF
ossutil website --method put "oss://$BUCKET" "$WEBSITE_XML"

echo
echo "==> Done."
echo "    静态网站访问地址："
echo "      https://$BUCKET.oss-website-$REGION.aliyuncs.com"
echo
echo "    后续部署用："
echo "      npm run deploy"
