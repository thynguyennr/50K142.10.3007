import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trangThaiTon, so2, chuanTen, docSoLe, taiNguyenLieu, capNhatNguyenLieu } from '../lib/kho'
import iSearch from '../assets/icons/search.svg'
import iSearchLon from '../assets/icons/search-lon.svg'
import iLoi from '../assets/icons/alert-triangle.svg'
import iXong from '../assets/icons/check-circle.svg'
import './Kho.css'

// UC 5.2 Thiết lập mức tồn kho tối thiểu
export default function MucTonToiThieu() {
  const nav = useNavigate()
  const [ds, setDs] = useState(null)
  const [loiTai, setLoiTai] = useState('')
  const [tim, setTim] = useState('')
  const [chon, setChon] = useState('')     // manl đang chọn
  const [gt, setGt] = useState('')
  const [loi, setLoi] = useState('')
  const [xong, setXong] = useState(false)
  const [dangLuu, setDangLuu] = useState(false)

  useEffect(() => { taiNguyenLieu().then(({ data, error }) => (error ? setLoiTai(error.message) : setDs(data))) }, [])

  const q = chuanTen(tim)
  const hienThi = (ds || []).filter((n) => !q || chuanTen(n.tennl).includes(q))
  const nl = (ds || []).find((n) => n.manl === chon)

  const chonNl = (n) => { setChon(n.manl); setGt(''); setLoi(''); setXong(false) }

  const luu = async () => {
    const v = docSoLe(gt)
    if (v == null || Number.isNaN(v) || v < 0) return setLoi('Mức tồn tối thiểu không hợp lệ') // 6a
    setLoi(''); setDangLuu(true)
    // BR5-04: chỉ đổi mức tối thiểu, không đổi số lượng tồn
    const e = await capNhatNguyenLieu(nl.manl, { muctontoithieu: v }, nl)
    setDangLuu(false)
    if (e) return setLoi('Lưu không thành công: ' + e.message)
    setDs((d) => d.map((x) => (x.manl === nl.manl ? { ...x, muctontoithieu: v } : x)))
    setGt(so2(v))
    setXong(true)
  }

  const tt = nl && trangThaiTon(nl.tonkho, nl.muctontoithieu)

  return (
    <div className="kho">
      <div className="khung kho-dau">
        <div>
          <h1>Thiết lập mức tồn tối thiểu</h1>
          <p className="kho-phu">Chọn nguyên liệu và đặt mức tồn tối thiểu riêng để hệ thống cảnh báo khi sắp hết</p>
        </div>
        <button className="nut nut-phu kho-quay-lai" onClick={() => nav('/kho')}>Quay lại</button>
      </div>

      {xong && <div className="kho-nhac xong"><img src={iXong} alt="" />Thiết lập thành công</div>}

      <div className="mt-than">
        <div className="khung kho-khung">
          <label className="kho-tim rong full">
            <img src={iSearch} alt="" />
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm nguyên liệu theo tên" />
            {tim && <button className="kho-xoa-tim" onClick={() => setTim('')} aria-label="Xóa từ khóa">×</button>}
          </label>
          <div className="mt-dong kho-tieu-de">
            <span>Tên nguyên liệu</span><span>Đơn vị</span><span className="phai">Tồn hiện tại</span><span className="phai">Mức tồn tối thiểu hiện tại</span><span />
          </div>
          <div className="kho-than">
            {loiTai && <p className="loi-tai">Không tải được kho: {loiTai}</p>}
            {!ds && !loiTai && <p className="kho-trong">Đang tải...</p>}
            {ds && hienThi.length === 0 && (
              <div className="kho-rong"><img src={iSearchLon} alt="" /><p>Không tìm thấy nguyên liệu</p>
                <small>Thử sửa hoặc xóa từ khóa để tìm nguyên liệu.</small></div>
            )}
            {hienThi.map((n) => (
              <div className={'mt-dong' + (n.manl === chon ? ' dang-chon' : '')} key={n.manl}>
                <b>{n.tennl}</b><span>{n.donvitinh}</span>
                <span className="phai">{so2(n.tonkho)}</span><b className="phai">{so2(n.muctontoithieu)}</b>
                <span className="phai">
                  {n.manl === chon ? <em className="mt-dang">Đang chọn</em>
                    : <button className="nut nut-phu mt-chon" onClick={() => chonNl(n)}>Chọn</button>}
                </span>
              </div>
            ))}
          </div>
          {ds && ds.length > 0 && <p className="kho-chan">{hienThi.length === ds.length ? `Hiển thị đủ ${ds.length} nguyên liệu` : `Hiển thị ${hienThi.length} / ${ds.length} nguyên liệu`}</p>}
        </div>

        <div className="khung mt-phai">
          {!nl ? (
            <div className="mt-goi-y">
              <h2>Chọn nguyên liệu</h2>
              <p>Chọn một nguyên liệu trong danh sách để thiết lập mức tồn tối thiểu.</p>
            </div>
          ) : (
            <>
              <h2>{nl.tennl}</h2>
              <div className="mt-hang"><span>Tồn hiện tại</span><b>{so2(nl.tonkho)} {nl.donvitinh}</b></div>
              <div className="mt-hang doc"><span>Mức tồn tối thiểu hiện tại</span><b>{so2(nl.muctontoithieu)} {nl.donvitinh}</b></div>
              <label className="mt-nhap">Mức tồn tối thiểu mới ({nl.donvitinh})
                <input className={loi ? 'loi' : ''} value={gt} inputMode="decimal" maxLength={10} placeholder="Nhập mức mới" autoFocus
                  onChange={(e) => { setGt(e.target.value); setLoi(''); setXong(false) }} onKeyDown={(e) => e.key === 'Enter' && luu()} />
              </label>
              {loi && <p className="mt-loi">ⓘ {loi}</p>}
              <p className="mt-ghi">Dùng cùng đơn vị tính với nguyên liệu. Số lượng tồn không thay đổi.</p>
              {xong && (
                <div className="mt-kq">
                  {tt === 'Đủ' ? <b>Đủ tồn · Chưa cần nhập</b>
                    : <b className="do"><img src={iLoi} alt="" />{tt} · Cần nhập hàng</b>}
                  <small>Đã tính lại cảnh báo theo mức mới {so2(nl.muctontoithieu)} {nl.donvitinh}. Tồn vẫn là {so2(nl.tonkho)} {nl.donvitinh}.</small>
                </div>
              )}
              <div className="mt-nut">
                <button className="nut nut-phu" onClick={() => { setChon(''); setXong(false) }}>Hủy</button>
                <button className="nut nut-xanh" onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu' : 'Lưu'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
