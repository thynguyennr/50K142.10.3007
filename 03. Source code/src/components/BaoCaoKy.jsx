import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { tien, TRANG_THAI } from '../lib/format'
import iLoi from '../assets/icons/alert-triangle.svg'
import iCot from '../assets/icons/nav-bao-cao.svg'
import './BaoCaoKy.css'

// Dùng chung cho UC 7.1 Báo cáo doanh thu (loai="bao-cao") và UC 7.2 Thống kê món bán chạy (loai="thong-ke").
// Chỉ tính đơn "Đã thanh toán" theo thoigianthanhtoan (BR7.1_01, BR7.2_02).
const KY = [['ngay', 'Ngày'], ['thang', 'Tháng'], ['khoang', 'Khoảng thời gian']]
const hai = (x) => String(x).padStart(2, '0')
const dmy = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}` }

export default function BaoCaoKy({ loai }) {
  const tk = loai === 'thong-ke'
  const tu = tk ? 'thống kê' : 'báo cáo'
  const [ky, setKy] = useState('ngay')
  const [ngay, setNgay] = useState('')
  const [thang, setThang] = useState('')
  const [tuNgay, setTuNgay] = useState('')
  const [denNgay, setDenNgay] = useState('')
  const [loi, setLoi] = useState('')           // dòng giải thích lỗi kỳ
  const [kq, setKq] = useState(null)           // null | { nhan, ds, tong, ly } | { rong: nhan }
  const [loiTai, setLoiTai] = useState('')
  const [dangTai, setDangTai] = useState(false)

  const doiKy = (k) => { setKy(k); setLoi(''); setKq(null) }

  const xem = async () => {
    // 5a: chưa chọn kỳ hoặc ngày kết thúc < ngày bắt đầu
    let bd, kt, nhan
    if (ky === 'ngay') {
      if (!ngay) return baoLoi('Vui lòng chọn thời gian trước khi xem kết quả.')
      bd = new Date(ngay + 'T00:00:00'); kt = new Date(bd); kt.setDate(kt.getDate() + 1); nhan = `ngày ${dmy(ngay)}`
    } else if (ky === 'thang') {
      if (!thang) return baoLoi('Vui lòng chọn thời gian trước khi xem kết quả.')
      const [y, m] = thang.split('-').map(Number)
      bd = new Date(y, m - 1, 1); kt = new Date(y, m, 1); nhan = `tháng ${hai(m)}/${y}`
    } else {
      if (!tuNgay || !denNgay) return baoLoi('Vui lòng chọn thời gian trước khi xem kết quả.')
      if (denNgay < tuNgay) return baoLoi('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu. Vui lòng chọn lại khoảng thời gian.')
      bd = new Date(tuNgay + 'T00:00:00'); kt = new Date(denNgay + 'T00:00:00'); kt.setDate(kt.getDate() + 1)
      nhan = `từ ${dmy(tuNgay)} đến ${dmy(denNgay)}`
    }
    setLoi(''); setLoiTai(''); setDangTai(true)
    const { data, error } = await supabase.from('donhang')
      .select('tongtien,chitietdonban(mamon,soluong,thanhtien,dongia,mon(tenmon,nhommon))')
      .eq('trangthai', TRANG_THAI.DA).gte('thoigianthanhtoan', bd.toISOString()).lt('thoigianthanhtoan', kt.toISOString())
    setDangTai(false)
    if (error) return setLoiTai(error.message)
    if (!data.length) return setKq({ rong: nhan })

    const theoMon = new Map()
    for (const d of data) for (const c of d.chitietdonban || []) {
      const m = theoMon.get(c.mamon) || { ten: c.mon?.tenmon || c.mamon, nhom: c.mon?.nhommon || '', sl: 0, dt: 0 }
      m.sl += Number(c.soluong); m.dt += Number(c.thanhtien ?? c.dongia * c.soluong)
      theoMon.set(c.mamon, m)
    }
    const ds = [...theoMon.values()]
      .sort(tk ? (a, b) => b.sl - a.sl || b.dt - a.dt : (a, b) => b.dt - a.dt || b.sl - a.sl)
    // Xếp hạng đồng hạng theo số lượng (thống kê) / theo doanh thu (báo cáo)
    ds.forEach((m, i) => { const truoc = ds[i - 1]; m.hang = truoc && (tk ? truoc.sl === m.sl : truoc.dt === m.dt) ? truoc.hang : i + 1 })
    const tong = data.reduce((t, d) => t + Number(d.tongtien), 0)
    setKq({ nhan, ds, tong, ly: ds.reduce((t, m) => t + m.sl, 0) })
  }
  const baoLoi = (s) => { setLoi(s); setKq(null) }

  const coLoi = Boolean(loi)
  const o = (v, set, kieu = 'date') => (
    <input type={kieu} className={coLoi && !v ? 'loi' : coLoi && ky === 'khoang' ? 'loi' : ''} value={v}
      onChange={(e) => { set(e.target.value); setLoi('') }} />
  )

  return (
    <div className="bck">
      <div className="khung bck-dau">
        <h1>{tk ? 'Thống kê món bán chạy' : 'Báo cáo doanh thu'}</h1>
        <p>{tk ? 'Xem số lượng bán và doanh thu từng món. Chỉ tính các đơn đã thanh toán trong kỳ.'
          : 'Xem doanh thu theo ngày, tháng hoặc khoảng thời gian. Chỉ tính các đơn đã thanh toán.'}</p>
      </div>

      <div className="khung bck-loc">
        <div className="bck-hang">
          <label>Kỳ {tu}
            <span className="bck-ky">
              {KY.map(([k, n]) => <button key={k} type="button" className={ky === k ? 'chon' : ''} onClick={() => doiKy(k)}>{n}</button>)}
            </span>
          </label>
          {ky === 'ngay' && <label>Chọn ngày{o(ngay, setNgay)}</label>}
          {ky === 'thang' && <label>Chọn tháng{o(thang, setThang, 'month')}</label>}
          {ky === 'khoang' && <><label>Từ ngày{o(tuNgay, setTuNgay)}</label><label>Đến ngày{o(denNgay, setDenNgay)}</label></>}
          <button className="nut nut-xanh bck-xem" onClick={xem} disabled={dangTai}>{dangTai ? 'Đang tải...' : `Xem ${tu}`}</button>
        </div>
        {coLoi && (
          <>
            <div className="bck-loi"><img src={iLoi} alt="" />Kỳ {tu} không hợp lệ</div>
            <p className="bck-loi-phu">{loi}</p>
          </>
        )}
      </div>

      {loiTai && <p className="loi-tai">Không tải được dữ liệu: {loiTai}</p>}

      {!kq || kq.rong ? (
        <div className="khung bck-rong">
          <img src={iCot} alt="" />
          {kq?.rong ? (
            <><b>Không có dữ liệu trong kỳ đã chọn</b><p>Chưa có đơn đã thanh toán trong {kq.rong}. Vui lòng chọn kỳ khác.</p></>
          ) : (
            <><b>Chưa có {tu}</b><p>Chọn kỳ {tu} hợp lệ và thời gian, rồi bấm “Xem {tu}”.</p></>
          )}
        </div>
      ) : (
        <div className="bck-kq">
          <div className="bck-tong">
            <div>
              <small>{tk ? 'Thống kê bán hàng' : 'Tổng doanh thu'} · {kq.nhan.charAt(0).toUpperCase() + kq.nhan.slice(1)}</small>
              <b>{tien(kq.tong)}</b>
            </div>
            <div className="phai">
              <b className={tk ? 'to' : ''}>{kq.ly} ly · {kq.ds.length} món</b>
              <small>Chỉ tính các đơn đã thanh toán trong kỳ</small>
            </div>
          </div>

          <div className="khung bck-ds">
            <div className="bck-ds-dau">
              <h2>{tk ? 'Món bán theo số lượng' : 'Doanh thu từng món'}</h2>
              <small>{tk ? 'Số lượng bán giảm dần · Đơn vị: ly' : 'Độ dài thanh theo doanh thu từng món'}</small>
            </div>
            <div className="bck-than">
              {kq.ds.map((m, i) => {
                const max = tk ? kq.ds[0].sl : kq.ds[0].dt
                const pt = ((tk ? m.sl : m.dt) / (max || 1)) * 100
                const hangCuoi = kq.ds[kq.ds.length - 1].hang
                const dong = kq.ds.filter((x) => x.hang === m.hang).length > 1
                let phu = <span>{m.nhom}</span>
                if (tk) {
                  if (m.hang === 1 && kq.ds.length > 1) phu = <span className="xanh">Bán chạy · Nhiều nhất</span>
                  else if (m.hang === hangCuoi && kq.ds.length > 1) phu = <span className="do">Bán chậm · Ít nhất</span>
                  else if (dong) phu = <span>Đồng hạng {m.hang} · {m.sl} ly</span>
                }
                return (
                  <div className="bck-mon" key={m.ten + i}>
                    <span className="bck-hang-so">{m.hang}</span>
                    <span className="bck-ten"><b>{m.ten}</b>{phu}</span>
                    <span className="bck-thanh"><i style={{ width: `${Math.max(pt, 2)}%` }} /></span>
                    <span className="bck-so">
                      {tk ? <><b>{m.sl} ly</b><small>{tien(m.dt)}</small></>
                        : <><b>{tien(m.dt)}</b><small>{(m.dt / (kq.tong || 1) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}% tổng doanh thu</small></>}
                    </span>
                  </div>
                )
              })}
            </div>
            {tk && (() => {
              const nhom = Object.values(kq.ds.reduce((a, m) => ((a[m.hang] ||= []).push(m), a), {})).filter((g) => g.length > 1)
              return nhom.length ? (
                <p className="bck-ghi">{nhom.map((g) => `${g.map((m) => m.ten).join(' và ')} cùng bán ${g[0].sl} ly, đồng hạng ${g[0].hang}`).join('; ')}. Xếp hạng theo số lượng, không theo doanh thu.</p>
              ) : null
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
