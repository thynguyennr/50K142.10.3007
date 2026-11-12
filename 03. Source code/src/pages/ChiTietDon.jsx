import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { tien, thoiGian, TRANG_THAI } from '../lib/format'
import iDot from '../assets/icons/dot.svg'
import iClock from '../assets/icons/clock.svg'
import iList from '../assets/icons/list.svg'
import iThe from '../assets/icons/the-thanh-toan.svg'
import './TaoDon.css'
import './ThanhToan.css'
import './SuaDon.css'

// UC 2.4 Xem chi tiết đơn – màn hình 6.3.4 (chỉ xem, không sửa/xoá món)
export default function ChiTietDon() {
  const { madon } = useParams()
  const [don, setDon] = useState(null)
  const [loi, setLoi] = useState('')

  useEffect(() => {
    supabase.from('donhang')
      .select(`madon,trangthai,thoigiantao,thoigianthanhtoan,hinhthuc,tongtien,
        khachhang(tenkh,sodienthoai),
        chitietdonban(mamon,kichco,soluong,dongia,thanhtien,ghichu,mon(tenmon))`)
      .eq('madon', madon).single()
      .then(({ data, error }) => (error ? setLoi(error.message) : setDon(data)))
  }, [madon])

  if (loi) return <p className="loi-tai">Không tải được đơn hàng: {loi}</p>
  if (!don) return <p>Đang tải...</p>

  const mons = don.chitietdonban
  const soMon = mons.reduce((t, m) => t + m.soluong, 0)

  return (
    <div className="sd">
      <div className="khung td-dau">
        <div className="td-dong-tieu-de">
          <h1>Chi tiết đơn bán hàng</h1>
          <span className="td-ma">{don.madon}</span>
          <span className="td-tt"><img src={iDot} alt="" />{don.trangthai}</span>
        </div>
        <p className="td-gio"><img src={iClock} alt="" />Thời gian tạo: {thoiGian(don.thoigiantao)}</p>
      </div>

      <div className="ct-the">
        <div className="khung ct-o">
          <h3>Thông tin khách hàng</h3>
          {don.khachhang
            ? <p>{don.khachhang.tenkh} – {don.khachhang.sodienthoai}</p>
            : <p className="ct-chua"><i>Chưa có thông tin</i></p>}
        </div>
        <div className="khung ct-o">
          <h3>Thanh toán &amp; hóa đơn</h3>
          {don.trangthai === TRANG_THAI.DA ? (
            <>
              <p><img src={iThe} alt="" />Đã thanh toán – {don.hinhthuc}</p>
              <p className="ct-phu">Thời gian thanh toán: {thoiGian(don.thoigianthanhtoan)}</p>
            </>
          ) : don.trangthai === TRANG_THAI.HUY ? (
            <p><img src={iThe} alt="" />Đơn đã hủy</p>
          ) : (
            <p><img src={iThe} alt="" />Chờ thu tiền tại quầy</p>
          )}
        </div>
      </div>

      <h2 className="tt-tieu-de"><img src={iList} alt="" />Danh sách món đã gọi ({soMon})</h2>
      <div className="tt-bang ct-bang">
        <div className="tt-dong tt-dau">
          <span>Món</span><span className="giua">Size</span><span className="giua">SL</span>
          <span>Đơn giá</span><span className="phai">Thành tiền</span>
        </div>
        <div className="tt-than-bang">
          {mons.length === 0 && <p className="sd-trong">Đơn không có món nào.</p>}
          {mons.map((m) => (
            <div className="tt-dong" key={m.mamon + m.kichco}>
              <span className="ten"><b>{m.mon?.tenmon || m.mamon}</b>{m.ghichu && <i>{m.ghichu}</i>}</span>
              <span className="giua"><span className="tt-size">{m.kichco}</span></span>
              <span className="giua">{m.soluong}</span>
              <span>{tien(m.dongia)}</span>
              <span className="phai dam">{tien(m.thanhtien ?? m.dongia * m.soluong)}</span>
            </div>
          ))}
        </div>
        <div className="tt-dong tt-tong"><span>Tổng tiền đơn hàng:</span><span className="phai">{tien(don.tongtien)}</span></div>
      </div>
    </div>
  )
}
