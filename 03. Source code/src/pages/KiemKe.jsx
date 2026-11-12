import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { so2, chuanTen, docSoLe, taiNguyenLieu, capNhatNguyenLieu } from '../lib/kho'
import ThongBao from '../components/ThongBao'
import iSearch from '../assets/icons/search.svg'
import iSearchLon from '../assets/icons/search-lon.svg'
import iLoi from '../assets/icons/alert-triangle.svg'
import './Kho.css'

// UC 5.1 Kiểm kê tồn kho
export default function KiemKe() {
  const nav = useNavigate()
  const [ds, setDs] = useState(null)
  const [loiTai, setLoiTai] = useState('')
  const [tim, setTim] = useState('')
  const [nhap, setNhap] = useState({})       // manl -> chuỗi số lượng thực tế (giữ khi tìm kiếm)
  const [loi, setLoi] = useState({})         // manl -> true
  const [canhBao, setCanhBao] = useState('')
  const [dangLuu, setDangLuu] = useState(false)
  const [thongBao, setThongBao] = useState(null)

  useEffect(() => { taiNguyenLieu().then(({ data, error }) => (error ? setLoiTai(error.message) : setDs(data))) }, [])

  const q = chuanTen(tim)
  const stt = new Map((ds || []).map((n, i) => [n.manl, i + 1]))
  const hienThi = (ds || []).filter((n) => !q || chuanTen(n.tennl).includes(q))
  const daNhap = Object.values(nhap).filter((v) => String(v).trim()).length

  const luu = async () => {
    const l = {}
    const capNhat = []
    for (const n of ds) {
      const v = docSoLe(nhap[n.manl])
      if (v == null) continue // BR5.1_02: để trống thì giữ nguyên
      if (Number.isNaN(v) || v < 0) l[n.manl] = true
      else capNhat.push([n, v])
    }
    setLoi(l)
    if (Object.keys(l).length) { setTim(''); return setCanhBao('') }
    if (!capNhat.length) return setCanhBao('Chưa có nguyên liệu nào được kiểm kê') // 5b
    setCanhBao('')
    setDangLuu(true)
    for (const [n, v] of capNhat) {
      const e = await capNhatNguyenLieu(n.manl, { tonkho: v }, n)
      if (e) {
        setDangLuu(false)
        return setThongBao({ noiDung: 'Lưu kiểm kê không thành công', chiTiet: `${n.tennl}: ${e.message}` })
      }
    }
    setDangLuu(false)
    nav('/kho', { state: { thongDiep: 'Tồn kho đã cập nhật theo số lượng thực tế' } })
  }

  return (
    <div className="kho">
      <div className="khung kho-dau">
        <div>
          <h1>Kiểm kê tồn kho</h1>
          <p className="kho-phu">Nhập số lượng thực tế đếm được. Nguyên liệu để trống sẽ giữ nguyên tồn kho.</p>
        </div>
      </div>

      {canhBao && <div className="kho-nhac loi"><img src={iLoi} alt="" />{canhBao}</div>}

      <div className="khung kho-khung">
        <div className="kho-cong-cu">
          <label className="kho-tim rong">
            <img src={iSearch} alt="" />
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm nguyên liệu theo tên" />
            {tim && <button className="kho-xoa-tim" onClick={() => setTim('')} aria-label="Xóa từ khóa">×</button>}
          </label>
          <span className="kho-dem">Đã nhập {daNhap} / {ds?.length ?? 0} nguyên liệu · Chưa lưu</span>
        </div>
        {tim && daNhap > 0 && (
          <p className="kho-ghi">Các giá trị của {daNhap} dòng đã nhập vẫn được giữ khi tìm kiếm hoặc xóa từ khóa. Tồn kho chưa thay đổi.</p>
        )}

        <div className="kk-dong kho-tieu-de">
          <span className="giua">STT</span><span>Tên nguyên liệu</span><span>Đơn vị tính</span>
          <span className="phai">Tồn trên hệ thống</span><span className="phai">Số lượng thực tế</span>
        </div>
        <div className="kho-than">
          {loiTai && <p className="loi-tai">Không tải được kho: {loiTai}</p>}
          {!ds && !loiTai && <p className="kho-trong">Đang tải...</p>}
          {ds && hienThi.length === 0 && (
            <div className="kho-rong"><img src={iSearchLon} alt="" />
              <p>{ds.length === 0 ? 'Chưa có nguyên liệu trong kho' : 'Không tìm thấy nguyên liệu'}</p>
              {ds.length > 0 && <small>Thử sửa hoặc xóa từ khóa để tìm nguyên liệu. Số đã nhập vẫn được giữ.</small>}
            </div>
          )}
          {hienThi.map((n) => (
            <div className="kk-dong" key={n.manl}>
              <span className="giua">{stt.get(n.manl)}</span>
              <b>{n.tennl}</b>
              <span>{n.donvitinh}</span>
              <span className="phai">{so2(n.tonkho)}</span>
              <span className="kk-o">
                <input className={loi[n.manl] ? 'loi' : ''} value={nhap[n.manl] ?? ''} inputMode="decimal" maxLength={10} placeholder="Để trống"
                  onChange={(e) => { setNhap((x) => ({ ...x, [n.manl]: e.target.value })); setLoi((x) => ({ ...x, [n.manl]: false })) }} />
                {loi[n.manl] && <em>ⓘ Số lượng không hợp lệ</em>}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="kho-chan-nut">
        <span>Kiểm kê định kỳ 5 ngày một lần, theo số lượng đếm thực tế</span>
        <div>
          <button className="nut nut-phu" onClick={() => nav('/kho', { state: { thongDiep: 'Đã hủy kiểm kê, không lưu thay đổi. Số lượng tồn kho vẫn giữ nguyên.' } })}>Hủy</button>
          <button className="nut nut-xanh" onClick={luu} disabled={!ds || dangLuu}>{dangLuu ? 'Đang lưu' : 'Lưu'}</button>
        </div>
      </div>

      {thongBao && <ThongBao loai="loi" noiDung={thongBao.noiDung} chiTiet={thongBao.chiTiet} coNutDong onDong={() => setThongBao(null)} />}
    </div>
  )
}
