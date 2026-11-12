import { useEffect, useRef } from 'react'
import iLoi from '../assets/icons/alert-triangle.svg'
import iThanhCong from '../assets/icons/check-circle.svg'
import './ThongBao.css'

// Popup thông báo dùng chung (Figma: "Vui lòng chọn ít nhất một món", "Tạo đơn thành công", ...).
//  - loai="loi": icon cảnh báo + chữ đỏ, tự đóng sau 3 giây hoặc bấm ra ngoài để đóng
//  - loai="thanh-cong": icon tích xanh + nút "Đóng"
//  - chiTiet (tuỳ chọn): dòng phụ dưới tiêu đề (lỗi: nguyên nhân chữ nhỏ; thành công: câu mô tả)
//  - coNutDong: popup lỗi cũng có nút "Đóng" và không tự đóng (ví dụ đặc tả màn Quản lý menu)
export default function ThongBao({ loai = 'loi', noiDung, chiTiet, coNutDong, onDong }) {
  // Giữ hàm onDong mới nhất trong ref để bộ đếm 3 giây không bị khởi động lại mỗi lần render
  const dong = useRef(onDong)
  useEffect(() => { dong.current = onDong })
  const hienNutDong = loai === 'thanh-cong' || coNutDong

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && dong.current()
    window.addEventListener('keydown', esc)
    // Có chi tiết lỗi hoặc có nút Đóng thì để người dùng tự đóng (để kịp đọc)
    if (loai !== 'loi' || chiTiet || hienNutDong) return () => window.removeEventListener('keydown', esc)
    const t = setTimeout(() => dong.current(), 3000)
    return () => { clearTimeout(t); window.removeEventListener('keydown', esc) }
  }, [loai, chiTiet, hienNutDong])

  return (
    <div className="tb-phu" onClick={loai === 'loi' && !hienNutDong ? onDong : undefined}>
      <div className={'tb-hop ' + loai + (hienNutDong ? ' co-nut' : '')} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <img src={loai === 'loi' ? iLoi : iThanhCong} alt="" />
        <p>{noiDung}</p>
        {chiTiet && <small className="tb-chi-tiet">{chiTiet}</small>}
        {hienNutDong && <button className="nut nut-xanh tb-dong" onClick={onDong}>Đóng</button>}
      </div>
    </div>
  )
}
