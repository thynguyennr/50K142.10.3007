import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { tien, thoiGian, TRANG_THAI } from '../lib/format'
import { NGAN_HANG, dinhDangSoTK } from '../lib/nganHang'
import { taoChuoiVietQR } from '../lib/vietqr'
import ThongBao from '../components/ThongBao'
import FormKhachHang from '../components/FormKhachHang'
import iDot from '../assets/icons/dot.svg'
import iClock from '../assets/icons/clock.svg'
import iList from '../assets/icons/list.svg'
import iLoi from '../assets/icons/alert-triangle.svg'
import iThanhCong from '../assets/icons/check-circle.svg'
import iTim from '../assets/icons/search-trang.svg'
import './TaoDon.css'
import './ThanhToan.css'

const TIEN_MAT = 'Tiền mặt'
const CHUYEN_KHOAN = 'Chuyển khoản'
const THOI_GIAN_CHO_CK = 10 * 60 * 1000 // chờ tiền chuyển khoản tối đa 10 phút

// Ghép thông báo lỗi Supabase; lỗi do trigger (P0001) đã là câu tiếng Việt
const moTaLoi = (e) => (e.code === 'P0001' ? e.message : `${e.message} [mã ${e.code}]`)

// Thanh toán đơn bán hàng: chọn phương thức -> (lỗi | thành công) -> gắn khách hàng -> in hoá đơn
export default function ThanhToan() {
  const { madon } = useParams()
  const nav = useNavigate()
  const [don, setDon] = useState(null)
  const [loiTai, setLoiTai] = useState('')
  const [hinhThuc, setHinhThuc] = useState(TIEN_MAT)
  const [buoc, setBuoc] = useState('chon')    // chon | loi | xong
  const [chiTietLoi, setChiTietLoi] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [thongBao, setThongBao] = useState(null) // { noiDung, chiTiet }

  useEffect(() => {
    supabase.from('donhang')
      .select(`madon,trangthai,thoigiantao,thoigianthanhtoan,hinhthuc,tongtien,
        khachhang(tenkh,sodienthoai),
        chitietdonban(mamon,kichco,soluong,dongia,thanhtien,ghichu,mon(tenmon))`)
      .eq('madon', madon).single()
      .then(({ data, error }) => {
        if (error) return setLoiTai(error.message)
        setDon(data)
        if (data.trangthai === TRANG_THAI.DA) setBuoc('xong')
        if (data.hinhthuc) setHinhThuc(data.hinhthuc)
      })
  }, [madon])

  // Chuyển khoản: chờ ngân hàng báo tiền về (Edge Function sepay-webhook cập nhật đơn),
  // kiểm tra trạng thái đơn mỗi 3 giây; quá 10 phút chưa nhận được tiền -> "Chưa thanh toán thành công" (luồng 3b)
  const choChuyenKhoan = buoc === 'chon' && hinhThuc === CHUYEN_KHOAN && don?.trangthai === TRANG_THAI.CHUA
  useEffect(() => {
    if (!choChuyenKhoan) return
    const batDau = Date.now()
    const id = setInterval(async () => {
      const { data } = await supabase.from('donhang').select('trangthai,hinhthuc,thoigianthanhtoan').eq('madon', madon).single()
      if (data?.trangthai === TRANG_THAI.DA) {
        clearInterval(id)
        setDon((d) => ({ ...d, ...data }))
        setBuoc('xong')
      } else if (Date.now() - batDau > THOI_GIAN_CHO_CK) {
        clearInterval(id)
        setChiTietLoi('Chưa nhận được tiền chuyển khoản. Kiểm tra lại giao dịch của khách rồi thử lại.')
        setBuoc('loi')
      }
    }, 3000)
    return () => clearInterval(id)
  }, [choChuyenKhoan, madon])

  // Sau khi in hoá đơn xong -> quay về màn Quản lý bán hàng
  const inHoaDon = () => {
    window.addEventListener('afterprint', () => nav('/ban-hang'), { once: true })
    window.print()
  }

  // Tiền mặt: chủ quán bấm "Xác nhận đã nhận tiền". (Chuyển khoản do ngân hàng báo, xem useEffect ở trên)
  const xacNhan = async (ht) => {
    setDangGui(true)
    const kq = await supabase.from('donhang')
      .update({ trangthai: TRANG_THAI.DA, hinhthuc: ht, thoigianthanhtoan: new Date().toISOString() })
      .eq('madon', madon).eq('trangthai', TRANG_THAI.CHUA)
      .select('trangthai,hinhthuc,thoigianthanhtoan').single()
    setDangGui(false)
    if (kq.error) {
      // PGRST116 = không có dòng nào được cập nhật (đơn không còn "Chưa thanh toán")
      setChiTietLoi(kq.error.code === 'PGRST116' ? 'Đơn không còn ở trạng thái "Chưa thanh toán"' : moTaLoi(kq.error))
      return setBuoc('loi')
    }
    setDon((d) => ({ ...d, ...kq.data }))
    setBuoc('xong')
  }

  // Gắn khách vào đơn (trigger fn_khach_sau_thanhtoan tự cộng số lần mua / tổng tiền)
  const ganKhach = async (kh) => {
    const kq = await supabase.from('donhang').update({ sodienthoaikh: kh.sodienthoai })
      .eq('madon', madon).select('madon').single()
    if (kq.error) return setThongBao({ noiDung: 'Không lưu được khách hàng', chiTiet: moTaLoi(kq.error) })
    setDon((d) => ({ ...d, khachhang: { tenkh: kh.tenkh, sodienthoai: kh.sodienthoai } }))
  }

  if (loiTai) return <p className="loi-tai">Không tải được đơn hàng: {loiTai}</p>
  if (!don) return <p>Đang tải...</p>

  const mons = don.chitietdonban
  const soMon = mons.reduce((t, m) => t + m.soluong, 0)
  const tong = Number(don.tongtien)

  return (
    <div className="td tt">
      <div className="khung td-dau">
        <div className="td-dong-tieu-de">
          <h1>Thanh toán đơn bán hàng</h1>
          <span className="td-ma">{don.madon}</span>
          <span className="td-tt"><img src={iDot} alt="" />{don.trangthai}</span>
        </div>
        <p className="td-gio"><img src={iClock} alt="" />Thời gian tạo: {thoiGian(don.thoigiantao)}</p>
      </div>

      <div className="tt-than">
        <section className="tt-trai">
          <h2 className="tt-tieu-de"><img src={iList} alt="" />Danh sách món đã gọi ({soMon})</h2>
          <div className="tt-bang">
            <div className="tt-dong tt-dau">
              <span>Món</span><span className="giua">Size</span><span className="giua">SL</span>
              <span className="phai">Đơn giá</span><span className="phai">Thành tiền</span>
            </div>
            <div className="tt-than-bang">
              {mons.map((m) => (
                <div className="tt-dong" key={m.mamon + m.kichco}>
                  <span className="ten"><b>{m.mon?.tenmon || m.mamon}</b>{m.ghichu && <i>{m.ghichu}</i>}</span>
                  <span className="giua"><span className="tt-size">{m.kichco}</span></span>
                  <span className="giua">{m.soluong}</span>
                  <span className="phai">{tien(m.dongia)}</span>
                  <span className="phai dam">{tien(m.thanhtien ?? m.dongia * m.soluong)}</span>
                </div>
              ))}
            </div>
            <div className="tt-dong tt-tong"><span>Tổng tiền:</span><span className="phai">{tien(tong)}</span></div>
          </div>
        </section>

        <section className="khung tt-phai">
          {don.trangthai === TRANG_THAI.HUY ? (
            <KetQua loai="loi" tieuDe="Đơn hàng đã bị hủy" nut="Quay lại" onNut={() => nav('/ban-hang')} />
          ) : buoc === 'chon' ? (
            <ChonPhuongThuc tong={tong} madon={don.madon} hinhThuc={hinhThuc} setHinhThuc={setHinhThuc}
              dangGui={dangGui} onHuy={() => nav('/ban-hang')} onXacNhan={xacNhan} />
          ) : buoc === 'loi' ? (
            <KetQua loai="loi" tieuDe="Chưa thanh toán thành công" chiTiet={chiTietLoi}
              nut="Thử lại" onNut={() => { setChiTietLoi(''); setBuoc('chon') }} />
          ) : (
            <ThanhCong don={don} onGanKhach={ganKhach} onIn={inHoaDon} />
          )}
        </section>
      </div>

      {thongBao && <ThongBao loai="loi" noiDung={thongBao.noiDung} chiTiet={thongBao.chiTiet} onDong={() => setThongBao(null)} />}
      {buoc === 'xong' && createPortal(<HoaDonIn don={don} mons={mons} tong={tong} />, document.body)}
    </div>
  )
}

/* ---------- Bước 1: chọn phương thức ---------- */
function ChonPhuongThuc({ tong, madon, hinhThuc, setHinhThuc, dangGui, onHuy, onXacNhan }) {
  const [qr, setQr] = useState('')
  useEffect(() => {
    if (hinhThuc !== CHUYEN_KHOAN) return
    const chuoi = taoChuoiVietQR({ bin: NGAN_HANG.bin, soTaiKhoan: NGAN_HANG.soTaiKhoan, soTien: tong, noiDung: madon })
    QRCode.toDataURL(chuoi, { width: 480, margin: 0, errorCorrectionLevel: 'M' }).then(setQr)
  }, [hinhThuc, tong, madon])

  return (
    <div className="tt-chon">
      <div className="tt-tong-tien">
        <small>Tổng tiền cần thanh toán:</small>
        <b>{tien(tong).replace(' đ', 'đ')}</b>
      </div>
      <p className="tt-nhan">Chọn phương thức thanh toán:</p>
      <div className="tt-pt">
        {[TIEN_MAT, CHUYEN_KHOAN].map((h) => (
          <button key={h} className={hinhThuc === h ? 'chon' : ''} onClick={() => setHinhThuc(h)}>{h}</button>
        ))}
      </div>

      {hinhThuc === CHUYEN_KHOAN && (
        <div className="tt-qr">
          {qr ? <img src={qr} alt={`Mã QR chuyển khoản ${tien(tong)} cho đơn ${madon}`} /> : <div className="tt-qr-cho" />}
          <dl>
            <dt>Ngân hàng:</dt><dd>{NGAN_HANG.ten}</dd>
            <dt>Số TK:</dt><dd>{dinhDangSoTK(NGAN_HANG.soTaiKhoan)}</dd>
            <dt>Số tiền:</dt><dd>{tien(tong)}</dd>
            <dt>Nội dung:</dt><dd>{madon}</dd>
          </dl>
          <p className="tt-cho"><span className="tt-xoay" aria-hidden="true" />Đang chờ khách chuyển khoản...</p>
          {/* Chỉ hiện khi chạy thử (npm run dev), không có trong bản build: giả lập ngân hàng báo đã nhận tiền */}
          {import.meta.env.DEV && (
            <button className="tt-gia-lap" onClick={() => onXacNhan(CHUYEN_KHOAN)} disabled={dangGui}>
              [Chạy thử] Giả lập đã nhận tiền chuyển khoản
            </button>
          )}
        </div>
      )}

      {/* Đặc tả 6.3.6: Tiền mặt có "Hủy" + "Xác nhận đã nhận tiền"; Chuyển khoản chỉ có "Hủy" (hệ thống tự nhận tiền) */}
      <div className={'tt-nut' + (hinhThuc === CHUYEN_KHOAN ? ' mot' : '')}>
        <button className="nut nut-phu-hong" onClick={onHuy}>Hủy</button>
        {hinhThuc === TIEN_MAT && (
          <button className="nut nut-xanh-vien" onClick={() => onXacNhan(TIEN_MAT)} disabled={dangGui}>
            {dangGui ? 'Đang xác nhận...' : 'Xác nhận đã nhận tiền'}
          </button>
        )}
      </div>
    </div>
  )
}

/* ---------- Kết quả lỗi ---------- */
function KetQua({ tieuDe, chiTiet, nut, onNut }) {
  return (
    <div className="tt-ket-qua">
      <div className="tt-ket-qua-giua">
        <img src={iLoi} alt="" className="tt-icon-loi" />
        <p className="tt-chu-loi">{tieuDe}</p>
        {chiTiet && <small className="tt-chi-tiet">{chiTiet}</small>}
      </div>
      <button className="nut nut-xanh-vien tt-nut-rong" onClick={onNut}>{nut}</button>
    </div>
  )
}

/* ---------- Bước 2: thành công + thông tin khách hàng ---------- */
function ThanhCong({ don, onGanKhach, onIn }) {
  const kh = don.khachhang
  return (
    <div className="tt-ket-qua">
      <div className="tt-xong">
        <img src={iThanhCong} alt="" className="tt-icon-xong" />
        <p className="tt-chu-xong">Thanh toán thành công</p>
        <dl className="tt-thong-tin">
          <dt>Thời gian thanh toán:</dt><dd>{thoiGian(don.thoigianthanhtoan)}</dd>
          <dt>Hình thức thanh toán:</dt><dd>{don.hinhthuc}</dd>
          {kh && <><dt>Khách hàng:</dt><dd>{kh.tenkh}</dd><dt>Số điện thoại:</dt><dd>{kh.sodienthoai}</dd></>}
        </dl>
        {!kh && <TimKhach tong={Number(don.tongtien)} onChon={onGanKhach} />}
      </div>
      <button className="nut nut-xanh-vien tt-nut-rong" onClick={onIn}>In hóa đơn</button>
    </div>
  )
}

function TimKhach({ tong, onChon }) {
  const [sdt, setSdt] = useState('')
  const [ketQua, setKetQua] = useState(null)   // null = chưa tìm; [] = không thấy
  const [dangTim, setDangTim] = useState(false)
  const [loi, setLoi] = useState('')
  const [moTao, setMoTao] = useState(false)

  const tim = async () => {
    const q = sdt.trim()
    if (!q) return
    setDangTim(true); setLoi('')
    const { data, error } = await supabase.from('khachhang').select('tenkh,sodienthoai')
      .ilike('sodienthoai', `%${q}%`).order('sodienthoai').limit(5)
    setDangTim(false)
    if (error) return setLoi(moTaLoi(error))
    setKetQua(data)
  }

  return (
    <div className="tt-khach">
      <h3>Thông tin khách hàng</h3>
      <i className="tt-chua-co">Chưa có thông tin</i>
      <div className="tt-khach-than">
        <div className="tt-tim">
          <input value={sdt} inputMode="numeric" maxLength={10} placeholder="Nhập số điện thoại khách"
            onChange={(e) => { setSdt(e.target.value.replace(/\D/g, '')); setKetQua(null) }}
            onKeyDown={(e) => e.key === 'Enter' && tim()} />
          {sdt && (
            <button className="tt-nut-tim" onClick={tim} disabled={dangTim} aria-label="Tìm khách hàng">
              <img src={iTim} alt="" />
            </button>
          )}
        </div>
        {loi && <p className="tt-loi-khach">{loi}</p>}
        {ketQua?.map((k) => (
          <button key={k.sodienthoai} className="tt-ket-qua-khach" onClick={() => onChon(k)} title="Chọn khách hàng này">
            <b>{k.tenkh}</b><i>{k.sodienthoai}</i>
          </button>
        ))}
        {ketQua && ketQua.length === 0 && (
          <>
            <p className="tt-loi-khach">Khách hàng này chưa có hồ sơ!</p>
            <button className="nut nut-xanh-vien tt-tao-ho-so" onClick={() => setMoTao(true)}>Tạo hồ sơ mới</button>
          </>
        )}
      </div>
      {moTao && <FormKhachHang sdtBanDau={sdt} soLanMua={1} tongTien={tong} onHuy={() => setMoTao(false)}
        onXong={(kh) => { setMoTao(false); onChon(kh) }} />}
    </div>
  )
}

/* ---------- Mẫu hoá đơn khi in (chỉ hiện lúc in) ---------- */
function HoaDonIn({ don, mons, tong }) {
  return (
    <div className="hd-in">
      <h1>Cafe Bích Ngâu</h1>
      <p className="hd-giua">HÓA ĐƠN BÁN HÀNG</p>
      <p>Mã đơn: <b>{don.madon}</b></p>
      <p>Thời gian thanh toán: {thoiGian(don.thoigianthanhtoan)}</p>
      <p>Hình thức: {don.hinhthuc}</p>
      {don.khachhang && <p>Khách hàng: {don.khachhang.tenkh} – {don.khachhang.sodienthoai}</p>}
      <table>
        <thead><tr><th>Món</th><th>Size</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
        <tbody>
          {mons.map((m) => (
            <tr key={m.mamon + m.kichco}>
              <td>{m.mon?.tenmon || m.mamon}{m.ghichu && <><br /><i>{m.ghichu}</i></>}</td>
              <td>{m.kichco}</td><td>{m.soluong}</td><td>{tien(m.dongia)}</td><td>{tien(m.thanhtien ?? m.dongia * m.soluong)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hd-tong">Tổng tiền: {tien(tong)}</p>
      <p className="hd-giua">Cảm ơn quý khách!</p>
    </div>
  )
}
