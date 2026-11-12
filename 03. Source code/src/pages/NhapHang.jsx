import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ngay, CHUYEN_KHOAN } from '../lib/nhapHang'
import iSearch from '../assets/icons/search.svg'
import iSearchLon from '../assets/icons/search-lon.svg'
import iNhap from '../assets/icons/nhap-hang-vang.svg'
import './NhapHang.css'

// Quản lý nhập hàng – danh sách phiếu nhập (UC 4.3, phiếu mới nhất ở trên)
export default function NhapHang() {
  const nav = useNavigate()
  const [ds, setDs] = useState(null)
  const [loi, setLoi] = useState('')
  const [tim, setTim] = useState('')

  useEffect(() => {
    supabase.from('phieunhap')
      .select('mapn,ngaynhap,hinhthucthanhtoan,yeucaunhap(nhacungcap(tenncc))')
      .order('ngaynhap', { ascending: false }).order('mapn', { ascending: false })
      .then(({ data, error }) => (error ? setLoi(error.message) : setDs(data)))
  }, [])

  const loc = (ds || []).filter((p) => p.mapn.toLowerCase().includes(tim.trim().toLowerCase()))

  return (
    <div className="nh">
      <div className="khung dau-trang">
        <h1>Quản lý nhập hàng</h1>
        <div className="nh-nut-dau">
          <button className="nut nut-xanh nh-nut-to" onClick={() => nav('/nhap-hang/yeu-cau')}><span className="cong">+</span>Lập yêu cầu nhập hàng</button>
          <button className="nut nut-xanh nh-nut-to" onClick={() => nav('/nhap-hang/xu-ly')}><img src={iNhap} alt="" />Nhập hàng</button>
        </div>
      </div>

      <div className="khung nh-khung">
        <div className="nh-cong-cu">
          <h2>Danh sách phiếu nhập</h2>
          <label className="nh-tim">
            <img src={iSearch} alt="" />
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Nhập mã phiếu" />
          </label>
        </div>

        <div className="nh-bang">
          <div className="nh-dong nh-dau">
            <span className="giua">STT</span><span>Mã phiếu</span><span>Ngày nhập</span><span>Nhà cung cấp</span>
            <span className="giua">Hình thức thanh toán</span><span />
          </div>
          <div className="nh-than">
            {loi && <p className="loi-tai">Không tải được phiếu nhập: {loi}</p>}
            {!ds && !loi && <p className="nh-trong">Đang tải...</p>}
            {ds && loc.length === 0 && (
              <div className="nh-khong-thay">
                <img src={iSearchLon} alt="" />
                <p>{ds.length === 0 ? 'Chưa có phiếu nhập' : 'Không tìm thấy phiếu nhập'}</p>
              </div>
            )}
            {loc.map((p, i) => (
              <div className="nh-dong" key={p.mapn}>
                <span className="giua">{i + 1}</span>
                <b>{p.mapn}</b>
                <span>{ngay(p.ngaynhap)}</span>
                <span>{p.yeucaunhap?.nhacungcap?.tenncc || '—'}</span>
                <span className="giua"><span className={'nh-ht' + (p.hinhthucthanhtoan === CHUYEN_KHOAN ? ' ck' : '')}>{p.hinhthucthanhtoan}</span></span>
                <span className="giua"><button className="nut nut-vien nh-xem" onClick={() => nav(`/nhap-hang/${p.mapn}`)}>Xem chi tiết</button></span>
              </div>
            ))}
          </div>
        </div>
        {ds && ds.length > 0 && <p className="nh-ghi-chu">Phiếu nhập mới nhất được xếp lên đầu tiên.</p>}
      </div>
    </div>
  )
}
