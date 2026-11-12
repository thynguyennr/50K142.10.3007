import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import XacNhan from './XacNhan'
import ThongBao from './ThongBao'
import { useAuth } from '../context/AuthContext'
import iHome from '../assets/icons/nav-home.svg'
import iBanHang from '../assets/icons/nav-ban-hang.svg'
import iMenu from '../assets/icons/nav-menu.svg'
import iKhachHang from '../assets/icons/nav-khach-hang.svg'
import iNhapHang from '../assets/icons/nav-nhap-hang.svg'
import iKho from '../assets/icons/nav-kho.svg'
import iBaoCao from '../assets/icons/nav-bao-cao.svg'
import iDoiMatKhau from '../assets/icons/nav-doi-mat-khau.svg'
import iDangXuat from '../assets/icons/nav-dang-xuat.svg'

// Thanh bên theo Figma (frame "Quản lý bán hàng" / "Tạo đơn")
const NHOM = [
  { tieuDe: 'TỔNG QUAN', muc: [{ to: '/', label: 'Trang chủ', icon: iHome }] },
  {
    tieuDe: 'QUẢN LÝ', muc: [
      { to: '/ban-hang', label: 'Bán hàng', icon: iBanHang },
      { to: '/menu', label: 'Menu', icon: iMenu },
      { to: '/khach-hang', label: 'Khách hàng', icon: iKhachHang },
      { to: '/nhap-hang', label: 'Nhập hàng', icon: iNhapHang },
      { to: '/kho', label: 'Kho nguyên liệu', icon: iKho },
    ],
  },
  {
    tieuDe: 'BÁO CÁO', dai: true, muc: [
      { to: '/bao-cao', label: 'Báo cáo doanh thu', icon: iBaoCao },
      { to: '/thong-ke', label: 'Thống kê món bán chạy', icon: iBaoCao },
    ],
  },
]

const lop = (dai) => ({ isActive }) => 'nav' + (dai ? ' nav-dai' : '') + (isActive ? ' active' : '')

export default function Layout() {
  const { signOut } = useAuth()
  const [hoi, setHoi] = useState(false)
  const [loi, setLoi] = useState(false)

  // UC 9 Đăng xuất: hỏi xác nhận; lỗi thì giữ nguyên màn hình và báo (4a)
  const dangXuat = async () => {
    setHoi(false)
    const kq = await signOut().catch((e) => ({ error: e }))
    if (kq?.error) setLoi(true)
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <b>Cafe Bích Ngâu</b>
          <small>Quản lý quán cà phê</small>
        </div>

        <nav className="sb-chinh">
          {NHOM.map((n) => (
            <div className="sb-nhom" key={n.tieuDe}>
              <p className="sb-tieude">{n.tieuDe}</p>
              {n.muc.map((m) => (
                <NavLink key={m.to} to={m.to} end={m.to === '/'} className={lop(n.dai)}>
                  <img src={m.icon} alt="" />{m.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sb-nhom">
          <p className="sb-tieude">TÀI KHOẢN</p>
          <NavLink to="/doi-mat-khau" className={lop(false)}>
            <img src={iDoiMatKhau} alt="" />Đổi mật khẩu
          </NavLink>
          <button className={'nav' + (hoi || loi ? ' active' : '')} onClick={() => setHoi(true)}>
            <img src={iDangXuat} alt="" />Đăng xuất
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
      {hoi && (
        <XacNhan cauHoi="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?" nutTrai="Hủy" nutPhai="Đăng xuất"
          onTrai={() => setHoi(false)} onPhai={dangXuat} />
      )}
      {loi && <ThongBao loai="loi" noiDung="Không thể đăng xuất, vui lòng thử lại!" onDong={() => setLoi(false)} />}
    </div>
  )
}
