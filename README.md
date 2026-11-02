# Trăm Năm — trợ lý cưới hỏi truyền thống

Ứng dụng web (ưu tiên giao diện điện thoại) giúp cô dâu chú rể **và bố mẹ hai bên** chuẩn bị đám cưới theo phong tục Việt Nam. Bản V1 gồm ba module lõi của PRD:

| Module | Đã có |
| --- | --- |
| **Kế hoạch lễ truyền thống** | Lộ trình 4 lễ (dạm ngõ, ăn hỏi, lễ cưới, lại mặt) theo quê hai bên; chỉ ra chỗ phong tục hai vùng khác nhau để gia đình chốt; ngày âm lịch và lưu ý tham khảo (tháng 7 âm, Kim Lâu); checklist việc có hạn, giao việc; ngân sách chia theo bên chi; bài phát biểu mẫu (AI chỉnh lời nếu bật). |
| **Khách mời và thiệp Zalo** | Gợi nhớ khách theo nhóm (họ nội, hàng xóm, bạn cấp 1…); bố mẹ tự nhập danh sách của mình; chọn từ danh bạ ngay trên máy (Contact Picker, Chrome Android); cảnh báo trùng số giữa các danh sách; chế độ gọi mời rồi gửi thiệp từ Zalo cá nhân; trang thiệp riêng từng khách; thêm vào lịch điện thoại; ước lượng số mâm theo khoảng. |
| **Sổ mừng cưới số** | Quỹ riêng cho cặp đôi, nhà trai, nhà gái (bố mẹ quyết cho cặp đôi xem hay không); QR VietQR có mã khách trên trang thiệp; nhập phong bì bằng giọng nói ("chú Hùng hàng xóm năm trăm"); nhập sao kê .xlsx/.csv và tự khớp theo mã khách rồi họ tên; hàng chờ "Ai đây?"; lịch sử sửa; lời cảm ơn gửi qua Zalo; sổ đi cá nhân để tra khi đáp lễ. |

Người dùng đăng nhập bằng số điện thoại + mã OTP. Phân quyền: cặp đôi xem mọi danh sách; bố mẹ chỉ xem danh sách và quỹ của bên mình; người hỗ trợ chỉ thấy kế hoạch lễ và việc được giao.

## Công nghệ

- Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4
- Drizzle ORM + libSQL: SQLite cục bộ khi phát triển, Turso khi deploy
- Kiểm thử: Vitest cho phần lõi (đọc số tiền nói, âm lịch, VietQR, đối soát, đọc sao kê)

## Chạy trên máy

```bash
npm install
cp .env.example .env.local     # để trống cũng chạy được ở chế độ phát triển
npm run db:migrate             # tạo ./data/tram-nam.db
npm run dev                    # http://localhost:3000
```

Ở chế độ phát triển, mã OTP hiện ngay trên màn hình đăng nhập (và in ra terminal).

Các lệnh khác: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Đổi schema trong `src/lib/db/schema.ts` thì chạy `npm run db:generate` rồi `npm run db:migrate`.

## Deploy

**Vercel + Turso** (gợi ý): tạo database Turso, đặt `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `SESSION_SECRET`, `APP_URL`, `OTP_WEBHOOK_URL` trên Vercel, chạy `npm run db:migrate` với các biến đó trước lần deploy đầu. SQLite file cục bộ không dùng được trên Vercel vì ổ đĩa không bền.

**Máy chủ riêng (VPS)**: `npm ci && npm run db:migrate && npm run build && npm start`, đặt sau Nginx có HTTPS. File `./data/tram-nam.db` cần được sao lưu.

## Chưa làm / cần quyết trước khi ra mắt

- **Gửi OTP thật**: ứng dụng chỉ gọi webhook `OTP_WEBHOOK_URL`; cần nối dịch vụ SMS hoặc ZNS (mẫu OTP).
- **Nhắc lịch qua Zalo OA**: đã lưu khách nào bấm "Nhắc tôi"; hiện nhắc bằng file lịch (.ics). Gửi tin qua OA cần OA đã xác thực và mẫu tin được Zalo duyệt.
- **Tài khoản định danh ngân hàng** (đối soát thời gian thực): V1 đối soát bằng file sao kê.
- **Nội dung phong tục** trong `src/lib/rituals.ts` là bản mẫu, luôn hiện nhãn "đang chờ duyệt". Cần chuyên gia phong tục biên soạn và duyệt, sau đó đổi `RITUAL_CONTENT_STATUS` thành `"approved"`.
- **Pháp lý dữ liệu**: rà cơ sở xử lý dữ liệu khách mời theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP; xác định thời hạn xoá dữ liệu.
- Marketplace đối tác (ảnh cưới, nhẫn), Sẵn sàng về chung một nhà, Cầu hôn: thuộc các module sau.

## Cấu trúc

```
src/app/            các trang (tiếng Việt không dấu: /cuoi, /khach, /mung, /so-di, /t/[token] là thiệp công khai)
src/app/actions/    server actions, luôn kiểm tra quyền trước khi ghi
src/lib/            nghiệp vụ: phân quyền, âm lịch, VietQR, đọc số tiền, đối soát, nội dung nghi lễ
src/lib/db/         schema Drizzle; migration ở ./drizzle
tests/              kiểm thử Vitest
```
