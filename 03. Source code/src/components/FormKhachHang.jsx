import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { tien } from '../lib/format'
import './FormKhachHang.css'

const SDT_HOP_LE = /^\d{10}$/ // BR6.1_01: đúng 10 chữ số

// Popup "Tạo hồ sơ khách hàng" (UC 6.1) – dùng ở màn Quản lý khách hàng và màn Thanh toán (luồng 3a).
//  - sdtBanDau: điền sẵn số điện thoại (từ màn Thanh toán)
//  - soLanMua / tongTien: chỉ để hiển thị (màn Thanh toán hiện 1 lần và tiền đơn vừa trả;
//    thực tế database tự cộng khi gắn khách vào đơn đã thanh toán)
export default function FormKhachHang({ sdtBanDau = '', soLanMua = 0, tongTien = 0, onHuy, onXong }) {
  const [ten, setTen] = useState('')
  const [sdt, setSdt] = useState(sdtBanDau)
  const [loi, setLoi] = useState({})
  const [loiLuu, setLoiLuu] = useState('')
  const [dangLuu, setDangLuu] = useState(false)

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onHuy()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onHuy])

  const luu = async () => {
    const l = {}
    const s = sdt.trim()
    if (!ten.trim()) l.ten = 'Không được bỏ trống tên'
    if (!SDT_HOP_LE.test(s)) l.sdt = 'Số điện thoại không hợp lệ'
    setLoi(l); setLoiLuu('')
    if (Object.keys(l).length) return

    setDangLuu(true)
    // 6b: số điện thoại đã có hồ sơ
    const { data: daCo } = await supabase.from('khachhang').select('sodienthoai').eq('sodienthoai', s).maybeSingle()
    if (daCo) { setDangLuu(false); return setLoi({ sdt: 'Khách hàng này đã có hồ sơ' }) }
    // Số lần mua / tổng tiền mặc định 0 (UC 6.1 bước 7)
    const { error } = await supabase.from('khachhang').insert({ tenkh: ten.trim(), sodienthoai: s, solanmua: 0, tongtienmua: 0 })
    setDangLuu(false)
    if (error) {
      if (error.code === '23505') return setLoi({ sdt: 'Khách hàng này đã có hồ sơ' })
      return setLoiLuu(error.code === 'P0001' ? error.message : `${error.message} [mã ${error.code}]`)
    }
    onXong({ tenkh: ten.trim(), sodienthoai: s })
  }

  return (
    <div className="td-phu fkh-phu" onClick={onHuy}>
      <div className="fkh" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Tạo hồ sơ khách hàng</h2>
        <label><span className="nhan">Tên khách hàng <span className="sao">*</span></span>
          <input className={loi.ten ? 'loi' : ''} value={ten} maxLength={50} autoFocus
            onChange={(e) => setTen(e.target.value)} placeholder="Nhập tên khách hàng" />
        </label>
        {loi.ten && <p className="fkh-loi">{loi.ten}</p>}
        <label><span className="nhan">Số điện thoại <span className="sao">*</span></span>
          <input className={loi.sdt ? 'loi' : ''} value={sdt} inputMode="numeric" maxLength={10}
            onChange={(e) => setSdt(e.target.value)} placeholder="Nhập số điện thoại" />
        </label>
        {loi.sdt && <p className="fkh-loi">{loi.sdt}</p>}
        <p className="fkh-thong-ke">Số lần mua: {soLanMua}<br />Tổng tiền đã mua: {tien(tongTien)}</p>
        {loiLuu && <p className="fkh-loi thuong">{loiLuu}</p>}
        <div className="fkh-nut">
          <button className="nut nut-phu" onClick={onHuy}>Hủy</button>
          <button className="nut nut-xanh" onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu...' : 'Lưu hồ sơ'}</button>
        </div>
      </div>
    </div>
  )
}
