import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { tien, thoiGian, TRANG_THAI } from '../lib/format'
import { CON_BAN, DA_XOA, sizeCua } from '../lib/mon'
import ThongBao from '../components/ThongBao'
import XacNhan from '../components/XacNhan'
import TheMon from '../components/TheMon'
import iDot from '../assets/icons/dot.svg'
import iClock from '../assets/icons/clock.svg'
import iList from '../assets/icons/list.svg'
import iRac from '../assets/icons/thung-rac.svg'
import iSearch from '../assets/icons/search.svg'
import './TaoDon.css'
import './ThanhToan.css'
import './SuaDon.css'

const khoa = (m) => m.mamon + '|' + m.kichco // khoá chính chitietdonban: (madon, mamon, kichco)
const moTaLoi = (e) => (e.code === 'P0001' ? e.message : `${e.message} [mã ${e.code}]`)

// UC 2.2 Chỉnh sửa đơn bán hàng – màn hình 6.3.7
// Mỗi món có trạng thái pha: 'da' (đã pha, khoá) | 'chua' (chưa pha, được sửa) | undefined (chưa hỏi)
export default function SuaDon() {
  const { madon } = useParams()
  const nav = useNavigate()
  const [don, setDon] = useState(null)
  const [mons, setMons] = useState([])
  const [goc, setGoc] = useState([])           // món lúc mở đơn, để so sánh khi lưu
  const [dsMon, setDsMon] = useState([])       // thực đơn cho popup Thêm món
  const [loiTai, setLoiTai] = useState('')
  const [hoiPha, setHoiPha] = useState(null)   // { i, viec } – hỏi "Món này đã pha chưa ?"
  const [hoiXoa, setHoiXoa] = useState(null)   // chỉ số món cần hỏi "Bạn muốn xóa món này ?"
  const [hoiHuyDon, setHoiHuyDon] = useState(false)
  const [moThem, setMoThem] = useState(false)
  const [thanhCong, setThanhCong] = useState(null) // { noiDung, sauDong }
  const [loi, setLoi] = useState(null)             // { noiDung, chiTiet }
  const [dangLuu, setDangLuu] = useState(false)

  useEffect(() => {
    supabase.from('donhang')
      .select('madon,trangthai,thoigiantao,chitietdonban(mamon,kichco,soluong,dongia,ghichu,dapheche,mon(tenmon))')
      .eq('madon', madon).single()
      .then(({ data, error }) => {
        if (error) return setLoiTai(error.message)
        setDon(data)
        const ds = data.chitietdonban.map((c) => ({
          mamon: c.mamon, tenmon: c.mon?.tenmon || c.mamon, kichco: c.kichco, dongia: Number(c.dongia),
          soluong: c.soluong, ghichu: c.ghichu || '', dapheche: c.dapheche, pha: c.dapheche ? 'da' : undefined,
        }))
        setMons(ds)
        setGoc(ds)
      })
    supabase.from('mon').select('mamon,tenmon,nhommon,gialynho,gialylon,trangthai').neq('trangthai', DA_XOA).order('tenmon')
      .then(({ data }) => setDsMon(data || []))
  }, [madon])

  const tong = mons.reduce((t, m) => t + m.dongia * m.soluong, 0)
  const soMon = mons.reduce((t, m) => t + m.soluong, 0)
  const capNhat = (i, thayDoi) => setMons((ds) => ds.map((m, j) => (j === i ? { ...m, ...thayDoi } : m)))

  // Mọi thao tác trên một món phải qua bước hỏi "đã pha chưa" (BR2.2_01)
  const thaoTac = (i, viec) => {
    const m = mons[i]
    if (m.pha === 'da') return
    if (m.pha === 'chua') return viec?.()
    setHoiPha({ i, viec })
  }
  const doiSoLuong = (i, buoc) => thaoTac(i, () => {
    const sl = mons[i].soluong + buoc
    if (sl < 1) setHoiXoa(i)          // 8a: số lượng < 1 -> như xoá món
    else capNhat(i, { soluong: sl })
  })

  const themMon = (dong) => {
    const i = mons.findIndex((m) => khoa(m) === khoa(dong))
    if (i >= 0 && mons[i].pha === 'da') {
      return setLoi({ noiDung: 'Không thể thêm món', chiTiet: `${dong.tenmon} size ${dong.kichco} đã pha, hãy chọn size khác.` })
    }
    if (i >= 0) {
      const ghiChu = [...new Set([mons[i].ghichu, dong.ghichu].filter(Boolean))].join('; ')
      capNhat(i, { soluong: mons[i].soluong + dong.soluong, ghichu: ghiChu })
    } else {
      setMons((ds) => [...ds, { ...dong, pha: 'chua' }]) // món mới thêm chắc chắn chưa pha
    }
    setMoThem(false)
    setThanhCong({ noiDung: 'Thêm món thành công' })
  }

  const luu = async () => {
    if (!mons.length) return setHoiHuyDon(true) // 9a
    setDangLuu(true)
    const theoKhoa = new Map(goc.map((g) => [khoa(g), g]))
    const conLai = new Set(mons.map(khoa))
    let error
    // Xoá món bị bỏ
    for (const g of goc.filter((g) => !conLai.has(khoa(g)))) {
      ;({ error } = await supabase.from('chitietdonban').delete().match({ madon, mamon: g.mamon, kichco: g.kichco }))
      if (error) break
    }
    // Sửa món cũ: số lượng / ghi chú / đánh dấu đã pha
    for (const m of mons) {
      if (error) break
      const g = theoKhoa.get(khoa(m))
      if (!g) continue
      const thayDoi = {}
      if (g.soluong !== m.soluong) thayDoi.soluong = m.soluong
      if ((g.ghichu || '') !== (m.ghichu || '')) thayDoi.ghichu = m.ghichu || null
      if (m.pha === 'da' && !g.dapheche) thayDoi.dapheche = true
      if (Object.keys(thayDoi).length) {
        ;({ error } = await supabase.from('chitietdonban').update(thayDoi).match({ madon, mamon: m.mamon, kichco: m.kichco }))
      }
    }
    // Thêm món mới (thành tiền / tổng tiền do database tự tính)
    const moi = mons.filter((m) => !theoKhoa.has(khoa(m)))
    if (!error && moi.length) {
      ;({ error } = await supabase.from('chitietdonban').insert(moi.map((m) => ({
        madon, mamon: m.mamon, kichco: m.kichco, soluong: m.soluong, dongia: m.dongia, ghichu: m.ghichu || null,
      }))))
    }
    setDangLuu(false)
    if (error) return setLoi({ noiDung: 'Cập nhật đơn không thành công', chiTiet: moTaLoi(error) })
    setThanhCong({ noiDung: 'Cập nhật đơn thành công', sauDong: () => nav('/ban-hang') })
  }

  // 9a.2: đơn không còn món -> xoá các món cũ rồi chuyển đơn sang "Đã hủy"
  const huyDon = async () => {
    setHoiHuyDon(false)
    setDangLuu(true)
    let error
    for (const g of goc) {
      ;({ error } = await supabase.from('chitietdonban').delete().match({ madon, mamon: g.mamon, kichco: g.kichco }))
      if (error) break
    }
    if (!error) {
      const kq = await supabase.from('donhang').update({ trangthai: TRANG_THAI.HUY })
        .eq('madon', madon).eq('trangthai', TRANG_THAI.CHUA).select('madon').single()
      error = kq.error
    }
    setDangLuu(false)
    if (error) return setLoi({ noiDung: 'Không hủy được đơn', chiTiet: moTaLoi(error) })
    nav('/ban-hang', { state: { thanhCong: `Đơn ${madon} đã chuyển sang trạng thái Đã hủy` } })
  }

  if (loiTai) return <p className="loi-tai">Không tải được đơn hàng: {loiTai}</p>
  if (!don) return <p>Đang tải...</p>
  if (don.trangthai !== TRANG_THAI.CHUA) {
    return (
      <div className="sd">
        <p className="loi-tai">Đơn {don.madon} đang ở trạng thái "{don.trangthai}", không thể chỉnh sửa (BR2.3_04).</p>
        <button className="nut nut-phu sd-nut-don" onClick={() => nav('/ban-hang')}>Quay lại</button>
      </div>
    )
  }

  return (
    <div className="sd">
      <div className="khung td-dau">
        <div className="td-dong-tieu-de">
          <h1>Chỉnh sửa đơn bán hàng</h1>
          <span className="td-ma">{don.madon}</span>
          <span className="td-tt"><img src={iDot} alt="" />{don.trangthai}</span>
        </div>
        <p className="td-gio"><img src={iClock} alt="" />Thời gian tạo: {thoiGian(don.thoigiantao)}</p>
      </div>

      <div className="sd-dau-bang">
        <h2 className="tt-tieu-de"><img src={iList} alt="" />Danh sách món đã gọi ({soMon})</h2>
        <button className="nut nut-xanh sd-them" onClick={() => setMoThem(true)}>Thêm món</button>
      </div>

      <div className="tt-bang sd-bang">
        <div className="tt-dong tt-dau">
          <span>Món</span><span className="giua">Size</span><span className="giua">SL</span>
          <span className="giua">Đơn giá</span><span className="phai">Thành tiền</span><span className="giua">Xóa</span>
        </div>
        <div className="tt-than-bang">
          {mons.length === 0 && <p className="sd-trong">Đơn chưa có món nào. Bấm "Thêm món" để thêm.</p>}
          {mons.map((m, i) => {
            const khoaSua = m.pha === 'da'
            return (
              <div className={'tt-dong sd-dong' + (khoaSua ? ' khoa' : '')} key={khoa(m)} onClick={() => thaoTac(i)}>
                <span className="ten">
                  <b>{m.tenmon}</b>
                  {m.ghichu && <i>{m.ghichu}</i>}
                  {m.pha === 'da' && <em className="sd-da-pha">Món đã pha, không thể chỉnh sửa!</em>}
                  {m.pha === 'chua' && <em className="sd-chua-pha">Món chưa pha</em>}
                </span>
                <span className="giua"><span className="tt-size">{m.kichco}</span></span>
                <span className="giua sd-sl" onClick={(e) => e.stopPropagation()}>
                  <button disabled={khoaSua} aria-label="Giảm" onClick={() => doiSoLuong(i, -1)}>-</button>
                  <b>{m.soluong}</b>
                  <button disabled={khoaSua} aria-label="Tăng" onClick={() => doiSoLuong(i, 1)}>+</button>
                </span>
                <span className="giua">{tien(m.dongia)}</span>
                <span className="phai dam">{tien(m.dongia * m.soluong)}</span>
                <span className="giua">
                  <button className="sd-xoa" disabled={khoaSua} aria-label={`Xóa ${m.tenmon}`}
                    onClick={(e) => { e.stopPropagation(); thaoTac(i, () => setHoiXoa(i)) }}>
                    <img src={iRac} alt="" />
                  </button>
                </span>
              </div>
            )
          })}
        </div>
        <div className="tt-dong tt-tong"><span>Tổng tiền đơn hàng sau khi sửa:</span><span className="phai">{tien(tong)}</span></div>
      </div>

      <div className="sd-nut">
        <button className="nut nut-phu" onClick={() => nav('/ban-hang')}>Hủy</button>
        <button className="nut nut-xanh" onClick={luu} disabled={dangLuu}>{dangLuu ? 'Đang lưu...' : 'Lưu'}</button>
      </div>

      {hoiPha && (
        <XacNhan cauHoi="Món này đã pha chưa ?" nutTrai="Đã pha" nutPhai="Chưa pha"
          onDong={() => setHoiPha(null)}
          onTrai={() => { capNhat(hoiPha.i, { pha: 'da' }); setHoiPha(null) }}
          onPhai={() => { const { i, viec } = hoiPha; capNhat(i, { pha: 'chua' }); setHoiPha(null); viec?.() }} />
      )}
      {hoiXoa != null && (
        <XacNhan cauHoi="Bạn muốn xóa món này ?" nutTrai="Không" nutPhai="Xóa món"
          onTrai={() => setHoiXoa(null)}
          onPhai={() => { setMons((ds) => ds.filter((_, j) => j !== hoiXoa)); setHoiXoa(null) }} />
      )}
      {hoiHuyDon && (
        <XacNhan cauHoi="Đơn không còn món nào, đơn sẽ chuyển sang trạng thái Đã hủy. Bạn có chắc chắn?"
          nutTrai="Không" nutPhai="Xác nhận" onTrai={() => setHoiHuyDon(false)} onPhai={huyDon} />
      )}
      {moThem && <ThemMon madon={don.madon} dsMon={dsMon} onHuy={() => setMoThem(false)} onThem={themMon} />}
      {thanhCong && (
        <ThongBao loai="thanh-cong" noiDung={thanhCong.noiDung}
          onDong={() => { const sau = thanhCong.sauDong; setThanhCong(null); sau?.() }} />
      )}
      {loi && <ThongBao loai="loi" noiDung={loi.noiDung} chiTiet={loi.chiTiet} onDong={() => setLoi(null)} />}
    </div>
  )
}

/* ---------- Popup "Thêm món vào đơn" (Figma: lưới món bên trái, món đang chọn bên phải) ---------- */
function ThemMon({ madon, dsMon, onHuy, onThem }) {
  const [tim, setTim] = useState('')
  const [chon, setChon] = useState(null) // { mon, kichco, soluong, ghichu }

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onHuy()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onHuy])

  const loc = dsMon.filter((m) => m.tenmon.toLowerCase().includes(tim.trim().toLowerCase()))
  const sizes = chon ? sizeCua(chon.mon) : []
  const gia = sizes.find((s) => s.ten === chon?.kichco)?.gia ?? 0
  const slSai = chon && chon.soluong < 1

  const chonMon = (m) => {
    const s = sizeCua(m)
    if (s.length) setChon({ mon: m, kichco: s[0].ten, soluong: 1, ghichu: '' })
  }
  const them = () => {
    if (!chon || slSai) return
    onThem({ mamon: chon.mon.mamon, tenmon: chon.mon.tenmon, kichco: chon.kichco, dongia: gia,
      soluong: chon.soluong, ghichu: chon.ghichu.trim() })
  }

  return (
    <div className="td-phu" onClick={onHuy}>
      <div className="tm-hop" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Thêm món vào đơn {madon}</h2>
        <div className="tm-than">
          <section className="tm-trai">
            <label className="td-tim tm-tim">
              <img src={iSearch} alt="" />
              <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm tên món trong thực đơn..." autoFocus />
            </label>
            <div className="tm-luoi">
              {loc.map((m) => (
                <TheMon key={m.mamon} mon={m} chonDuoc={m.trangthai === CON_BAN} dangChon={chon?.mon.mamon === m.mamon} onChon={chonMon} />
              ))}
              {loc.length === 0 && <p className="sd-trong">Không tìm thấy món</p>}
            </div>
          </section>

          <section className="tm-phai">
            {!chon ? (
              <p className="tm-goi-y">Chọn một món ở bên trái để thêm vào đơn.</p>
            ) : (
              <>
                <small className="tm-nho">Món đang chọn</small>
                <b className="tm-ten">{chon.mon.tenmon}</b>
                <p className="nhan">Chọn kích cỡ ly</p>
                <div className="td-chon-size">
                  {sizes.map((s) => (
                    <button key={s.ten} className={chon.kichco === s.ten ? 'chon' : ''} onClick={() => setChon({ ...chon, kichco: s.ten })}>
                      <b>Size {s.ten.toLowerCase()}</b><span>{tien(s.gia)}</span>
                    </button>
                  ))}
                </div>
                <p className="nhan">Số lượng</p>
                <div className="td-sl">
                  <button className="tru" aria-label="Giảm" onClick={() => setChon({ ...chon, soluong: Math.max(0, chon.soluong - 1) })}>-</button>
                  <span>{chon.soluong}</span>
                  <button className="cong" aria-label="Tăng" onClick={() => setChon({ ...chon, soluong: chon.soluong + 1 })}>+</button>
                </div>
                {slSai && <p className="td-loi-sl">Số lượng không hợp lệ!</p>}
                <p className="nhan">Ghi chú cho món (nếu có)</p>
                <input className="td-ghi" value={chon.ghichu} maxLength={200} onChange={(e) => setChon({ ...chon, ghichu: e.target.value })}
                  placeholder="Nhập ghi chú cho món (ví dụ: ít đường, ít đá...)" />
              </>
            )}
            <div className="td-popup-nut tm-nut">
              <button className="nut nut-phu" onClick={onHuy}>Hủy</button>
              <button className="nut nut-xanh" onClick={them} disabled={!chon || slSai}>
                Thêm vào đơn{chon ? ` - ${tien(gia * Math.max(chon.soluong, 1))}` : ''}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
