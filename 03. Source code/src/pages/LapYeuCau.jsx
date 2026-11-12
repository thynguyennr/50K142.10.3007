import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { YC, docSo, moTaLoi } from '../lib/nhapHang'
import ThongBao from '../components/ThongBao'
import iLoi from '../assets/icons/alert-triangle.svg'
import './NhapHang.css'

const dongMoi = () => ({ k: Math.random().toString(36).slice(2), manl: '', sl: '' })

// UC 4.1 Lập yêu cầu nhập hàng
export default function LapYeuCau() {
  const nav = useNavigate()
  const { chuQuan } = useAuth()
  const [dsNcc, setDsNcc] = useState([])
  const [dsNl, setDsNl] = useState([])
  const [mancc, setMancc] = useState('')
  const [dong, setDong] = useState([dongMoi()])
  const [loi, setLoi] = useState({})          // { ncc, nl: {k}, sl: {k} }
  const [dangGui, setDangGui] = useState(false)
  const [thongBao, setThongBao] = useState(null)

  useEffect(() => {
    supabase.from('nhacungcap').select('mancc,tenncc').order('tenncc').then(({ data }) => setDsNcc(data || []))
    supabase.from('nguyenlieu').select('manl,tennl,donvitinh').order('tennl').then(({ data }) => setDsNl(data || []))
  }, [])

  const nl = (manl) => dsNl.find((x) => x.manl === manl)
  const sua = (k, thayDoi) => setDong((ds) => ds.map((d) => (d.k === k ? { ...d, ...thayDoi } : d)))

  const gui = async () => {
    const l = { nl: {}, sl: {} }
    if (!mancc) l.ncc = 'Chưa chọn nhà cung cấp'
    dong.forEach((d) => {
      if (!d.manl) l.nl[d.k] = 'Chưa chọn nguyên liệu'
      const s = docSo(d.sl)
      if (s == null || Number.isNaN(s) || s <= 0) l.sl[d.k] = 'Số lượng không hợp lệ'
    })
    setLoi(l)
    if (l.ncc || Object.keys(l.nl).length || Object.keys(l.sl).length) return

    setDangGui(true)
    // Mã yêu cầu do database tự sinh; trạng thái ban đầu "Chờ báo giá" (UC 4.1 bước 8)
    const kq = await supabase.from('yeucaunhap')
      .insert({ mancc, trangthai: YC.CHO_BAO_GIA, thoigianlap: new Date().toISOString(), manguoidung: chuQuan?.manguoidung })
      .select('mayc').single()
    let error = kq.error
    if (!error) {
      const mayc = kq.data.mayc
      ;({ error } = await supabase.from('chitietyeucau').insert(dong.map((d) => ({ mayc, manl: d.manl, soluongcan: docSo(d.sl) }))))
      if (error) await supabase.from('yeucaunhap').delete().eq('mayc', mayc) // hoàn tác yêu cầu rỗng
    }
    setDangGui(false)
    if (error) return setThongBao({ loai: 'loi', noiDung: 'Gửi yêu cầu không thành công', chiTiet: moTaLoi(error) })
    setThongBao({ loai: 'thanh-cong', noiDung: 'Gửi yêu cầu thành công', ve: true })
  }

  return (
    <div className="nh">
      <div className="khung dau-trang"><h1>Lập yêu cầu nhập hàng</h1></div>

      <div className="khung yc-khung">
        <h2>Nhà cung cấp</h2>
        <select className={'yc-ncc' + (loi.ncc ? ' loi' : '') + (mancc ? '' : ' chua-chon')} value={mancc}
          onChange={(e) => { setMancc(e.target.value); setLoi((x) => ({ ...x, ncc: '' })) }}>
          <option value="">Chọn nhà cung cấp</option>
          {dsNcc.map((n) => <option key={n.mancc} value={n.mancc}>{n.tenncc}</option>)}
        </select>
        {loi.ncc && <p className="yc-loi-to"><img src={iLoi} alt="" />{loi.ncc}</p>}

        <h2>Nguyên liệu</h2>
        <div className="yc-bang">
          <div className="yc-dong yc-dau"><span className="giua">STT</span><span>Tên nguyên liệu</span><span>Số lượng</span><span /></div>
          {dong.map((d, i) => {
            const daChon = dong.filter((x) => x.k !== d.k).map((x) => x.manl)
            return (
              <div className="yc-dong" key={d.k}>
                <span className="giua">{i + 1}</span>
                <span>
                  <select className={'yc-nl' + (loi.nl?.[d.k] ? ' loi' : '') + (d.manl ? '' : ' chua-chon')} value={d.manl}
                    onChange={(e) => { sua(d.k, { manl: e.target.value }); setLoi((x) => ({ ...x, nl: { ...x.nl, [d.k]: '' } })) }}>
                    <option value="">Chọn nguyên liệu</option>
                    {dsNl.filter((n) => !daChon.includes(n.manl)).map((n) => <option key={n.manl} value={n.manl}>{n.tennl}</option>)}
                  </select>
                  {loi.nl?.[d.k] && <em className="yc-loi">ⓘ {loi.nl[d.k]}</em>}
                </span>
                <span>
                  <span className={'yc-sl' + (loi.sl?.[d.k] ? ' loi' : '')}>
                    <input value={d.sl} inputMode="decimal" maxLength={8} placeholder="0"
                      onChange={(e) => { sua(d.k, { sl: e.target.value }); setLoi((x) => ({ ...x, sl: { ...x.sl, [d.k]: '' } })) }} />
                    <i>{nl(d.manl)?.donvitinh || ''}</i>
                  </span>
                  {loi.sl?.[d.k] && <em className="yc-loi">ⓘ {loi.sl[d.k]}</em>}
                </span>
                <span className="giua">
                  {dong.length > 1 && <button className="yc-bo" aria-label="Bỏ dòng" onClick={() => setDong((ds) => ds.filter((x) => x.k !== d.k))}>×</button>}
                </span>
              </div>
            )
          })}
          <div className="yc-chan">
            <button className="nut nut-xanh yc-them" onClick={() => setDong((ds) => [...ds, dongMoi()])}><span className="cong">+</span>Thêm nguyên liệu</button>
            <div className="yc-nut">
              <button className="nut nut-phu" onClick={() => setThongBao({ loai: 'thanh-cong', noiDung: 'Đã hủy yêu cầu', ve: true })}>Hủy</button>
              <button className="nut nut-xanh" onClick={gui} disabled={dangGui}>{dangGui ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
            </div>
          </div>
        </div>
      </div>

      {thongBao && (
        <ThongBao loai={thongBao.loai} noiDung={thongBao.noiDung} chiTiet={thongBao.chiTiet} coNutDong
          onDong={() => { const ve = thongBao.ve; setThongBao(null); if (ve) nav('/nhap-hang') }} />
      )}
    </div>
  )
}
