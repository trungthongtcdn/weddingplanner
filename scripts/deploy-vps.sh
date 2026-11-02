#!/usr/bin/env bash
# Cài hoặc cập nhật Trăm Năm trên VPS đang chạy shopee-dropship.
# Chạy bằng root trong thư mục mã nguồn. Chạy lại nhiều lần được: lần sau chỉ build lại và khởi động lại.
set -euo pipefail

APP_DIR="${APP_DIR:-/root/weddingplanner}"
DROPSHIP_DIR="${DROPSHIP_DIR:-/root/shopee-dropship}"
cd "$APP_DIR"

say() { printf '\n\033[1;31m▸ %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
dc_drop() { (cd "$DROPSHIP_DIR" && docker compose -f docker-compose.prod.yml --env-file .env.prod "$@"); }

[ "$(id -u)" = 0 ] || fail "Cần chạy bằng root."
command -v docker >/dev/null || fail "Máy chưa có Docker."
[ -f "$DROPSHIP_DIR/docker-compose.prod.yml" ] || fail "Không thấy shopee-dropship ở $DROPSHIP_DIR (đặt DROPSHIP_DIR=... nếu nằm chỗ khác)."

say "1/6 Kiểm tra máy chủ"
free -h | sed -n '1,3p'
df -h / | tail -1
CADDY_ID="$(dc_drop ps -q caddy)"
[ -n "$CADDY_ID" ] || fail "Container caddy của dropship không chạy."
DROPSHIP_NETWORK="$(docker inspect "$CADDY_ID" --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' | head -1)"
export DROPSHIP_NETWORK
echo "Mạng Docker của dropship: $DROPSHIP_NETWORK"

say "2/6 Bộ nhớ cho bước build"
mem_mb=$(( $(awk '/MemTotal/{print $2}' /proc/meminfo) / 1024 ))
swap_mb=$(( $(awk '/SwapTotal/{print $2}' /proc/meminfo) / 1024 ))
echo "RAM ${mem_mb} MB, swap ${swap_mb} MB"
if [ $((mem_mb + swap_mb)) -lt 2500 ] && [ ! -f /swapfile ]; then
  echo "Dưới 2,5 GB → thêm 2 GB swap tại /swapfile để build không làm hết RAM của dropship"
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  echo "Đủ bộ nhớ."
fi

say "3/6 Cấu hình .env.prod"
if [ ! -f .env.prod ]; then
  IP="$(curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"
  DOMAIN_WP="${WEDDING_DOMAIN:-$(echo "$IP" | tr . -).sslip.io}"
  (
    umask 077
    cat > .env.prod <<EOF
WEDDING_DOMAIN=$DOMAIN_WP
APP_URL=https://$DOMAIN_WP
SESSION_SECRET=$(openssl rand -hex 32)
# Chưa nối dịch vụ SMS: mã OTP hiện trên màn hình, và chỉ người có mã thử nghiệm mới nhận được mã
OTP_DEV_SHOW=1
PILOT_ACCESS_CODE=$(openssl rand -hex 3 | tr a-f A-F)
EOF
  )
  echo "Đã tạo .env.prod"
else
  echo "Giữ nguyên .env.prod đã có"
fi
set -a
# shellcheck disable=SC1091
. ./.env.prod
set +a

say "4/6 Build và chạy container (lần đầu mất vài phút)"
docker compose -p weddingplanner -f docker-compose.prod.yml --env-file .env.prod up -d --build

say "5/6 Nối domain vào Caddy của dropship"
CF="$DROPSHIP_DIR/Caddyfile"
if grep -q "^$WEDDING_DOMAIN {" "$CF"; then
  echo "Caddyfile đã có $WEDDING_DOMAIN"
else
  BK="$CF.bak-$(date +%F-%H%M%S)"
  cp "$CF" "$BK"
  # Ghi nối (>>) để giữ nguyên file mà container caddy đang mount.
  printf '\n%s {\n\treverse_proxy weddingplanner:3000\n}\n' "$WEDDING_DOMAIN" >> "$CF"
  if dc_drop exec -T caddy caddy reload --config /etc/caddy/Caddyfile; then
    echo "Đã thêm vào Caddy (bản sao lưu: $BK)"
  else
    cat "$BK" > "$CF"
    fail "Caddy không nhận cấu hình mới — đã trả Caddyfile về như cũ, dropship không bị ảnh hưởng."
  fi
fi

say "6/6 Kiểm tra"
code=000
for _ in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "https://$WEDDING_DOMAIN/dang-nhap" || true)
  [ "$code" = 200 ] && break
  sleep 3
done
echo "Trăm Năm  https://$WEDDING_DOMAIN → HTTP $code"
DROP_DOMAIN="$(grep -E '^DOMAIN=' "$DROPSHIP_DIR/.env.prod" | cut -d= -f2- || true)"
if [ -n "$DROP_DOMAIN" ]; then
  echo "Dropship  https://$DROP_DOMAIN → HTTP $(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "https://$DROP_DOMAIN" || true)"
fi
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}' | head -10

cat <<EOF

────────────────────────────────────────
Địa chỉ:        https://$WEDDING_DOMAIN
Mã thử nghiệm:  $PILOT_ACCESS_CODE
────────────────────────────────────────
EOF
