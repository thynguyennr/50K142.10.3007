import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { so } from '../lib/format'
import ThongBao from '../components/ThongBao'
import iKhongThay from '../assets/icons/search-x.svg'
import iLoi from '../assets/icons/alert-triangle.svg'
import './KhachHang.css'

// "1.000.000" "-50.000" "13" -> số; trống -> null; sai -> NaN
const docSo = (s) => {
  const t = String(s ?? '').trim().replace(/[.,\s]/g, '')
  if (!t) return null
  return /^-?\d+$/.test(t) ? Number(t) : NaN
}

// UC 6.4 Xuất danh sách khách quen
export default function KhachQuen() {
  const nav = useNavigate()
  const [ds, setDs] = useState(null)
  const [loiTai, setLoiTai] = useState('')
  const [soLan, setSoLan] = useState('')
  const [tongTien, setTongTien] = useState('')
  const [ketQua, setKetQua] = useState(null)   // null = chưa lọc
  const [loi, setLoi] = useState({})           // { lan, tien, chung }
  const [thongBao, setThongBao] = useState(null)

  useEffect(() => {
    supabase.from('khachhang').select('tenkh,sodienthoai,solanmua,tongtienmua')
      .then(({ data, error }) => (error ? setLoiTai(error.message) : setDs(data)))
  }, [])

  const loc = () => {
    const a = docSo(soLan), b = docSo(tongTien)
    const l = {}
    if (a != null && (Number.isNaN(a) || a < 0)) l.lan = true
    if (b != null && (Number.isNaN(b) || b < 0)) l.tien = true
    if (a == null && b == null) l.chung = true // 4a: chưa nhập tiêu chí
    setLoi(l)
    if (Object.keys(l).length) return setKetQua(null)
    // BR6.4_01: đạt ít nhất 1 tiêu chí đã nhập
    const kq = (ds || []).filter((k) => (a != null && Number(k.solanmua) >= a) || (b != null && Number(k.tongtienmua) >= b))
      .sort((x, y) => Number(y.solanmua) - Number(x.solanmua) || Number(y.tongtienmua) - Number(x.tongtienmua))
    setKetQua(kq)
  }

  const huy = () => { setSoLan(''); setTongTien(''); setKetQua(null); setLoi({}) }

  // Xuất tệp Excel .xlsx (thư viện tải khi bấm nút để không làm nặng trang)
  const xuat = async () => {
    if (!ketQua?.length) return setThongBao({ loai: 'loi', noiDung: 'Không thể xuất danh sách', chiTiet: 'Hãy lọc ra ít nhất một khách hàng trước khi xuất.' })
    try {
      const XLSX = await import('xlsx')
      const dong = [['STT', 'Tên khách hàng', 'Số điện thoại', 'Số lần mua', 'Tổng tiền đã mua'],
        ...ketQua.map((k, i) => [i + 1, k.tenkh, String(k.sodienthoai), Number(k.solanmua ?? 0), Number(k.tongtienmua ?? 0)])]
      const ws = XLSX.utils.aoa_to_sheet(dong) // số điện thoại để dạng chữ nên giữ số 0 đầu
      ws['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 15 }, { wch: 12 }, { wch: 18 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Khách quen')
      const n = new Date()
      XLSX.writeFile(wb, `khach-quen-${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}.xlsx`)
      setThongBao({ loai: 'thanh-cong', noiDung: 'Xuất danh sách thành công' })
    } catch (e) {
      setThongBao({ loai: 'loi', noiDung: 'Không thể xuất danh sách', chiTiet: e.message })
    }
  }

  const coLoi = loi.lan || loi.tien || loi.chung

  return (
    <div className="kh">
      <div className="khung dau-trang">
        <h1>Xuất danh sách khách quen</h1>
        <button className="nut nut-phu kq-quay-lai" onClick={() => nav('/khach-hang')}>Quay lại</button>
      </div>

      <div className="kq-than">
        <div className="khung kq-bang">
          <div className="kq-dong kh-dau"><span className="giua">STT</span><span>Tên khách hàng</span><span>Số điện thoại</span><span className="giua">Số lần mua</span><span className="phai">Tổng tiền đã mua</span></div>
          <div className="kh-than">
            {loiTai && <p className="loi-tai">Không tải được khách hàng: {loiTai}</p>}
            {coLoi ? (
              <div className="kh-rong"><img src={iLoi} alt="" /><p className="kq-loi">Tiêu chí không hợp lệ</p></div>
            ) : ketQua == null ? (
              <p className="kh-trong">Nhập tiêu chí bên phải rồi bấm "Lọc" để xem danh sách khách quen.</p>
            ) : ketQua.length === 0 ? (
              <div className="kh-rong"><img src={iKhongThay} alt="" /><p>Không có khách hàng phù hợp</p></div>
            ) : ketQua.map((k, i) => (
              <div className="kq-dong" key={k.sodienthoai}>
                <span className="giua">{i + 1}</span><span>{k.tenkh}</span><span>{k.sodienthoai}</span>
                <span className="giua">{k.solanmua ?? 0}</span><span className="phai">{so(k.tongtienmua)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="kq-phai">
          <div className="khung kq-loc">
            <h2>Tiêu chí lọc</h2>
            <p className="kq-phu">Thiết lập tiêu chí lọc tối thiểu</p>
            <label>Số lần mua tối thiểu
              <input className={loi.lan ? 'loi' : ''} value={soLan} inputMode="numeric" placeholder="Nhập số lần tối thiểu"
                onChange={(e) => setSoLan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loc()} />
            </label>
            <label>Tổng tiền đã mua tối thiểu (VNĐ)
              <input className={loi.tien ? 'loi' : ''} value={tongTien} inputMode="numeric" placeholder="Nhập tổng tiền tối thiểu"
                onChange={(e) => setTongTien(e.target.value)} onBlur={() => { const v = docSo(tongTien); if (v > 0) setTongTien(so(v)) }}
                onKeyDown={(e) => e.key === 'Enter' && loc()} />
            </label>
            <p className="kq-ghi-chu">Khách hàng đáp ứng ít nhất 1 tiêu chí sẽ được hiển thị</p>
            <div className="kq-nut">
              <button className="nut nut-phu" onClick={huy}>Hủy</button>
              <button className="nut nut-xanh" onClick={loc} disabled={!ds}>Lọc</button>
            </div>
          </div>
          <button className="nut nut-xanh kq-xuat" onClick={xuat}>Xuất danh sách</button>
        </div>
      </div>

      {thongBao && <ThongBao loai={thongBao.loai} noiDung={thongBao.noiDung} chiTiet={thongBao.chiTiet} coNutDong onDong={() => setThongBao(null)} />}
    </div>
  )
}

