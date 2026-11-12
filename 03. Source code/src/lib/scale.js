// Giao diện lấp kín cửa sổ (không viền trống, không thanh cuộn trang):
// - Thu/phóng theo hệ số z để chữ và khoảng cách giữ đúng tỉ lệ thiết kế Figma (khung desktop 1440px).
// - z chọn sao cho chiều cao tối thiểu "nhìn thấy" là CAO_TOI_THIEU px thiết kế -> trang vừa 1 màn hình.
// - Sau khi thu/phóng, khung #root rộng/cao đúng bằng cửa sổ (--w, --h tính theo px thiết kế),
//   bố cục bên trong co giãn theo khung này.
export const RONG_THIET_KE = 1440
export const CAO_TOI_THIEU = 860

export function batTuDongCanTiLe() {
  const root = document.documentElement
  const capNhat = () => {
    const w = window.innerWidth, h = window.innerHeight
    const z = Math.min(w / RONG_THIET_KE, h / CAO_TOI_THIEU)
    root.style.setProperty('--z', String(z))
    root.style.setProperty('--w', w / z + 'px')
    root.style.setProperty('--h', h / z + 'px')
  }
  capNhat()
  window.addEventListener('resize', capNhat)
}
