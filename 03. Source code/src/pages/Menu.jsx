import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { tien } from '../lib/format'
import { CON_BAN, TAM_HET, DA_XOA } from '../lib/mon'
import ThongBao from '../components/ThongBao'
import XacNhan from '../components/XacNhan'
import iSearch from '../assets/icons/search.svg'
import iSearchLon from '../assets/icons/search-lon.svg'
import './Menu.css'

// Nhóm món chuẩn theo đặc tả màn "Thêm món" (Options: Cà phê, Trà sữa, Trà trái cây)
const NHOM_CHUAN = ['Cà phê', 'Trà sữa', 'Trà trái cây']

// 20000 -> "20k"; giá lẻ (không chia hết 1000) thì ghi đầy đủ
const giaGon = (g) => (g == null ? '—' : g % 1000 === 0 ? `${g / 1000}k` : tien(g))

// "25.000đ", "25000", "25k" -> 25000; không hợp lệ -> NaN; để trống -> null
function docGia(chuoi) {
  const s = String(chuoi ?? '').trim().toLowerCase().replace(/[\s.,đ]/g, '')
  if (!s) return null
  const k = s.endsWith('k')
  const so = k ? s.slice(0, -1) : s
  if (!/^\d+$/.test(so)) return NaN
  return Number(so) * (k ? 1000 : 1)
}

const moTaLoi = (e) => (e.code === 'P0001' ? e.message : `${e.message} [mã ${e.code}]`)

// UC 3.1 Xem danh sách món, 3.2 Thêm món, 3.3 Sửa món, 3.4 Xóa món, 3.5 Cập nhật trạng thái món
export default function Menu() {
  const [ds, setDs] = useState(null)
  const [loiTai, setLoiTai] = useState('')
  const [nhom, setNhom] = useState('')
  const [tim, setTim] = useState('')
  const [form, setForm] = useState(null)       // null | { mon?: món đang sửa }
  const [hoiXoa, setHoiXoa] = useState(null)   // món cần xoá
  const [thongBao, setThongBao] = useState(null) // { loai, noiDung, chiTiet }

  const tai = () => supabase.from('mon').select('mamon,tenmon,nhommon,gialynho,gialylon,trangthai')
    .neq('trangthai', DA_XOA).order('nhommon').order('tenmon')
    .then(({ data, error }) => (error ? setLoiTai(error.message) : setDs(data)))
  useEffect(() => { tai() }, [])

  const dsNhom = [...new Set([...NHOM_CHUAN, ...(ds || []).map((m) => m.nhommon)])]
  const dem = (n) => (ds || []).filter((m) => !n || m.nhommon === n).length
  const hienThi = (ds || [])
    .filter((m) => !nhom || m.nhommon === nhom)
    .filter((m) => m.tenmon.toLowerCase().includes(tim.trim().toLowerCase()))

  // UC 3.5: đổi trạng thái, lỗi thì trả công tắc về như cũ
  const gat = async (m) => {
    const moi = m.trangthai === CON_BAN ? TAM_HET : CON_BAN
    const doiTT = (tt) => setDs((d) => d.map((x) => (x.mamon === m.mamon ? { ...x, trangthai: tt } : x)))
    doiTT(moi)
    const kq = await supabase.from('mon').update({ trangthai: moi }).eq('mamon', m.mamon).select('mamon')
    if (kq.error || !kq.data?.length) {
      doiTT(m.trangthai)
      return setThongBao({ loai: 'loi', noiDung: 'Không thể cập nhật trạng thái, vui lòng thử lại sau' })
    }
    setThongBao({ loai: 'thanh-cong', noiDung: 'Đã chuyển trạng thái món thành công' })
  }

  // UC 3.4: xoá mềm (đánh dấu "Đã xóa") để giữ lịch sử hoá đơn
  const xoa = async () => {
    const m = hoiXoa
    setHoiXoa(null)
    const kq = await supabase.from('mon').update({ trangthai: DA_XOA }).eq('mamon', m.mamon).select('mamon')
    if (kq.error || !kq.data?.length) {
      return setThongBao({ loai: 'loi', noiDung: 'Không thể xóa món, vui lòng thử lại sau', chiTiet: kq.error && moTaLoi(kq.error) })
    }
    setDs((d) => d.filter((x) => x.mamon !== m.mamon))
    setThongBao({ loai: 'thanh-cong', noiDung: 'Xóa món thành công' })
  }

  const daLuu = (sua) => {
    setForm(null)
    tai()
    setThongBao(sua
      ? { loai: 'thanh-cong', noiDung: 'Cập nhật thành công' }
      : { loai: 'thanh-cong', noiDung: 'Thêm món thành công', chiTiet: 'danh sách món có món vừa thêm.' })
  }

  return (
    <div className="mn">
      <div className="khung dau-trang">
        <h1>Quản lý menu</h1>
        <button className="nut nut-xanh mn-them" onClick={() => setForm({})}>Thêm món</button>
      </div>

      <div className="khung mn-khung">
        <div className="mn-cong-cu">
          <div className="chip-hang">
            <button className={'chip mn-chip' + (!nhom ? ' dang-chon' : '')} onClick={() => setNhom('')}>Tất cả ({dem('')})</button>
            {dsNhom.map((n) => (
              <button key={n} className={'chip mn-chip' + (nhom === n ? ' dang-chon' : '')} onClick={() => setNhom(n)}>{n} ({dem(n)})</button>
            ))}
          </div>
          <label className="mn-tim">
            <img src={iSearch} alt="" />
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm theo tên món" />
          </label>
        </div>

        <div className="mn-dong mn-dau">
          <span>Tên món</span><span>Nhóm món</span><span className="phai">Giá ly nhỏ</span><span className="phai">Giá ly lớn</span>
          <span className="tt">Trạng thái</span><span className="giua">Thao tác</span>
        </div>
        <div className="mn-than">
          {loiTai && <p className="loi-tai">Không tải được menu: {loiTai}</p>}
          {!ds && !loiTai && <p className="mn-trong">Đang tải...</p>}
          {ds && hienThi.length === 0 && (
            <div className="mn-khong-thay"><img src={iSearchLon} alt="" /><p>Không tìm thấy món</p></div>
          )}
          {hienThi.map((m) => {
            const conBan = m.trangthai === CON_BAN
            return (
              <div className="mn-dong" key={m.mamon}>
                <span className="ten">{m.tenmon}</span>
                <span>{m.nhommon}</span>
                <span className="phai">{giaGon(m.gialynho)}</span>
                <span className="phai">{giaGon(m.gialylon)}</span>
                <span className="tt mn-tt">
                  <span className={'mn-badge' + (conBan ? '' : ' het')}>{m.trangthai}</span>
                  <button type="button" role="switch" aria-checked={conBan} className={'cong-tac' + (conBan ? ' bat' : '')}
                    aria-label={`${m.tenmon}: chuyển sang ${conBan ? TAM_HET : CON_BAN}`} onClick={() => gat(m)} />
                </span>
                <span className="giua mn-thao-tac">
                  <button className="nut mn-sua" onClick={() => setForm({ mon: m })}>Sửa</button>
                  <button className="nut mn-xoa" onClick={() => setHoiXoa(m)}>Xóa</button>
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {form && <FormMon mon={form.mon} dsNhom={dsNhom} dsTen={(ds || []).map((m) => m)} onHuy={() => setForm(null)} onXong={daLuu} />}
      {hoiXoa && (
        <XacNhan canhBao cauHoi="Bạn có chắc chắn muốn xóa món này?" nutTrai="Hủy" nutPhai="Xóa"
          onTrai={() => setHoiXoa(null)} onPhai={xoa} />
      )}
      {thongBao && (
        <ThongBao loai={thongBao.loai} noiDung={thongBao.noiDung} chiTiet={thongBao.chiTiet} coNutDong
          onDong={() => setThongBao(null)} />
      )}
    </div>
  )
}

/* ---------- Form Thêm món / Sửa món ---------- */
function FormMon({ mon, dsNhom, dsTen, onHuy, onXong }) {
  const sua = Boolean(mon)
  const [ten, setTen] = useState(mon?.tenmon ?? '')
  const [nhom, setNhom] = useState(mon?.nhommon ?? '')
  // Form sửa điền sẵn giá dạng "25.000đ" như Figma (docGia đọc lại được)
  const dinhDang = (g) => (g == null ? '' : Number(g).toLocaleString('vi-VN') + 'đ')
  const [nho, setNho] = useState(dinhDang(mon?.gialynho))
  const [lon, setLon] = useState(dinhDang(mon?.gialylon))
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
    const t = ten.trim()
    // BR3.2_01 / BR3.3_01: không trống, không trùng (không tính chính món đang sửa)
    const trung = dsTen.some((m) => m.mamon !== mon?.mamon && m.tenmon.trim().toLowerCase() === t.toLowerCase())
    if (!t || trung) l.ten = 'Tên món không hợp lệ'
    if (!nhom) l.nhom = 'Vui lòng chọn nhóm món'
    const gNho = docGia(nho), gLon = docGia(lon)
    // Database bắt buộc có giá ly nhỏ (> 0); giá ly lớn không bắt buộc, nếu nhập phải > 0
    if (gNho == null || Number.isNaN(gNho) || gNho <= 0) l.nho = 'Giá ly không hợp lệ'
    if (gLon != null && (Number.isNaN(gLon) || gLon <= 0)) l.lon = 'Giá ly không hợp lệ'
    setLoi(l); setLoiLuu('')
    if (Object.keys(l).length) return

    setDangLuu(true)
    const duLieu = { tenmon: t, nhommon: nhom, gialynho: gNho, gialylon: gLon }
    // Món mới: mã món do sequence seq_mon sinh, trạng thái mặc định "Còn bán" (BR3.2_03)
    // Tên trùng với món đã xoá trước đây -> khôi phục món cũ (giữ mã món, lịch sử hoá đơn) với thông tin mới
    let daXoa = null
    if (!sua) {
      const { data } = await supabase.from('mon').select('mamon,tenmon').eq('trangthai', DA_XOA)
      daXoa = (data || []).find((m) => m.tenmon.trim().toLowerCase() === t.toLowerCase())
    }
    const kq = sua
      ? await supabase.from('mon').update(duLieu).eq('mamon', mon.mamon).select('mamon')
      : daXoa
        ? await supabase.from('mon').update({ ...duLieu, tenmon: daXoa.tenmon, trangthai: CON_BAN }).eq('mamon', daXoa.mamon).select('mamon')
        : await supabase.from('mon').insert(duLieu).select('mamon')
    setDangLuu(false)
    if (kq.error) {
      // 23505: trùng tên (kể cả món đã xoá trước đây vẫn còn trong hệ thống)
      if (kq.error.code === '23505') return setLoi({ ten: 'Tên món không hợp lệ' })
      return setLoiLuu(moTaLoi(kq.error))
    }
    if (!kq.data?.length) return setLoiLuu('Không lưu được món, vui lòng thử lại sau')
    onXong(sua)
  }

  return (
    <div className="tb-phu" onClick={onHuy}>
      <div className="mn-form" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="mn-form-dau">
          <h2>{sua ? `Sửa món: ${mon.tenmon}` : 'Thêm món'}</h2>
          {sua && (
            <span className="mn-form-tt">Trạng thái: <span className={'mn-badge' + (mon.trangthai === CON_BAN ? '' : ' het')}>{mon.trangthai}</span></span>
          )}
        </div>

        <label><span className="nhan">Tên món <span className="sao">*</span></span>
          <input className={loi.ten ? 'loi' : ''} value={ten} maxLength={50} autoFocus
            onChange={(e) => setTen(e.target.value)} placeholder="Nhập tên món" />
        </label>
        {loi.ten && <p className="mn-loi">{loi.ten}</p>}

        <label><span className="nhan">Nhóm món <span className="sao">*</span></span>
          <select className={(loi.nhom ? 'loi ' : '') + (nhom ? '' : 'chua-chon')} value={nhom} onChange={(e) => setNhom(e.target.value)}>
            <option value="" disabled>Chọn nhóm món</option>
            {dsNhom.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        {loi.nhom && <p className="mn-loi">{loi.nhom}</p>}

        <label><span className="nhan">Giá ly nhỏ <span className="sao">*</span></span>
          <input className={loi.nho ? 'loi' : ''} value={nho} inputMode="numeric" maxLength={12}
            onChange={(e) => setNho(e.target.value)} placeholder="Nhập giá ly nhỏ" />
        </label>
        {loi.nho && <p className="mn-loi">{loi.nho}</p>}

        <label><span className="nhan">Giá ly lớn</span>
          <input className={loi.lon ? 'loi' : ''} value={lon} inputMode="numeric" maxLength={12}
            onChange={(e) => setLon(e.target.value)} placeholder="Nhập giá ly lớn (nếu có)" />
        </label>
        {loi.lon && <p className="mn-loi">{loi.lon}</p>}

        {loiLuu && <p className="mn-loi thuong">{loiLuu}</p>}
        <div className="mn-form-nut">
          <button className="nut nut-phu" onClick={onHuy}>Hủy</button>
          <button className="nut nut-xanh" onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </div>
    </div>
  )
}
