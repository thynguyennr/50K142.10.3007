import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { tien, thoiGian, TRANG_THAI } from '../lib/format'
import ThongBao from '../components/ThongBao'
import iSearch from '../assets/icons/search.svg'
import iSearchLon from '../assets/icons/search-lon.svg'
import iDot from '../assets/icons/dot.svg'
import iClock from '../assets/icons/clock.svg'
import './TaoDon.css'

import TheMon from '../components/TheMon'
import { CON_BAN, TAM_HET, DA_XOA, sizeCua } from '../lib/mon'

// "HD0010" -> "HD0011"
// Chỉ để hiển thị mã dự kiến trên tiêu đề; mã thật do sequence seq_donhang sinh khi lưu
const maTiepTheo = (maCuoi) => {
  const n = Number((maCuoi || '').replace(/\D/g, '')) || 0
  return 'HD' + String(n + 1).padStart(4, '0')
}

// Tạo đơn bán hàng (Figma 1:6970) + popup chọn món (Figma 1:7848).
// Dùng chung cho: /ban-hang/tao-don (tạo mới), /ban-hang/:madon (xem), /ban-hang/:madon?sua=1 (sửa)
export default function TaoDon() {
  const { madon: maUrl } = useParams()
  const [query] = useSearchParams()
  const nav = useNavigate()
  const { chuQuan } = useAuth()
  const taoMoi = !maUrl

  const [dsMon, setDsMon] = useState([])
  const [don, setDon] = useState(null)        // { madon, trangthai, thoigiantao }
  const [mons, setMons] = useState([])        // món đã gọi
  const [goc, setGoc] = useState([])          // món của đơn lúc mới mở (khi sửa đơn)
  const [nhom, setNhom] = useState('')
  const [tim, setTim] = useState('')
  const [popup, setPopup] = useState(null)    // { mon, kichco, soluong, ghichu, viTri }
  const [loi, setLoi] = useState('')
  const [dangLuu, setDangLuu] = useState(false)
  const [doi, setDoi] = useState(false)       // đã thay đổi chưa lưu
  const [thongBao, setThongBao] = useState('') // nội dung popup lỗi
  const [chiTietLoi, setChiTietLoi] = useState('') // nguyên nhân lỗi từ Supabase

  const choSua = taoMoi || (query.get('sua') === '1' && don?.trangthai === TRANG_THAI.CHUA)

  useEffect(() => {
    supabase.from('mon').select('mamon,tenmon,nhommon,gialynho,gialylon,trangthai').neq('trangthai', DA_XOA).order('tenmon')
      .then(({ data, error }) => (error ? setLoi(error.message) : setDsMon(data)))

    if (taoMoi) {
      supabase.from('donhang').select('madon').order('madon', { ascending: false }).limit(1)
        .then(({ data, error }) => {
          if (error) return setLoi(error.message)
          setDon({ madon: maTiepTheo(data[0]?.madon), trangthai: TRANG_THAI.CHUA, thoigiantao: new Date().toISOString() })
        })
    } else {
      supabase.from('donhang')
        .select('madon,trangthai,thoigiantao,chitietdonban(mamon,kichco,soluong,dongia,ghichu,dapheche,mon(tenmon))')
        .eq('madon', maUrl).single()
        .then(({ data, error }) => {
          if (error) return setLoi(error.message)
          setDon(data)
          const ds = data.chitietdonban.map((c) => ({
            mamon: c.mamon, tenmon: c.mon?.tenmon || c.mamon, kichco: c.kichco,
            dongia: Number(c.dongia), soluong: c.soluong, ghichu: c.ghichu || '', dapheche: c.dapheche,
          }))
          setMons(ds)
          setGoc(ds) // bản gốc để so sánh khi lưu
        })
    }
  }, [taoMoi, maUrl])

  const dsNhom = useMemo(() => [...new Set(dsMon.map((m) => m.nhommon).filter(Boolean))], [dsMon])
  const monHienThi = dsMon
    .filter((m) => !nhom || m.nhommon === nhom)
    .filter((m) => m.tenmon.toLowerCase().includes(tim.trim().toLowerCase()))
  const tong = mons.reduce((t, m) => t + m.dongia * m.soluong, 0)

  // ----- Nút gạt Còn bán / Tạm hết (cập nhật mon.trangthai) -----
  const gatTrangThai = async (m) => {
    const moi = m.trangthai === CON_BAN ? TAM_HET : CON_BAN
    const doiTT = (tt) => setDsMon((ds) => ds.map((x) => (x.mamon === m.mamon ? { ...x, trangthai: tt } : x)))
    doiTT(moi) // cập nhật giao diện ngay, lỗi thì trả lại
    // .select() để biết có dòng nào thật sự được cập nhật (RLS chặn thì trả về 0 dòng, không báo lỗi)
    const kq = await supabase.from('mon').update({ trangthai: moi }).eq('mamon', m.mamon).select('mamon')
    const error = kq.error || (kq.data?.length ? null : { message: 'Không có quyền cập nhật bảng mon (kiểm tra RLS policy UPDATE)', code: 'RLS' })
    if (error) { doiTT(m.trangthai); setChiTietLoi(`${error.message} [mã ${error.code}]`); setThongBao('Không cập nhật được trạng thái món') }
  }

  // ----- Popup chọn món -----
  const moMon = (m) => {
    if (!choSua || m.trangthai !== CON_BAN) return
    const s = sizeCua(m)
    if (!s.length) return
    setPopup({ mon: m, kichco: s[0].ten, soluong: 1, ghichu: '', viTri: null })
  }
  const moDong = (i) => {
    if (!choSua) return
    const d = mons[i]
    const m = dsMon.find((x) => x.mamon === d.mamon) || { mamon: d.mamon, tenmon: d.tenmon }
    setPopup({ mon: m, kichco: d.kichco, soluong: d.soluong, ghichu: d.ghichu, viTri: i })
  }
  const sizes = popup ? sizeCua(popup.mon) : []
  const giaPopup = sizes.find((s) => s.ten === popup?.kichco)?.gia ?? (popup?.viTri != null ? mons[popup.viTri].dongia : 0)

  // Số lượng < 1 luôn không hợp lệ
  const slKhongHopLe = popup && popup.soluong < 1

  const xacNhanPopup = () => {
    if (slKhongHopLe) return
    const { mon, kichco, soluong, ghichu, viTri } = popup
    const dong = { mamon: mon.mamon, tenmon: mon.tenmon, kichco, dongia: giaPopup, soluong, ghichu: ghichu.trim() }
    setMons((cu) => {
      const ds = [...cu]
      if (viTri != null) ds.splice(viTri, 1) // sửa = bỏ dòng cũ rồi thêm lại (số lượng 0 = xoá)
      if (soluong === 0) return ds
      // Khoá chính chitietdonban là (madon, mamon, kichco) -> cùng món + cùng size phải gộp 1 dòng,
      // ghi chú khác nhau thì nối lại
      const trung = ds.findIndex((d) => d.mamon === dong.mamon && d.kichco === dong.kichco)
      if (trung < 0) {
        if (viTri != null) ds.splice(viTri, 0, dong) // giữ nguyên vị trí khi sửa
        else ds.push(dong)
        return ds
      }
      const cu1 = ds[trung]
      const ghiChu = [...new Set([cu1.ghichu, dong.ghichu].filter(Boolean))].join('; ')
      ds[trung] = { ...cu1, soluong: cu1.soluong + soluong, ghichu: ghiChu }
      return ds
    })
    setDoi(true)
    setPopup(null)
  }

  useEffect(() => {
    if (!popup) return
    const esc = (e) => e.key === 'Escape' && setPopup(null)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [popup])

  // ----- Lưu / Hủy -----
  const huy = () => {
    if (choSua && doi && !window.confirm('Bỏ các thay đổi chưa lưu?')) return
    nav('/ban-hang')
  }

  const luu = async () => {
    if (!mons.length) return setThongBao('Vui lòng chọn ít nhất một món')
    // donhang.manguoidung bắt buộc (khoá ngoại tới chuquan)
    if (taoMoi && !chuQuan?.manguoidung) {
      setChiTietLoi('Tài khoản đang đăng nhập chưa được liên kết với dòng nào trong bảng chuquan (cột auth_id)')
      return setThongBao('Lưu đơn không thành công')
    }
    setDangLuu(true)
    // Lưu ý theo database:
    //  - chitietdonban.thanhtien là cột tự tính (generated) -> KHÔNG gửi
    //  - donhang.tongtien do trigger fn_tinh_tongtien tự cộng lại -> KHÔNG cần cập nhật
    //  - donhang.madon do sequence seq_donhang tự sinh -> KHÔNG gửi, lấy lại sau khi thêm
    //  - trigger fn_chitietdonban_truoc chặn sửa/xoá món đã pha, món tạm hết... (báo lỗi tiếng Việt)
    const dongCT = (madon, m) => ({ madon, mamon: m.mamon, kichco: m.kichco, soluong: m.soluong, dongia: m.dongia, ghichu: m.ghichu || null })
    let error, buoc
    if (taoMoi) {
      buoc = 'Thêm đơn'
      const kq = await supabase.from('donhang')
        .insert({ trangthai: TRANG_THAI.CHUA, thoigiantao: don.thoigiantao, manguoidung: chuQuan.manguoidung })
        .select('madon').single()
      error = kq.error
      if (!error) {
        const madon = kq.data.madon
        buoc = 'Thêm món'
        ;({ error } = await supabase.from('chitietdonban').insert(mons.map((m) => dongCT(madon, m))))
        if (error) await supabase.from('donhang').delete().eq('madon', madon) // hoàn tác đơn rỗng
      }
    } else {
      // Chỉ ghi phần thay đổi so với lúc mở đơn (không xoá-thêm lại, vì món đã pha không được xoá)
      const khoa = (m) => m.mamon + '|' + m.kichco
      const moi = new Map(mons.map((m) => [khoa(m), m]))
      const xoa = goc.filter((g) => !moi.has(khoa(g)))
      const them = mons.filter((m) => !goc.some((g) => khoa(g) === khoa(m)))
      const sua = mons.filter((m) => goc.some((g) => khoa(g) === khoa(m) &&
        (g.soluong !== m.soluong || g.dongia !== m.dongia || (g.ghichu || '') !== (m.ghichu || ''))))
      for (const g of xoa) {
        if (error) break
        buoc = `Xoá món ${g.tenmon}`
        ;({ error } = await supabase.from('chitietdonban').delete().match({ madon: don.madon, mamon: g.mamon, kichco: g.kichco }))
      }
      for (const m of sua) {
        if (error) break
        buoc = `Sửa món ${m.tenmon}`
        ;({ error } = await supabase.from('chitietdonban')
          .update({ soluong: m.soluong, dongia: m.dongia, ghichu: m.ghichu || null })
          .match({ madon: don.madon, mamon: m.mamon, kichco: m.kichco }))
      }
      if (!error && them.length) {
        buoc = 'Thêm món'
        ;({ error } = await supabase.from('chitietdonban').insert(them.map((m) => dongCT(don.madon, m))))
      }
    }
    setDangLuu(false)
    if (error) {
      console.error('Lưu đơn lỗi ở bước:', buoc, error)
      // Lỗi do trigger (mã P0001) đã là câu tiếng Việt dễ hiểu
      setChiTietLoi(error.code === 'P0001' ? error.message : `${buoc}: ${error.message} [mã ${error.code}]`)
      return setThongBao('Lưu đơn không thành công')
    }
    // Màn Quản lý bán hàng hiện popup "… thành công"
    nav('/ban-hang', { state: { thanhCong: taoMoi ? 'Tạo đơn thành công' : 'Cập nhật đơn thành công' } })
  }

  const tieuDe = taoMoi ? 'Tạo đơn bán hàng' : choSua ? 'Chỉnh sửa đơn hàng' : 'Chi tiết đơn hàng'

  return (
    <div className="td">
      <div className="khung td-dau">
        <div className="td-dong-tieu-de">
          <h1>{tieuDe}</h1>
          {don && <span className="td-ma">{don.madon}</span>}
          {don && <span className="td-tt"><img src={iDot} alt="" />{don.trangthai}</span>}
        </div>
        {don && <p className="td-gio"><img src={iClock} alt="" />Thời gian tạo: {thoiGian(don.thoigiantao)}</p>}
      </div>

      {loi && <p className="loi-tai">Không tải được dữ liệu: {loi}</p>}

      <div className="td-than">
        <section className="td-trai">
          <label className="td-tim">
            <img src={iSearch} alt="" />
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm theo tên ..." />
          </label>
          <div className="chip-hang td-nhom">
            <button className={'chip' + (!nhom ? ' dang-chon' : '')} onClick={() => setNhom('')}>Tất cả</button>
            {dsNhom.map((n) => (
              <button key={n} className={'chip' + (nhom === n ? ' dang-chon' : '')} onClick={() => setNhom(n)}>{n}</button>
            ))}
          </div>

          {!loi && dsMon.length > 0 && monHienThi.length === 0 ? (
            <div className="td-khong-thay">
              <img src={iSearchLon} alt="" />
              <p>Không tìm thấy món</p>
            </div>
          ) : (
            <div className="td-luoi">
              {monHienThi.map((m) => (
                <TheMon key={m.mamon} mon={m} chonDuoc={choSua && m.trangthai === CON_BAN} onChon={moMon} onGat={gatTrangThai} />
              ))}
            </div>
          )}
        </section>

        <section className="khung td-phai">
          <h2>Chi tiết món đã gọi ({mons.length})</h2>
          <div className="td-ds">
            {mons.map((m, i) => (
              <div key={i} className={'td-goi' + (choSua ? ' sua-duoc' : '')} onClick={() => moDong(i)}>
                <div className="hang">
                  <span className="ten"><b>{m.tenmon}</b><span className="tag">{m.kichco}</span></span>
                  <b className="tt">{tien(m.dongia * m.soluong)}</b>
                </div>
                <div className="hang">
                  <span className="gia">{tien(m.dongia)}</span>
                  <b className="sl">{m.soluong}</b>
                </div>
                {(m.ghichu || choSua) && <i className="ghi-chu">{m.ghichu || 'Thêm ghi chú'}</i>}
              </div>
            ))}
          </div>
          <div className="td-tong">
            <h2>Tổng tiền cần thanh toán</h2>
            <b>{tien(tong)}</b>
          </div>
          <div className="td-nut">
            <button className="nut nut-phu" onClick={huy}>{choSua ? 'Hủy' : 'Quay lại'}</button>
            {choSua && <button className="nut nut-xanh luu" onClick={luu} disabled={dangLuu || !don}>{dangLuu ? 'Đang lưu' : 'Lưu'}</button>}
          </div>
        </section>
      </div>

      {popup && (
        <div className="td-phu" onClick={() => setPopup(null)}>
          <div className="td-popup" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{popup.mon.tenmon}</h2>

            <p className="nhan">Chọn kích cỡ ly:</p>
            <div className="td-chon-size">
              {sizes.map((s) => (
                <button key={s.ten} className={popup.kichco === s.ten ? 'chon' : ''}
                  onClick={() => setPopup({ ...popup, kichco: s.ten })}>
                  <b>Size {s.ten}</b><span>{tien(s.gia)}</span>
                </button>
              ))}
            </div>

            <p className="nhan">Số lượng:</p>
            <div className="td-sl">
              <button className="tru" aria-label="Giảm"
                onClick={() => setPopup({ ...popup, soluong: Math.max(0, popup.soluong - 1) })}>-</button>
              <span>{popup.soluong}</span>
              <button className="cong" aria-label="Tăng" onClick={() => setPopup({ ...popup, soluong: popup.soluong + 1 })}>+</button>
            </div>
            {slKhongHopLe && <p className="td-loi-sl">Số lượng không hợp lệ!</p>}

            <p className="nhan">Ghi chú cho món (nếu có):</p>
            <input className="td-ghi" value={popup.ghichu} maxLength={200}
              onChange={(e) => setPopup({ ...popup, ghichu: e.target.value })}
              placeholder="Nhập ghi chú cho món (ví dụ: ít đường, ít đá...)" />

            <div className="td-popup-nut">
              <button className="nut nut-phu" onClick={() => setPopup(null)}>Hủy</button>
              <button className="nut nut-xanh" onClick={xacNhanPopup} disabled={slKhongHopLe}>
                {`${popup.viTri != null ? 'Cập nhật' : 'Thêm vào đơn'} - ${tien(giaPopup * Math.max(popup.soluong, 1))}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {thongBao && <ThongBao loai="loi" noiDung={thongBao} chiTiet={chiTietLoi}
        onDong={() => { setThongBao(''); setChiTietLoi('') }} />}
    </div>
  )
}
