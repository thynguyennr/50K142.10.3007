import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import iconUser from '../assets/icons/user.svg'
import iconLock from '../assets/icons/lock.svg'
import iconEye from '../assets/icons/eye.svg'
import iconAlert from '../assets/icons/alert-triangle.svg'
import './Login.css'

// Nội dung popup theo Figma (Đăng nhập lỗi 3 và lỗi 4)
const POPUP = {
  ketnoi: ['Lỗi kết nối, vui lòng thử lại sau'],
  thatbai: ['Đăng nhập không thành công,', 'vui lòng thử lại sau!'],
}

export default function Login() {
  const { session, signIn } = useAuth()
  const [ten, setTen] = useState('')
  const [mk, setMk] = useState('')
  const [hien, setHien] = useState(false)
  const [loi, setLoi] = useState({})
  const [popup, setPopup] = useState('')
  const [dangGui, setDangGui] = useState(false)

  // Popup tự đóng sau 3 giây (Figma không có nút đóng)
  useEffect(() => {
    if (!popup) return
    const t = setTimeout(() => setPopup(''), 3000)
    return () => clearTimeout(t)
  }, [popup])

  if (session) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    const l = {}
    if (!ten.trim()) l.ten = 'Không được để trống!'
    else if (ten.trim().length > 20) l.ten = 'Tên đăng nhập tối đa 20 ký tự!'
    if (!mk) l.mk = 'Không được để trống!'
    setLoi(l)
    if (Object.keys(l).length) return

    setDangGui(true)
    const error = await signIn(ten, mk)
    setDangGui(false)
    if (error) setPopup(/fetch|network/i.test(error.message) ? 'ketnoi' : 'thatbai')
  }

  const coLoi = Boolean(loi.ten || loi.mk)

  return (
    <div className="dn-page">
      <h1 className="dn-title">
        Hệ thống quản lý bán hàng<br />Cà phê Bích Ngâu
      </h1>

      <form className={'dn-card' + (coLoi ? ' co-loi' : '')} onSubmit={submit} noValidate>
        <div className="dn-nhom">
          <div className="dn-label"><span>Tên đăng nhập</span><span className="dn-sao">*</span></div>
          <div className={'dn-input' + (loi.ten ? ' loi' : '')}>
            <img src={iconUser} alt="" />
            <input value={ten} onChange={(e) => setTen(e.target.value)}
              placeholder="Nhập tên đăng nhập..." autoComplete="username" />
          </div>
          {loi.ten && <p className="dn-loi">{loi.ten}</p>}
        </div>

        <div className="dn-nhom dn-nhom-2">
          <div className="dn-label"><span>Mật khẩu</span><span className="dn-sao">*</span></div>
          <div className={'dn-input' + (loi.mk ? ' loi' : '')}>
            <img src={iconLock} alt="" />
            <input type={hien ? 'text' : 'password'} value={mk} onChange={(e) => setMk(e.target.value)}
              placeholder="Nhập mật khẩu..." autoComplete="current-password" />
            <button type="button" className="dn-mat" onClick={() => setHien(!hien)}
              aria-label={hien ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
              <img src={iconEye} alt="" />
            </button>
          </div>
          {loi.mk && <p className="dn-loi">{loi.mk}</p>}
        </div>

        <button type="submit" className="dn-btn" disabled={dangGui}>Đăng nhập</button>
      </form>

      {popup && (
        <div className="dn-overlay" onClick={() => setPopup('')}>
          <div className="dn-popup">
            <img src={iconAlert} alt="" width="48" height="48" />
            <div>{POPUP[popup].map((d) => <p key={d}>{d}</p>)}</div>
          </div>
        </div>
      )}
    </div>
  )
}
