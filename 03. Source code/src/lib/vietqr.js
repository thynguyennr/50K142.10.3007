// Tạo chuỗi VietQR (chuẩn EMVCo của Napas) để app ngân hàng quét là tự điền
// số tài khoản, số tiền và nội dung chuyển khoản. Tạo ngay trên máy, không gọi dịch vụ ngoài.

const truong = (id, giaTri) => id + String(giaTri.length).padStart(2, '0') + giaTri

// CRC16-CCITT (đa thức 0x1021, giá trị đầu 0xFFFF) theo yêu cầu của chuẩn
function crc16(chuoi) {
  let crc = 0xffff
  for (let i = 0; i < chuoi.length; i++) {
    crc ^= chuoi.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Nội dung chuyển khoản: chỉ giữ chữ không dấu, số và khoảng trắng (một số ngân hàng không nhận dấu)
const boDau = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  .replace(/[^A-Za-z0-9 ]/g, '').slice(0, 25)

export function taoChuoiVietQR({ bin, soTaiKhoan, soTien, noiDung }) {
  const thuHuong = truong('00', bin) + truong('01', soTaiKhoan)
  const taiKhoan = truong('00', 'A000000727') + truong('01', thuHuong) + truong('02', 'QRIBFTTA')
  let s = truong('00', '01')
    + truong('01', '12')                  // QR động (có số tiền)
    + truong('38', taiKhoan)
    + truong('53', '704')                 // VND
    + truong('54', String(Math.round(soTien)))
    + truong('58', 'VN')
  if (noiDung) s += truong('62', truong('08', boDau(noiDung)))
  s += '6304'
  return s + crc16(s)
}
