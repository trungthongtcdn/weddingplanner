# Chạy Trăm Năm trên VPS của shopee-dropship

Trăm Năm chạy thành **một container riêng** cạnh các container của shopee-dropship. Không dùng chung cơ sở dữ liệu: Trăm Năm lưu SQLite trong volume `weddingplanner_wedding_data`. Caddy của dropship (đang giữ cổng 80/443) nhận thêm domain của Trăm Năm và chuyển vào container `weddingplanner` qua mạng Docker `shopee-dropship_default`.

```
Internet ──443──▶ caddy (dropship) ──▶ app:3000            (shopee-dropship)
                                  └──▶ weddingplanner:3000 (Trăm Năm)
```

## Lần đầu

Chạy bằng root trên VPS.

```bash
# 0. Kiểm tra chỗ trống: build Next.js cần khoảng 1,5 GB RAM (tính cả swap)
free -h && df -h / && docker network ls | grep dropship

# Nếu RAM + swap dưới ~2 GB, thêm 2 GB swap (không ảnh hưởng container đang chạy)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 1. Lấy mã nguồn vào /root/weddingplanner (repo private: dùng deploy key, hoặc đẩy bằng tar từ máy có quyền)
#    Từ máy Mac:  git -C <thư-mục-weddingplanner> archive --format=tar main | ssh root@<vps> "mkdir -p /root/weddingplanner && tar -x -C /root/weddingplanner"

# 2. Bí mật
cd /root/weddingplanner
cat > .env.prod <<EOF2
SESSION_SECRET=$(openssl rand -hex 32)
APP_URL=https://<domain-tram-nam>
# Chưa nối dịch vụ SMS: hiện OTP trên màn hình, chỉ người có mã thử nghiệm mới đăng nhập được
OTP_DEV_SHOW=1
PILOT_ACCESS_CODE=$(openssl rand -hex 3 | tr a-f A-F)
EOF2
chmod 600 .env.prod && cat .env.prod

# 3. Build và chạy
docker compose -p weddingplanner -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4. Thêm domain vào Caddy của dropship (sao lưu trước; dùng >> để giữ nguyên file đang được mount)
cd /root/shopee-dropship
cp Caddyfile Caddyfile.bak-$(date +%F-%H%M)
printf '\n<domain-tram-nam> {\n\treverse_proxy weddingplanner:3000\n}\n' >> Caddyfile
docker compose -f docker-compose.prod.yml exec caddy caddy reload --config /etc/caddy/Caddyfile

# 5. Kiểm tra
curl -sI https://<domain-tram-nam> | head -1
curl -sI https://$(grep ^DOMAIN= .env.prod | cut -d= -f2) | head -1   # dropship vẫn chạy
```

Chưa có domain riêng thì dùng tạm `<ip-nối-bằng-gạch>.sslip.io` (ví dụ `203-0-113-5.sslip.io`): tên này tự trỏ về IP của VPS, Caddy vẫn lấy được chứng chỉ HTTPS.

## Cập nhật phiên bản

```bash
cd /root/weddingplanner
# lấy mã mới (git pull nếu dùng deploy key, hoặc đẩy lại bằng tar như bước 1)
docker compose -p weddingplanner -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Migration chạy tự động mỗi lần container khởi động.

## Sao lưu dữ liệu

```bash
docker run --rm -v weddingplanner_wedding_data:/d -v /root:/b alpine tar czf /b/tram-nam-$(date +%F).tgz -C /d .
```

## Gỡ bỏ

Xoá khối domain của Trăm Năm khỏi `/root/shopee-dropship/Caddyfile` (sửa bằng trình soạn thảo giữ nguyên file, ví dụ `nano`), reload Caddy, rồi `docker compose -p weddingplanner -f docker-compose.prod.yml down`.
