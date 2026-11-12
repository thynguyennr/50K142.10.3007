import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ThongBao from '../components/ThongBao'
import iKhoa from '../assets/icons/khoa-xam.svg'
import iMatMo from '../assets/icons/mat-mo.svg'
import iMatDong from '../assets/icons/mat-dong.svg'
import './DoiMatKhau.css'

const O = [
  ['cu', 'Mật khẩu hiện tại', 'Nhập mật khẩu hiện tại...', 'current-password'],
  ['moi', 'Mật khẩu mới', 'Nhập mật khẩu mới...', 'new-password'],
  ['lai', 'Xác nhận mật khẩu mới', 'Nhập lại mật khẩu mới...', 'new-password'],
]

// UC 8 Đổi mật khẩu
export default function DoiMatKhau() {
  const nav = useNavigate()
  const { session } = useAuth()
  const [gt, setGt] = useState({ cu: '', moi: '', lai: '' })
  const [hien, setHien] = useState({})
  const [loi, setLoi] = useState({})
  const [dangLuu, setDangLuu] = useState(false)
  const [thongBao, setThongBao] = useState(null)

  const luu = async () => {
    const l = {}
    for (const [k] of O) if (!gt[k]) l[k] = 'Không được để trống' // 5a
    if (!l.moi && (gt.moi.length < 6 || gt.moi === gt.cu)) l.moi = 'Mật khẩu mới phải khác mật khẩu hiện tại và có ít nhất 6 ký tự.' // 5c
    if (!l.lai && gt.lai !== gt.moi) l.lai = 'Mật khẩu nhập lại phải trùng với mật khẩu mới.' // 5d
    setLoi(l)
    if (Object.keys(l).length) return

    setDangLuu(true)
    // 5b: kiểm tra mật khẩu hiện tại bằng cách đăng nhập lại với email của phiên hiện tại
    const email = session?.user?.email
    const kt = await supabase.auth.signInWithPassword({ email, password: gt.cu })
    if (kt.error) {
      setDangLuu(false)
      if (/invalid|credentials/i.test(kt.error.message)) return setLoi({ cu: 'Mật khẩu hiện tại không đúng' })
      return setThongBao({ loai: 'loi', noiDung: 'Đổi mật khẩu không thành công', chiTiet: kt.error.message })
    }
    const { error } = await supabase.auth.updateUser({ password: gt.moi })
    setDangLuu(false)
    if (error) return setThongBao({ loai: 'loi', noiDung: 'Đổi mật khẩu không thành công', chiTiet: error.message })
    setGt({ cu: '', moi: '', lai: '' })
    setThongBao({ loai: 'thanh-cong', noiDung: 'Đổi mật khẩu thành công' })
  }

  return (
    <div className="dmk">
      <div className="khung dmk-dau">
        <h1>Đổi mật khẩu</h1>
        <p>Vui lòng nhập thông tin để đổi mật khẩu tài khoản của bạn</p>
      </div>

      <form className="khung dmk-form" onSubmit={(e) => { e.preventDefault(); luu() }} noValidate>
        {O.map(([k, nhan, goiY, ac]) => (
          <div className="dmk-o" key={k}>
            <label htmlFor={'dmk-' + k}><img src={iKhoa} alt="" />{nhan}<span className="sao">*</span></label>
            <div className={'dmk-nhap' + (loi[k] ? ' loi' : '')}>
              <input id={'dmk-' + k} type={hien[k] ? 'text' : 'password'} value={gt[k]} placeholder={goiY} autoComplete={ac}
                onChange={(e) => { setGt((x) => ({ ...x, [k]: e.target.value })); setLoi((x) => ({ ...x, [k]: '' })) }} />
              <button type="button" onClick={() => setHien((x) => ({ ...x, [k]: !x[k] }))} aria-label={hien[k] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                <img src={hien[k] ? iMatMo : iMatDong} alt="" />
              </button>
            </div>
            {loi[k] && <p className="dmk-loi"><span>!</span>{loi[k]}</p>}
          </div>
        ))}
        <div className="dmk-nut">
          <button type="button" className="nut nut-phu" onClick={() => nav('/')}>Hủy</button>
          <button type="submit" className="nut nut-xanh" disabled={dangLuu}>{dangLuu ? 'Đang lưu' : 'Lưu'}</button>
        </div>
      </form>

      {thongBao && <ThongBao loai={thongBao.loai} noiDung={thongBao.noiDung} chiTiet={thongBao.chiTiet} coNutDong onDong={() => setThongBao(null)} />}
    </div>
  )
}
