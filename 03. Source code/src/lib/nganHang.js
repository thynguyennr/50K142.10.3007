// Tài khoản nhận chuyển khoản của quán (hiện trên màn Thanh toán + mã QR).
// Đổi thông tin ở đây khi quán dùng tài khoản khác.
// bin: mã ngân hàng theo chuẩn Napas/VietQR (MB Bank = 970422, Vietcombank = 970436, ...)
export const NGAN_HANG = {
  ten: 'Mb Bank',
  bin: '970422',
  soTaiKhoan: '0905623431',
}

// Số tài khoản 12 số -> nhóm 4 ("1028 7349 9999"); số ngắn hơn (vd số điện thoại) giữ nguyên
export const dinhDangSoTK = (s) => (s.length >= 12 ? s.replace(/(\d{4})(?=\d)/g, '$1 ') : s)
