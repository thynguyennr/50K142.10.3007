import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { tien, so, TRANG_THAI, lopBadge } from '../lib/format'
import './Home.css'

// Tổng doanh thu theo món trong tháng hiện tại (chỉ đơn đã thanh toán)
function xepHangMon(dsMon, chiTiet) {
  const tong = new Map(dsMon.map((m) => [m.mamon, 0]))
  chiTiet.forEach((c) => tong.set(c.mamon, (tong.get(c.mamon) || 0) + Number(c.thanhtien)))
  const ds = dsMon.map((m) => ({ ten: m.tenmon, doanhThu: tong.get(m.mamon) || 0 }))
  const giam = [...ds].sort((a, b) => b.doanhThu - a.doanhThu)
  return { chay: giam.slice(0, 3), cham: giam.reverse().slice(0, 3) }
}

export default function Home() {
  const { chuQuan } = useAuth()
  const [s, setS] = useState(null)
  const [loi, setLoi] = useState('')

  useEffect(() => {
    const homNay = new Date(); homNay.setHours(0, 0, 0, 0)
    const dauThang = new Date(homNay.getFullYear(), homNay.getMonth(), 1)
    Promise.all([
      supabase.from('donhang').select('madon,trangthai,tongtien,hinhthuc,thoigianthanhtoan,thoigiantao'),
      supabase.from('nguyenlieu').select('trangthaitonkho'),
      supabase.from('mon').select('mamon,tenmon').neq('trangthai', 'Đã xóa'),
      supabase.from('chitietdonban')
        .select('mamon,thanhtien,donhang!inner(trangthai,thoigianthanhtoan)')
        .eq('donhang.trangthai', TRANG_THAI.DA)
        .gte('donhang.thoigianthanhtoan', dauThang.toISOString()),
    ]).then(([dh, nl, mon, ct]) => {
      const loiDau = [dh, nl, mon, ct].find((r) => r.error)
      if (loiDau) { setLoi(loiDau.error.message); return }
      const don = dh.data
      const daTT = don.filter((d) => d.trangthai === TRANG_THAI.DA && new Date(d.thoigianthanhtoan) >= homNay)
      const cong = (ds) => ds.reduce((t, d) => t + Number(d.tongtien), 0)
      setS({
        doanhThu: cong(daTT),
        soDon: daTT.length,
        tienMat: cong(daTT.filter((d) => d.hinhthuc === 'Tiền mặt')),
        chuyenKhoan: cong(daTT.filter((d) => d.hinhthuc === 'Chuyển khoản')),
        chuaTT: don.filter((d) => d.trangthai === TRANG_THAI.CHUA).length,
        het: nl.data.filter((n) => n.trangthaitonkho === 'Hết').length,
        sapHet: nl.data.filter((n) => n.trangthaitonkho === 'Sắp hết').length,
        ganDay: [...don].sort((a, b) => new Date(b.thoigiantao) - new Date(a.thoigiantao)).slice(0, 3),
        ...xepHangMon(mon.data, ct.data),
      })
    })
  }, [])

  return (
    <div className="tc">
      <div className="khung tc-chao">
        <h1>Xin chào!</h1>
        <b>{chuQuan?.hoten}</b>
      </div>

      {loi && <p className="loi-tai">Không tải được dữ liệu: {loi}</p>}
      {!s && !loi && <p>Đang tải...</p>}
      {s && <>
        <div className="tc-so">
          {[['Doanh thu hôm nay', tien(s.doanhThu)], ['Đơn đã thanh toán', so(s.soDon)],
            ['Tiền mặt', tien(s.tienMat)], ['Chuyển khoản', tien(s.chuyenKhoan)]].map(([nhan, giaTri]) => (
            <div className="khung tc-the" key={nhan}><small>{nhan}</small><b>{giaTri}</b></div>
          ))}
        </div>

        <div className="khung tc-canh-bao">
          <div className="cb het"><b>Nguyên liệu đã hết</b><span>Có {s.het} nguyên liệu tồn kho bằng 0</span></div>
          <div className="cb sap-het"><b>Nguyên liệu sắp hết</b><span>Có {s.sapHet} nguyên liệu dưới mức tồn tối thiểu</span></div>
          <div className="cb chua-tt"><b>Đơn chưa thanh toán</b><span>Có {s.chuaTT} đơn đang chờ thanh toán</span></div>
        </div>

        <div className="tc-hai-cot">
          <BangXepHang tieuDe="3 món bán chậm" ds={s.cham} />
          <BangXepHang tieuDe="Top 3 món bán chạy" ds={s.chay} />
        </div>

        <div className="khung tc-gan-day">
          <div className="tc-dau">
            <h2>Đơn hàng gần đây</h2>
            <Link to="/ban-hang">Xem tất cả đơn</Link>
          </div>
          {s.ganDay.length === 0 && <p className="muted">Chưa có đơn hàng nào.</p>}
          {s.ganDay.map((d) => (
            <div className="tc-don" key={d.madon}>
              <b className="ma">{d.madon}</b>
              <span className={'badge ' + lopBadge(d.trangthai)}>{d.trangthai}</span>
              <b className="tien">{tien(d.tongtien)}</b>
              <Link className="nut nut-vien" to={`/ban-hang/${d.madon}`}>Xem chi tiết</Link>
            </div>
          ))}
        </div>
      </>}
    </div>
  )
}

function BangXepHang({ tieuDe, ds }) {
  return (
    <div className="khung tc-xh">
      <div className="tc-dau">
        <h2>{tieuDe}</h2>
        <Link to="/thong-ke">Xem thống kê</Link>
      </div>
      <small className="ky">Kỳ: tháng hiện tại</small>
      {ds.length === 0 && <p className="muted">Chưa có món nào.</p>}
      {ds.map((m, i) => (
        <div className="tc-hang" key={m.ten}>
          <span className="hang">{i + 1}</span>
          <b className="ten">{m.ten}</b>
          <b className="dt">{so(m.doanhThu)}đ</b>
        </div>
      ))}
    </div>
  )
}
