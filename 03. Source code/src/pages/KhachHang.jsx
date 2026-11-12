import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { so } from '../lib/format'
import ThongBao from '../components/ThongBao'
import FormKhachHang from '../components/FormKhachHang'
import iSearch from '../assets/icons/search.svg'
import iNhom from '../assets/icons/nhom-nguoi.svg'
import iKhongThay from '../assets/icons/search-x.svg'
import './KhachHang.css'

// So khớp không phân biệt hoa thường và dấu ("minh anh" khớp "Nguyễn Minh Anh")
const chuan = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

// UC 6.2 Xem danh sách khách hàng + UC 6.1 Tạo hồ sơ mới
export default function KhachHang() {
  const nav = useNavigate()
  const [ds, setDs] = useState(null)
  const [loi, setLoi] = useState('')
  const [tim, setTim] = useState('')
  const [moTao, setMoTao] = useState(false)
  const [thongBao, setThongBao] = useState(null)

  const tai = () => supabase.from('khachhang').select('tenkh,sodienthoai,solanmua,tongtienmua').order('sodienthoai')
    .then(({ data, error }) => (error ? setLoi(error.message) : setDs(data)))
  useEffect(() => { tai() }, [])

  // STT giữ nguyên theo danh sách gốc khi lọc (đặc tả màn tìm theo tên)
  const q = chuan(tim)
  const loc = (ds || []).map((k, i) => ({ ...k, stt: i + 1 }))
    .filter((k) => !q || chuan(k.tenkh).includes(q) || k.sodienthoai.includes(tim.trim()))

  return (
    <div className="kh">
      <div className="khung dau-trang">
        <h1>Quản lý khách hàng</h1>
        <div className="kh-nut-dau">
          <button className="nut nut-xanh" onClick={() => setMoTao(true)}>Tạo hồ sơ mới</button>
          <button className="nut nut-xanh" onClick={() => nav('/khach-hang/khach-quen')}>Xuất danh sách khách quen</button>
        </div>
      </div>

      <div className="khung kh-khung">
        <label className="kh-tim">
          <img src={iSearch} alt="" />
          <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm theo số điện thoại hoặc tên" />
        </label>

        <div className="kh-dong kh-dau">
          <span className="giua">STT</span><span>Tên khách hàng</span><span>Số điện thoại</span><span>Số lần mua</span>
          <span className="phai">Tổng tiền đã mua</span><span />
        </div>
        <div className="kh-than">
          {loi && <p className="loi-tai">Không tải được danh sách khách hàng: {loi}</p>}
          {!ds && !loi && <p className="kh-trong">Đang tải...</p>}
          {ds && loc.length === 0 && (
            <div className="kh-rong">
              <img src={ds.length === 0 ? iNhom : iKhongThay} alt="" />
              <p>{ds.length === 0 ? 'Chưa có hồ sơ khách hàng' : 'Không tìm thấy hồ sơ khách hàng'}</p>
            </div>
          )}
          {loc.map((k) => (
            <div className="kh-dong" key={k.sodienthoai}>
              <span className="giua">{k.stt}</span>
              <span>{k.tenkh}</span>
              <span>{k.sodienthoai}</span>
              <span>{k.solanmua ?? 0}</span>
              <span className="phai">{so(k.tongtienmua)}</span>
              <span className="giua">
                <button className="nut nut-vien kh-xem"
                  onClick={() => nav(`/khach-hang/${k.sodienthoai}`)}>Xem chi tiết</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {moTao && (
        <FormKhachHang onHuy={() => setMoTao(false)}
          onXong={() => { setMoTao(false); tai(); setThongBao({ loai: 'thanh-cong', noiDung: 'Lưu hồ sơ khách hàng thành công' }) }} />
      )}
      {thongBao && <ThongBao loai={thongBao.loai} noiDung={thongBao.noiDung} coNutDong onDong={() => setThongBao(null)} />}
    </div>
  )
}
