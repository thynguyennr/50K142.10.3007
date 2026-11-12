import { useEffect, useRef } from 'react'
import iLoi from '../assets/icons/alert-triangle.svg'
import './ThongBao.css'

// Popup hỏi xác nhận 2 lựa chọn (Figma: "Món này đã pha chưa ?", "Bạn muốn xóa món này ?",
// "Đơn không còn món nào, ..."). Nút trái viền hồng, nút phải xanh lá.
// canhBao: kiểu cảnh báo xóa (icon tam giác, chữ đỏ, nút phải màu đỏ sẫm, 2 nút gọn bên phải)
export default function XacNhan({ cauHoi, nutTrai, nutPhai, onTrai, onPhai, onDong, canhBao }) {
  const dong = useRef(onDong ?? onTrai)
  useEffect(() => { dong.current = onDong ?? onTrai })
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && dong.current()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  return (
    <div className="tb-phu" onClick={() => dong.current()}>
      <div className={'tb-hop xac-nhan' + (canhBao ? ' canh-bao' : '')} role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {canhBao && <img src={iLoi} alt="" />}
        <p>{cauHoi}</p>
        <div className="xn-nut">
          <button className="nut nut-phu" onClick={onTrai}>{nutTrai}</button>
          <button className={'nut ' + (canhBao ? 'nut-do' : 'nut-xanh')} onClick={onPhai}>{nutPhai}</button>
        </div>
      </div>
    </div>
  )
}
