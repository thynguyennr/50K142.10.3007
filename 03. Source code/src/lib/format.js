// Hàm định dạng dùng chung cho các màn hình
export const tien = (n) => Number(n || 0).toLocaleString('vi-VN') + ' đ'
export const so = (n) => Number(n || 0).toLocaleString('vi-VN')

const hai = (x) => String(x).padStart(2, '0')
// "17:30 - 03/11/2026"
export const thoiGian = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${hai(d.getHours())}:${hai(d.getMinutes())} - ${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`
}

// Trạng thái đơn -> class badge
export const TRANG_THAI = { CHUA: 'Chưa thanh toán', DA: 'Đã thanh toán', HUY: 'Đã hủy' }
export const lopBadge = (tt) => (tt === TRANG_THAI.DA ? 'da' : tt === TRANG_THAI.HUY ? 'huy' : 'chua')
