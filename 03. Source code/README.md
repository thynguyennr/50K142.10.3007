# Hệ thống quản lý bán hàng – Cà phê Bích Ngâu

## Tự động nhận tiền chuyển khoản (UC 2.3 – bước 3a.2, NFR-03)

Khi khách chọn **Chuyển khoản**, màn Thanh toán hiện mã VietQR (nội dung CK = mã đơn, ví dụ `HD0010`)
và tự kiểm tra trạng thái đơn mỗi 3 giây. Tiền về tài khoản → **SePay** gọi Edge Function
`supabase/functions/sepay-webhook` → hàm đánh dấu đơn "Đã thanh toán / Chuyển khoản" → màn hình tự chuyển sang
"Thanh toán thành công". Quá 10 phút chưa có tiền → "Chưa thanh toán thành công" + nút "Thử lại".

### Cài đặt (làm 1 lần)

1. **Đăng ký SePay** tại sepay.vn → *Ngân hàng* → liên kết tài khoản MB Bank của quán
   (đúng số TK trong `src/lib/nganHang.js`).
2. Trong SePay → *Cấu hình công ty* → *Cấu trúc mã thanh toán*: tiền tố **`HD`**, phần số dài **4** ký tự
   (để SePay nhận ra mã đơn trong nội dung chuyển khoản).
3. **Triển khai Edge Function** (cần đăng nhập Supabase CLI, `<project-ref>` là phần đầu của `VITE_SUPABASE_URL`):
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase secrets set SEPAY_API_KEY=<tự đặt một chuỗi bí mật dài>
   npx supabase functions deploy sepay-webhook --no-verify-jwt
   ```
4. Trong SePay → *Tích hợp WebHooks* → *Thêm*:
   - URL: `https://<project-ref>.supabase.co/functions/v1/sepay-webhook`
   - Sự kiện: **Có tiền vào**
   - Kiểu chứng thực: **API Key**, giá trị = đúng chuỗi `SEPAY_API_KEY` ở bước 3.
5. Thử: tạo đơn → Thanh toán → Chuyển khoản → quét QR chuyển thử. Màn hình phải tự chuyển sang "Thanh toán thành công".

### Chạy thử khi chưa có SePay

Khi chạy `npm run dev`, dưới mã QR có nút **[Chạy thử] Giả lập đã nhận tiền chuyển khoản** để demo luồng.
Nút này **không có trong bản build** (`npm run build`) nên không xuất hiện khi triển khai thật.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
