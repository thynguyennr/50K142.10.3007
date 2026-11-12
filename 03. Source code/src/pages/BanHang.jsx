import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ThongBao from '../components/ThongBao'
import iSearchLon from '../assets/icons/search-lon.svg'
import { supabase } from '../lib/supabase'
import { tien, thoiGian, TRANG_THAI, lopBadge } from '../lib/format'
import './BanHang.css'

const LOC = [
  { key: 'tat-ca', nhan: 'Tất cả' },
  { key: TRANG_THAI.CHUA, nhan: 'Chưa thanh toán' },
  { key: TRANG_THAI.DA, nhan: 'Đã thanh toán' },
  { key: TRANG_THAI.HUY, nhan: 'Đã hủy' },
]

// Quản lý bán hàng – danh sách đơn (Figma node 1:6128)
export default function BanHang() {
  const nav = useNavigate()
  const { state, pathname } = useLocation()
  const thanhCong = state?.thanhCong // do màn Tạo đơn gửi sang sau khi lưu
  const dongThanhCong = () => nav(pathname, { replace: true, state: null })
  const [ds, setDs] = useState(null)
  const [loi, setLoi] = useState('')
  const [loc, setLoc] = useState('tat-ca')
  const [tim, setTim] = useState('')

  useEffect(() => {
    supabase.from('donhang')
      .select('madon,thoigiantao,tongtien,trangthai,khachhang(tenkh)')
      .order('thoigiantao', { ascending: false })
      .then(({ data, error }) => (error ? setLoi(error.message) : setDs(data)))
  }, [])

  const dem = (k) => (ds || []).filter((d) => k === 'tat-ca' || d.trangthai === k).length
  const hienThi = (ds || [])
    .filter((d) => loc === 'tat-ca' || d.trangthai === loc)
    .filter((d) => d.madon.toLowerCase().includes(tim.trim().toLowerCase()))


  return (
    <div className="bh">
      <div className="khung dau-trang">
        <h1>Quản lý bán hàng</h1>
        <Link className="nut nut-xanh bh-tao" to="/ban-hang/tao-don">Tạo đơn bán hàng</Link>
      </div>

      <div className="khung bh-khung">
        <div className="bh-cong-cu">
          <div className="chip-hang">
            {LOC.map((l) => (
              <button key={l.key} className={'chip' + (loc === l.key ? ' dang-chon' : '')} onClick={() => setLoc(l.key)}>
                {l.nhan} ({dem(l.key)})
              </button>
            ))}
          </div>
          <label className="bh-tim">
            <span aria-hidden="true">⌕</span>
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm theo mã đơn" />
          </label>
        </div>

        {/* UC 2.4 luồng 3b: không có đơn phù hợp -> "Không tìm thấy đơn" */}
        {ds && hienThi.length === 0 ? (
          <div className="bh-khong-thay">
            <img src={iSearchLon} alt="" />
            <p>Không tìm thấy đơn</p>
          </div>
        ) : (
        <div className="bh-bang" role="table">
          <div className="bh-dong bh-dau" role="row">
            <span>STT</span><span>Mã hóa đơn</span><span>Thời gian tạo</span><span>Khách hàng</span>
            <span>Tổng tiền</span><span>Trạng thái</span><span className="tt">Thao tác</span>
          </div>

          <div className="bh-than">
          {loi && <p className="loi-tai">Không tải được danh sách đơn: {loi}</p>}
          {!ds && !loi && <p className="bh-trong">Đang tải...</p>}

          {hienThi.map((d, i) => {
            const chuaTT = d.trangthai === TRANG_THAI.CHUA
            return (
              <div className="bh-dong" role="row" key={d.madon}>
                <span className="stt">{i + 1}</span>
                <span>{d.madon}</span>
                <span className="tg">{thoiGian(d.thoigiantao)}</span>
                <span className={d.khachhang ? '' : 'mo'}>{d.khachhang?.tenkh || 'Chưa có thông tin'}</span>
                <span className="tien">{tien(d.tongtien)}</span>
                <span><span className={'badge ' + lopBadge(d.trangthai)}>{d.trangthai}</span></span>
                <span className="thao-tac">
                  <button className="nut nut-vien" onClick={() => nav(`/ban-hang/${d.madon}`)}>Xem chi tiết</button>
                  <button className="nut nut-vien" disabled={!chuaTT} onClick={() => nav(`/ban-hang/${d.madon}/sua`)}>Chỉnh sửa</button>
                  <button className="nut nut-xanh tt" disabled={!chuaTT} onClick={() => nav(`/ban-hang/${d.madon}/thanh-toan`)}>Thanh toán</button>
                </span>
              </div>
            )
          })}
          </div>
        </div>
        )}
      </div>

      {thanhCong && <ThongBao loai="thanh-cong" noiDung={thanhCong} onDong={dongThanhCong} />}
    </div>
  )
}
