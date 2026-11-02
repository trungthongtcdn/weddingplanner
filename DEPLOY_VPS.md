# Chạy Trăm Năm trên VPS của shopee-dropship

Trăm Năm chạy thành **một container riêng** cạnh các container của shopee-dropship. Không dùng chung cơ sở dữ liệu: Trăm Năm lưu SQLite trong volume `weddingplanner_wedding_data`. Caddy của dropship (đang giữ cổng 80/443) nhận thêm domain của Trăm Năm và chuyển vào container `weddingplanner` qua mạng Docker `shopee-dropship_default`.

```
Internet ──443──▶ caddy (dropship) ──▶ app:3000            (shopee-dropship)
                                  └──▶ weddingplanner:3000 (Trăm Năm)
```

## Cài hoặc cập nhật bằng một lệnh

Chạy trên máy Mac (đã đăng nhập GitHub và SSH được vào VPS bằng key). Thay `<IP-VPS>`:

```bash
VPS=root@<IP-VPS>; rm -rf /tmp/weddingplanner && git clone -q https://github.com/trungthongtcdn/weddingplanner /tmp/weddingplanner && git -C /tmp/weddingplanner archive --format=tar main | ssh "$VPS" 'mkdir -p /root/weddingplanner && tar -x -C /root/weddingplanner && bash /root/weddingplanner/scripts/deploy-vps.sh'
```

`scripts/deploy-vps.sh` làm lần lượt:

1. Kiểm tra Docker, thư mục `/root/shopee-dropship`, container caddy và tên mạng Docker của dropship.
2. Nếu RAM + swap dưới 2,5 GB thì thêm 2 GB swap, để bước build không làm hết RAM của dropship.
3. Lần đầu tạo `.env.prod`: domain tạm `<ip-nối-bằng-gạch>.sslip.io` (tự trỏ về IP VPS, có HTTPS), `SESSION_SECRET`, và mã thử nghiệm `PILOT_ACCESS_CODE`. Muốn dùng domain riêng thì chạy với `WEDDING_DOMAIN=cuoi.example.com` ở lần đầu, hoặc sửa `.env.prod` rồi chạy lại.
4. Build image và chạy container `weddingplanner` (giới hạn 512 MB RAM), migration tự chạy khi khởi động.
5. Sao lưu `Caddyfile` của dropship rồi thêm một khối domain, reload Caddy. Nếu Caddy từ chối cấu hình mới, script trả file về như cũ.
6. Gọi thử cả Trăm Năm lẫn dropship, in địa chỉ và mã thử nghiệm.

## Cập nhật phiên bản

```bash
# chạy lại đúng lệnh một dòng ở trên — .env.prod và dữ liệu được giữ nguyên
```

Migration chạy tự động mỗi lần container khởi động.

## Sao lưu dữ liệu

```bash
docker run --rm -v weddingplanner_wedding_data:/d -v /root:/b alpine tar czf /b/tram-nam-$(date +%F).tgz -C /d .
```

## Gỡ bỏ

Xoá khối domain của Trăm Năm khỏi `/root/shopee-dropship/Caddyfile` (sửa bằng trình soạn thảo giữ nguyên file, ví dụ `nano`), reload Caddy, rồi `docker compose -p weddingplanner -f docker-compose.prod.yml down`.
