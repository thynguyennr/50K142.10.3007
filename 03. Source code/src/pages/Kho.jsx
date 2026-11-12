import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TAM_HET } from '../lib/mon'
import { trangThaiTon, canNhap, sapXepKho, so2, chuanTen, taiNguyenLieu } from '../lib/kho'
import iSearch from '../assets/icons/search.svg'
import iSearchLon from '../assets/icons/search-lon.svg'
import iLoi from '../assets/icons/alert-triangle.svg'
import iKho from '../assets/icons/nav-kho.svg'
import './Kho.css'

// UC 5.3 Xem tồn kho nguyên liệu (màn chính của Kho; nút sang UC 5.1 Kiểm kê, UC 5.2 Mức tồn tối thiểu)
export default function Kho() {
  const nav = useNavigate()
  const { state } = useLocation()
  const [ds, setDs] = useState(null)
  const [monHet, setMonHet] = useState([])
  const [loi, setLoi] = useState('')
  const [loc, setLoc] = useState('tat-ca')
  const [tim, setTim] = useState('')

  useEffect(() => {
    taiNguyenLieu().then(({ data, error }) => (error ? setLoi(error.message) : setDs(data)))
    // 2c: món đang "Tạm hết" -> nhắc nhập hàng
    supabase.from('mon').select('tenmon').eq('trangthai', TAM_HET).then(({ data }) => setMonHet((data || []).map((m) => m.tenmon)))
  }, [])

  const dem = { 'tat-ca': ds?.length ?? 0, can: (ds || []).filter(canNhap).length, chua: (ds || []).filter((n) => !canNhap(n)).length }
  const q = chuanTen(tim)
  const sapXep = sapXepKho(ds || [])
  // STT giữ theo danh sách đã sắp xếp đầy đủ (ảnh thiết kế: lọc/tìm vẫn hiện STT gốc)
  const stt = new Map(sapXep.map((n, i) => [n.manl, i + 1]))
  const rong = ds && ds.length === 0
  const hienThi = sapXep
    .filter((n) => loc === 'tat-ca' || (loc === 'can' ? canNhap(n) : !canNhap(n)))
    .filter((n) => !q || chuanTen(n.tennl).includes(q))

  return (
    <div className="kho">
      <div className="khung kho-dau">
        <div>
          <h1>Quản lý kho</h1>
          <p className="kho-phu">{state?.thongDiep || 'Số lượng tồn của từng nguyên liệu, sắp xếp theo mức cần nhập hàng'}</p>
        </div>
        <div className="kho-nut-dau">
          <button className="nut nut-phu" disabled={!ds || rong} onClick={() => nav('/kho/muc-ton')}>Thiết lập mức tồn tối thiểu</button>
          <button className="nut nut-xanh" disabled={!ds || rong} onClick={() => nav('/kho/kiem-ke')}>Kiểm kê</button>
        </div>
      </div>

      {monHet.length > 0 && (
        <div className="kho-nhac">
          <img src={iLoi} alt="" />
          Nhắc nhập hàng: món {monHet.map((t) => `“${t}”`).join(', ')} đang “Tạm hết” do thiếu nguyên liệu. Vui lòng nhập hàng sớm.
        </div>
      )}

      <div className="khung kho-khung">
        <div className="kho-cong-cu">
          <div className="chip-hang">
            {[['tat-ca', 'Tất cả'], ['can', 'Cần nhập hàng'], ['chua', 'Chưa cần nhập']].map(([k, nhan]) => (
              <button key={k} className={'chip kho-chip' + (loc === k ? ' dang-chon' : '')} onClick={() => setLoc(k)}>{nhan} ({dem[k]})</button>
            ))}
          </div>
          <label className="kho-tim">
            <img src={iSearch} alt="" />
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm nguyên liệu theo tên" />
            {tim && <button className="kho-xoa-tim" onClick={() => setTim('')} aria-label="Xóa từ khóa">×</button>}
          </label>
        </div>

        <div className="kho-dong kho-tieu-de">
          <span className="giua">STT</span><span>Tên nguyên liệu</span><span className="giua">Số lượng tồn</span>
          <span className="giua">Đơn vị tính</span><span>Cảnh báo</span>
        </div>
        <div className="kho-than">
          {loi && <p className="loi-tai">Không tải được kho: {loi}</p>}
          {!ds && !loi && <p className="kho-trong">Đang tải...</p>}
          {ds && hienThi.length === 0 && (
            <div className="kho-rong"><img src={rong ? iKho : iSearchLon} alt="" className={rong ? 'nho' : ''} />
              <p>{rong ? 'Chưa có nguyên liệu trong kho' : 'Không tìm thấy nguyên liệu'}</p>
              {!rong && <small>Thử sửa hoặc xóa từ khóa để tìm nguyên liệu.</small>}</div>
          )}
          {hienThi.map((n) => {
            const tt = trangThaiTon(n.tonkho, n.muctontoithieu)
            const can = tt !== 'Đủ'
            return (
              <div className={'kho-dong ' + (can ? 'can' : 'du')} key={n.manl}>
                <span className="giua">{stt.get(n.manl)}</span>
                <b>{n.tennl}</b>
                <b className="giua">{so2(n.tonkho)}</b>
                <span className="giua">{n.donvitinh}</span>
                <span className="kho-cb">
                  {can ? <b className="do"><img src={iLoi} alt="" />Cần nhập hàng</b> : <b>Chưa cần nhập</b>}
                  <small>{tt === 'Hết' ? 'Hết tồn' : tt === 'Sắp hết' ? 'Sắp hết' : 'Đủ tồn'}</small>
                </span>
              </div>
            )
          })}
        </div>
        {ds && (
          <p className="kho-chan">Hiển thị {hienThi.length} / {ds.length} nguyên liệu.{rong ? '' : ' Cần nhập hàng lên đầu (Hết tồn → Sắp hết → Đủ tồn); cùng trạng thái xếp theo tên.'}</p>
        )}
      </div>
    </div>
  )
}
