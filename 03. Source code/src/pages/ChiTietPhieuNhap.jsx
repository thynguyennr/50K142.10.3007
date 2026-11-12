import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { tien } from '../lib/format'
import { ngay, soGon, CHUYEN_KHOAN } from '../lib/nhapHang'
import './NhapHang.css'

// UC 4.3 Xem chi tiết phiếu nhập (chỉ xem)
export default function ChiTietPhieuNhap() {
  const { mapn } = useParams()
  const nav = useNavigate()
  const [p, setP] = useState(null)
  const [loi, setLoi] = useState('')

  useEffect(() => {
    supabase.from('phieunhap')
      .select('mapn,ngaynhap,hinhthucthanhtoan,anhbienlai,yeucaunhap(nhacungcap(tenncc)),chitietnhap(manl,soluongthucnhan,dongianhap,nguyenlieu(tennl,donvitinh))')
      .eq('mapn', mapn).single()
      .then(({ data, error }) => (error ? setLoi(error.message) : setP(data)))
  }, [mapn])

  if (loi) return <p className="loi-tai">Không tải được phiếu nhập: {loi}</p>
  if (!p) return <p>Đang tải...</p>

  const ct = p.chitietnhap
  const tong = ct.reduce((t, c) => t + Number(c.soluongthucnhan) * Number(c.dongianhap || 0), 0)
  const ck = p.hinhthucthanhtoan === CHUYEN_KHOAN

  return (
    <div className="nh">
      <div className="khung dau-trang">
        <h1>Xem phiếu nhập</h1>
        <button className="nut nut-phu nh-quay-lai" onClick={() => nav('/nhap-hang')}>Quay lại</button>
      </div>

      <div className={'pn-than' + (ck ? '' : ' mot-cot')}>
        <section className="khung pn-khung">
          <h2>Chi tiết phiếu nhập</h2>
          <div className="pn-tom-tat">
            <span><small>Mã phiếu</small><b>{p.mapn}</b></span>
            <span><small>Ngày nhập</small><b>{ngay(p.ngaynhap)}</b></span>
            <span><small>Nhà cung cấp</small><b>{p.yeucaunhap?.nhacungcap?.tenncc || '—'}</b></span>
            <span><small>Hình thức thanh toán</small><b><span className={'nh-ht' + (ck ? ' ck' : '')}>{p.hinhthucthanhtoan}</span></b></span>
          </div>

          <h2>Danh sách nguyên liệu</h2>
          <div className="pn-dong pn-dau"><span className="giua">STT</span><span>Tên nguyên liệu</span><span>Số lượng</span><span>Đơn giá</span><span className="phai">Thành tiền</span></div>
          {ct.map((c, i) => (
            <div className="pn-dong" key={c.manl}>
              <span className="giua">{i + 1}</span>
              <span>{c.nguyenlieu?.tennl}</span>
              <span>{soGon(c.soluongthucnhan)} {c.nguyenlieu?.donvitinh}</span>
              <span>{c.dongianhap != null ? `${Number(c.dongianhap).toLocaleString('vi-VN')}đ/${c.nguyenlieu?.donvitinh || ''}` : '—'}</span>
              <span className="phai">{tien(Number(c.soluongthucnhan) * Number(c.dongianhap || 0))}</span>
            </div>
          ))}
          <div className="pn-dong pn-tong"><span /><span>Tổng tiền</span><span /><span /><span className="phai">{tien(tong)}</span></div>
        </section>

        {ck && (
          <section className="khung pn-khung">
            <h2>Biên lai chuyển khoản</h2>
            <div className="pn-bien-lai">
              {p.anhbienlai ? <img src={p.anhbienlai} alt={`Biên lai chuyển khoản phiếu ${p.mapn}`} /> : <span>Chưa có ảnh biên lai</span>}
            </div>
            <p className="nh-ghi-chu">Chỉ hiển thị khi hình thức thanh toán là chuyển khoản.</p>
          </section>
        )}
      </div>
    </div>
  )
}
