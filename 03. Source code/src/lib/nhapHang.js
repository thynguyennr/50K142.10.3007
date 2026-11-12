// Hằng số + hàm dùng chung cho phân hệ Nhập hàng (UC 4.1 – 4.3)
// Bảng: yeucaunhap(mayc, mancc, trangthai, thoigianlap, manguoidung)
//       chitietyeucau(mayc, manl, soluongcan)
//       phieunhap(mapn, mayc, ngaynhap, hinhthucthanhtoan, anhbienlai)
//       chitietnhap(mapn, manl, soluongthucnhan, dongianhap)
//       nhacungcap(mancc, tenncc, sodienthoai) · nguyenlieu(manl, tennl, donvitinh, tonkho, ...)
export const YC = { CHO_BAO_GIA: 'Chờ báo giá', DA_DAT: 'Đã đặt hàng', DA_NHAP: 'Đã nhập hàng', DA_HUY: 'Đã hủy' }
export const TIEN_MAT = 'Tiền mặt'
export const CHUYEN_KHOAN = 'Chuyển khoản'

const hai = (x) => String(x).padStart(2, '0')
// "2026-06-10" hoặc ISO -> "10/06/2026"
export const ngay = (v) => {
  if (!v) return ''
  const d = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v)
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`
}
// Ngày hôm nay dạng "YYYY-MM-DD" theo giờ máy
export const homNay = () => { const d = new Date(); return `${d.getFullYear()}-${hai(d.getMonth() + 1)}-${hai(d.getDate())}` }

// "10" "1,5" "2.5" -> số; trống -> null; sai -> NaN
export function docSo(s) {
  const t = String(s ?? '').trim().replace(',', '.')
  if (!t) return null
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN
}
// "220.000" "220000đ" -> 220000
export function docTien(s) {
  const t = String(s ?? '').trim().toLowerCase().replace(/[\s.,đ]/g, '')
  if (!t) return null
  return /^\d+$/.test(t) ? Number(t) : NaN
}
export const soGon = (n) => Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 2 })

// Thu nhỏ ảnh biên lai (tối đa 1000px, JPEG) rồi trả về data URL để lưu vào phieunhap.anhbienlai
export function nenAnh(file, canhMax = 1000) {
  return new Promise((ok, loi) => {
    const r = new FileReader()
    r.onerror = () => loi(new Error('Không đọc được ảnh'))
    r.onload = () => {
      const img = new Image()
      img.onerror = () => loi(new Error('Tệp không phải ảnh'))
      img.onload = () => {
        const tl = Math.min(1, canhMax / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * tl); c.height = Math.round(img.height * tl)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        ok(c.toDataURL('image/jpeg', 0.75))
      }
      img.src = r.result
    }
    r.readAsDataURL(file)
  })
}

export const moTaLoi = (e) => (e.code === 'P0001' ? e.message : `${e.message}${e.details ? ' – ' + e.details : ''} [mã ${e.code}]`)
