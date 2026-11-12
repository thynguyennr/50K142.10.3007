import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { YC, TIEN_MAT, CHUYEN_KHOAN, ngay, homNay, docSo, soGon, nenAnh, moTaLoi } from '../lib/nhapHang'
import ThongBao from '../components/ThongBao'
import iLoi from '../assets/icons/alert-triangle.svg'
import iXong from '../assets/icons/check-circle.svg'
import './NhapHang.css'

const CHON_YC = `mayc,trangthai,thoigianlap,nhacungcap(tenncc),
  chitietyeucau(manl,soluongcan,nguyenlieu(tennl,donvitinh))`

// UC 4.2 Nhập hàng: xác nhận đặt hàng / hủy -> nhập số lượng thực nhận -> thanh toán -> lưu phiếu nhập
export default function XuLyNhapHang() {
  const [cho, setCho] = useState(null)       // yêu cầu "Chờ báo giá"
  const [daDat, setDaDat] = useState([])     // yêu cầu "Đã đặt hàng" chờ nhận hàng
  const [loiTai, setLoiTai] = useState('')
  const [chon, setChon] = useState('')       // mã yêu cầu đang chọn ở bảng chờ
  const [banner, setBanner] = useState('')
  const [maNhan, setMaNhan] = useState('')   // yêu cầu đang nhận hàng
  const [nhanTheoYc, setNhanTheoYc] = useState({}) // mayc -> manl -> { sl }
  const [maPnDuKien, setMaPnDuKien] = useState('')
  const [ht, setHt] = useState(CHUYEN_KHOAN)
  const [anhTheoYc, setAnhTheoYc] = useState({})   // mayc -> data URL ảnh biên lai
  const [dangGui, setDangGui] = useState(false)
  const [thongBao, setThongBao] = useState(null)
  const fileRef = useRef(null)

  const tai = () => Promise.all([
    supabase.from('yeucaunhap').select(CHON_YC).eq('trangthai', YC.CHO_BAO_GIA).order('mayc', { ascending: false }),
    supabase.from('yeucaunhap').select(CHON_YC).eq('trangthai', YC.DA_DAT).order('mayc'),
    supabase.from('phieunhap').select('mapn').order('mapn', { ascending: false }).limit(1),
  ]).then(([a, b, c]) => {
    const e = a.error || b.error || c.error
    if (e) return setLoiTai(e.message)
    setCho(a.data); setDaDat(b.data)
    const n = Number((c.data[0]?.mapn || '').replace(/\D/g, '')) || 0
    setMaPnDuKien('PN' + String(n + 1).padStart(3, '0'))
    setMaNhan((cu) => (b.data.some((y) => y.mayc === cu) ? cu : b.data[0]?.mayc || ''))
  })
  useEffect(() => { tai() }, [])
  useEffect(() => { if (!banner) return; const t = setTimeout(() => setBanner(''), 6000); return () => clearTimeout(t) }, [banner])

  const doiTrangThai = async (moi) => {
    if (!chon) return setThongBao({ loai: 'loi', noiDung: 'Chưa chọn yêu cầu nhập hàng' })
    const kq = await supabase.from('yeucaunhap').update({ trangthai: moi })
      .eq('mayc', chon).eq('trangthai', YC.CHO_BAO_GIA).select('mayc')
    if (kq.error || !kq.data?.length) {
      return setThongBao({ loai: 'loi', noiDung: 'Không cập nhật được yêu cầu', chiTiet: kq.error ? moTaLoi(kq.error) : 'Yêu cầu không còn ở trạng thái "Chờ báo giá"' })
    }
    const ma = chon
    setChon('')
    await tai()
    if (moi === YC.DA_HUY) setThongBao({ loai: 'thanh-cong', noiDung: 'Đã hủy yêu cầu' })
    else { setBanner(`${ma} đã xác nhận đặt hàng thành công`); setMaNhan(ma) }
  }

  // ----- Phần nhận hàng -----
  const yc = daDat.find((y) => y.mayc === maNhan)
  // Số liệu nhập + ảnh biên lai được lưu riêng cho từng yêu cầu
  const nhan = nhanTheoYc[maNhan] || {}
  const setNhan = (fn) => setNhanTheoYc((x) => ({ ...x, [maNhan]: fn(x[maNhan] || {}) }))
  const anh = anhTheoYc[maNhan] || ''
  const setAnh = (v) => setAnhTheoYc((x) => ({ ...x, [maNhan]: v }))
  const ketQua = (c) => {
    const s = docSo(nhan[c.manl]?.sl)
    if (s == null) return null
    if (Number.isNaN(s) || s < 0) return 'sai'
    return s === Number(c.soluongcan) ? 'khop' : s < Number(c.soluongcan) ? 'thieu' : 'sai'
  }

  const chonAnh = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try { setAnh(await nenAnh(f)) } catch (err) { setThongBao({ loai: 'loi', noiDung: err.message }) }
  }

  const xacNhanThanhToan = async () => {
    if (!yc) return setThongBao({ loai: 'loi', noiDung: 'Chưa có yêu cầu nào đã đặt hàng' })
    const ct = yc.chitietyeucau
    // 7a: thực nhận phải khớp yêu cầu
    if (ct.some((c) => ketQua(c) !== 'khop')) return setThongBao({ loai: 'loi', noiDung: 'Hàng chưa đủ hoặc chưa đúng' })
    // 8b là luồng thay thế: ảnh biên lai không bắt buộc
    setDangGui(true)
    // Mã phiếu do database tự sinh. Trigger trg_nhap_kho tự cộng tồn kho khi thêm chitietnhap (BR4.2_04),
    // trigger trg_hoantat_yeucau chuyển yêu cầu sang "Đã nhập hàng".
    const kq = await supabase.from('phieunhap')
      .insert({ mayc: yc.mayc, ngaynhap: homNay(), hinhthucthanhtoan: ht, anhbienlai: ht === CHUYEN_KHOAN && anh ? anh : null })
      .select('mapn').single()
    let error = kq.error
    if (!error) {
      const mapn = kq.data.mapn
      ;({ error } = await supabase.from('chitietnhap').insert(ct.map((c) => ({
        mapn, manl: c.manl, soluongthucnhan: docSo(nhan[c.manl].sl),
      }))))
      if (error) { // hoàn tác phiếu rỗng
        await supabase.from('phieunhap').delete().eq('mapn', mapn)
        await supabase.from('yeucaunhap').update({ trangthai: YC.DA_DAT }).eq('mayc', yc.mayc)
      }
    }
    setDangGui(false)
    if (error) return setThongBao({ loai: 'loi', noiDung: 'Nhập hàng không thành công', chiTiet: moTaLoi(error) })
    // Đảm bảo yêu cầu chuyển "Đã nhập hàng" (nếu trigger chưa làm)
    await supabase.from('yeucaunhap').update({ trangthai: YC.DA_NHAP }).eq('mayc', yc.mayc).eq('trangthai', YC.DA_DAT)
    await tai()
    setThongBao({ loai: 'thanh-cong', noiDung: 'Nhập hàng thành công' })
  }

  if (loiTai) return <p className="loi-tai">Không tải được dữ liệu nhập hàng: {loiTai}</p>

  return (
    <div className="nh">
      <div className="khung dau-trang">
        <h1>Nhập hàng</h1>
      </div>

      {/* ----- Yêu cầu đang chờ ----- */}
      <section className="khung xl-khung">
        <h2>Yêu cầu nhập hàng đang chờ</h2>
        <div className="xl-dong xl-dau">
          <span className="giua">STT</span><span>Mã yêu cầu</span><span>Nhà cung cấp</span><span>Nguyên liệu</span><span>Số lượng</span><span className="giua">Trạng thái</span>
        </div>
        {!cho && <p className="nh-trong">Đang tải...</p>}
        {cho && cho.length === 0 && <p className="nh-trong">Không có yêu cầu nào đang chờ báo giá.</p>}
        {(cho || []).map((y, i) => (
          <div key={y.mayc} className={'xl-dong xl-chon' + (chon === y.mayc ? ' dang-chon' : '')}
            role="button" tabIndex={0} onClick={() => setChon(chon === y.mayc ? '' : y.mayc)}
            onKeyDown={(e) => e.key === 'Enter' && setChon(y.mayc)}>
            <span className="giua">{i + 1}</span>
            <b>{y.mayc}</b>
            <span>{y.nhacungcap?.tenncc}</span>
            <span className="cot-doc">{y.chitietyeucau.map((c) => <span key={c.manl}>{c.nguyenlieu?.tennl}</span>)}</span>
            <span className="cot-doc">{y.chitietyeucau.map((c) => <span key={c.manl}>{soGon(c.soluongcan)} {c.nguyenlieu?.donvitinh}</span>)}</span>
            <span className="giua"><span className="xl-tt">{y.trangthai}</span></span>
          </div>
        ))}
        <div className="xl-chan">
          {banner ? <p className="xl-banner"><img src={iXong} alt="" />{banner}</p> : <span className="xl-goi-y">{cho?.length ? 'Bấm vào một dòng để chọn yêu cầu.' : ''}</span>}
          <div className="xl-nut">
            <button className="nut nut-phu" disabled={!chon} onClick={() => doiTrangThai(YC.DA_HUY)}>Hủy yêu cầu</button>
            <button className="nut nut-xanh" disabled={!chon} onClick={() => doiTrangThai(YC.DA_DAT)}>Xác nhận đặt hàng</button>
          </div>
        </div>
      </section>

      {/* ----- Số lượng thực nhận ----- */}
      <section className="khung xl-khung xl-nhan">
        <div className="xl-nhan-dau">
          <h2>Số lượng thực nhận</h2>
          {yc && (
            <div className="xl-the">
              <span><small>Mã phiếu</small><b>{maPnDuKien}</b></span>
              <span><small>Ngày nhập</small><b>{ngay(homNay())}</b></span>
              <span><small>Nhà cung cấp</small><b>{yc.nhacungcap?.tenncc}</b></span>
            </div>
          )}
          {daDat.length > 1 && (
            <select className="xl-chon-yc" value={maNhan} onChange={(e) => setMaNhan(e.target.value)} aria-label="Chọn yêu cầu đã đặt hàng">
              {daDat.map((y) => <option key={y.mayc} value={y.mayc}>{y.mayc} – {y.nhacungcap?.tenncc}</option>)}
            </select>
          )}
        </div>
        {!yc ? (
          <p className="nh-trong">Chưa có yêu cầu nào đã đặt hàng. Hãy chọn một yêu cầu ở trên rồi bấm "Xác nhận đặt hàng".</p>
        ) : (
          <>
            <div className="xl-dong2 xl-dau">
              <span className="giua">STT</span><span>Nguyên liệu</span><span className="giua">Số lượng trên yêu cầu</span>
              <span className="giua">Số lượng thực nhận</span><span>Kết quả</span>
            </div>
            {yc.chitietyeucau.map((c, i) => {
              const kq = ketQua(c), dv = c.nguyenlieu?.donvitinh || ''
              const capNhat = (k, v) => setNhan((x) => ({ ...x, [c.manl]: { ...x[c.manl], [k]: v } }))
              return (
                <div className="xl-dong2" key={c.manl}>
                  <span className="giua">{i + 1}</span>
                  <span>{c.nguyenlieu?.tennl}</span>
                  <span className="giua">{soGon(c.soluongcan)} {dv}</span>
                  <span className="giua">
                    <span className={'yc-sl' + (kq && kq !== 'khop' ? ' loi' : '')}>
                      <input value={nhan[c.manl]?.sl ?? ''} inputMode="decimal" maxLength={8} placeholder="0" onChange={(e) => capNhat('sl', e.target.value)} />
                      <i>{dv}</i>
                    </span>
                  </span>
                  <span>
                    {kq === 'khop' && <span className="xl-khop">Khớp yêu cầu</span>}
                    {kq === 'thieu' && <span className="xl-thieu"><img src={iLoi} alt="" />Hàng chưa đủ</span>}
                    {kq === 'sai' && <span className="xl-thieu"><img src={iLoi} alt="" />Hàng chưa đúng</span>}
                  </span>
                </div>
              )
            })}
          </>
        )}
      </section>

      {/* ----- Hình thức thanh toán ----- */}
      <section className="khung xl-khung xl-tt-khung">
        <h2>Hình thức thanh toán</h2>
        <div className="xl-tt-hang">
          {[TIEN_MAT, CHUYEN_KHOAN].map((h) => (
            <label key={h} className={'xl-radio' + (ht === h ? ' chon' : '')}>
              <input type="radio" name="ht" checked={ht === h} onChange={() => setHt(h)} />{h}
            </label>
          ))}
          <button className="nut nut-phu xl-tai" disabled={ht !== CHUYEN_KHOAN} onClick={() => fileRef.current?.click()}>Tải ảnh biên lai</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={chonAnh} />
          <span className="xl-anh">
            {ht === CHUYEN_KHOAN && anh ? <img src={anh} alt="Ảnh biên lai vừa tải lên" /> : 'Ảnh biên lai vừa tải lên'}
          </span>
          <button className="nut nut-xanh xl-xac-nhan" onClick={xacNhanThanhToan} disabled={dangGui || !yc}>
            {dangGui ? 'Đang lưu...' : 'Xác nhận đã thanh toán'}
          </button>
        </div>
      </section>

      {thongBao && (
        <ThongBao loai={thongBao.loai} noiDung={thongBao.noiDung} chiTiet={thongBao.chiTiet} coNutDong onDong={() => setThongBao(null)} />
      )}
    </div>
  )
}
