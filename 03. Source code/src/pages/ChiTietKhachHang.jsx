import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { so, TRANG_THAI } from '../lib/format'
import ThongBao from '../components/ThongBao'
import './KhachHang.css'

const hai = (x) => String(x).padStart(2, '0')
// "03/10/2026 08:20"
const ngayGio = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`
}

// UC 6.2 (xem chi tiết hồ sơ + lịch sử mua) + UC 6.3 (cập nhật tên / số điện thoại)
export default function ChiTietKhachHang() {
  const { sdt } = useParams()
  const nav = useNavigate()
  const [kh, setKh] = useState(null)
  const [don, setDon] = useState([])
  const [loiTai, setLoiTai] = useState('')
  const [ten, setTen] = useState('')
  const [soDt, setSoDt] = useState('')
  const [loi, setLoi] = useState({})
  const [dangLuu, setDangLuu] = useState(false)
  const [thongBao, setThongBao] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('khachhang').select('tenkh,sodienthoai,solanmua,tongtienmua').eq('sodienthoai', sdt).single(),
      supabase.from('donhang').select('madon,thoigianthanhtoan,tongtien')
        .eq('sodienthoaikh', sdt).eq('trangthai', TRANG_THAI.DA).order('thoigianthanhtoan'),
    ]).then(([a, b]) => {
      if (a.error) return setLoiTai(a.error.message)
      setKh(a.data); setTen(a.data.tenkh); setSoDt(a.data.sodienthoai)
      setDon(b.data || [])
    })
  }, [sdt])

  const luu = async () => {
    const l = {}
    const t = ten.trim(), s = soDt.trim()
    if (!t) l.ten = 'Không được bỏ trống tên'
    if (!/^\d{10}$/.test(s)) l.sdt = 'Số điện thoại không hợp lệ'
    setLoi(l)
    if (Object.keys(l).length) return
    setDangLuu(true)
    // 5b: số điện thoại mới trùng hồ sơ khác
    if (s !== kh.sodienthoai) {
      const { data } = await supabase.from('khachhang').select('sodienthoai').eq('sodienthoai', s).maybeSingle()
      if (data) { setDangLuu(false); return setLoi({ sdt: 'Số điện thoại này đã tồn tại' }) }
    }
    // Đổi số điện thoại: khoá ngoại donhang.sodienthoaikh có ON UPDATE CASCADE nên lịch sử đơn đi theo
    const kq = await supabase.from('khachhang').update({ tenkh: t, sodienthoai: s })
      .eq('sodienthoai', kh.sodienthoai).select('sodienthoai')
    setDangLuu(false)
    if (kq.error) {
      if (kq.error.code === '23505') return setLoi({ sdt: 'Số điện thoại này đã tồn tại' })
      return setThongBao({ loai: 'loi', noiDung: 'Cập nhật hồ sơ không thành công', chiTiet: kq.error.message })
    }
    if (!kq.data?.length) return setThongBao({ loai: 'loi', noiDung: 'Cập nhật hồ sơ không thành công' })
    setKh((k) => ({ ...k, tenkh: t, sodienthoai: s }))
    setThongBao({ loai: 'thanh-cong', noiDung: 'Cập nhật hồ sơ thành công', sdtMoi: s !== sdt ? s : null })
  }

  if (loiTai) return <p className="loi-tai">Không tải được hồ sơ khách hàng: {loiTai}</p>
  if (!kh) return <p>Đang tải...</p>

  const tongDon = don.reduce((t, d) => t + Number(d.tongtien), 0)

  return (
    <div className="kh ctk">
      <div className="khung dau-trang"><h1>Hồ sơ chi tiết khách hàng</h1></div>

      <h2 className="ctk-tieu-de">Thông tin khách hàng</h2>
      <div className="khung ctk-the">
        <div className="ctk-o">
          <span className="ctk-so">1</span><b>Tên khách hàng <span className="sao">*</span></b>
          <span>
            <input className={loi.ten ? 'loi' : ''} value={ten} maxLength={50} placeholder="Nhập tên khách hàng"
              onChange={(e) => { setTen(e.target.value); setLoi((x) => ({ ...x, ten: '' })) }} />
            {loi.ten && <em>{loi.ten}</em>}
          </span>
        </div>
        <div className="ctk-o">
          <span className="ctk-so">3</span><b>Số lần mua</b><span className="ctk-gt">{kh.solanmua ?? 0}</span>
        </div>
        <div className="ctk-o">
          <span className="ctk-so">2</span><b>Số điện thoại <span className="sao">*</span></b>
          <span>
            <input className={loi.sdt ? 'loi' : ''} value={soDt} inputMode="numeric" maxLength={10} placeholder="Nhập số điện thoại"
              onChange={(e) => { setSoDt(e.target.value); setLoi((x) => ({ ...x, sdt: '' })) }} />
            {loi.sdt && <em>{loi.sdt}</em>}
          </span>
        </div>
        <div className="ctk-o">
          <span className="ctk-so">4</span><b>Tổng tiền đã mua (VNĐ)</b><span className="ctk-gt">{so(kh.tongtienmua)}</span>
        </div>
      </div>

      <div className="khung ctk-bang">
        <div className="ctk-dong kh-dau"><span className="giua">STT</span><span>Mã đơn</span><span>Thời gian</span><span className="phai">Tổng tiền</span></div>
        <div className="kh-than">
          {don.length === 0 && <p className="kh-trong">Khách hàng chưa có đơn đã thanh toán.</p>}
          {don.map((d, i) => (
            <div className="ctk-dong" key={d.madon}>
              <span className="giua">{i + 1}</span><span>{d.madon}</span><span>{ngayGio(d.thoigianthanhtoan)}</span>
              <span className="phai">{so(d.tongtien)}</span>
            </div>
          ))}
        </div>
        {don.length > 0 && (
          <div className="ctk-dong ctk-tong"><span /><span>Tổng cộng</span><span /><span className="phai">{so(tongDon)}</span></div>
        )}
      </div>

      <div className="ctk-nut">
        <button className="nut nut-phu" onClick={() => nav('/khach-hang')}>Hủy</button>
        <button className="nut nut-xanh" onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu' : 'Lưu'}</button>
      </div>

      {thongBao && (
        <ThongBao loai={thongBao.loai} noiDung={thongBao.noiDung} chiTiet={thongBao.chiTiet} coNutDong
          onDong={() => { const s = thongBao.sdtMoi; setThongBao(null); if (s) nav(`/khach-hang/${s}`, { replace: true }) }} />
      )}
    </div>
  )
}
