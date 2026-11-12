import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import BanHang from './pages/BanHang'
import TaoDon from './pages/TaoDon'
import ThanhToan from './pages/ThanhToan'
import ChiTietDon from './pages/ChiTietDon'
import SuaDon from './pages/SuaDon'
import Menu from './pages/Menu'
import KhachHang from './pages/KhachHang'
import ChiTietKhachHang from './pages/ChiTietKhachHang'
import KhachQuen from './pages/KhachQuen'
import NhapHang from './pages/NhapHang'
import LapYeuCau from './pages/LapYeuCau'
import XuLyNhapHang from './pages/XuLyNhapHang'
import ChiTietPhieuNhap from './pages/ChiTietPhieuNhap'
import Kho from './pages/Kho'
import KiemKe from './pages/KiemKe'
import MucTonToiThieu from './pages/MucTonToiThieu'
import BaoCao from './pages/BaoCao'
import ThongKe from './pages/ThongKe'
import DoiMatKhau from './pages/DoiMatKhau'

function Bao({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <p style={{ padding: 24 }}>Đang tải...</p>
  return session ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Bao><Layout /></Bao>}>
        <Route path="/" element={<Home />} />
        <Route path="/ban-hang" element={<BanHang />} />
        <Route path="/ban-hang/tao-don" element={<TaoDon />} />
        <Route path="/ban-hang/:madon" element={<ChiTietDon />} />
        <Route path="/ban-hang/:madon/sua" element={<SuaDon />} />
        <Route path="/ban-hang/:madon/thanh-toan" element={<ThanhToan />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/khach-hang" element={<KhachHang />} />
        <Route path="/khach-hang/khach-quen" element={<KhachQuen />} />
        <Route path="/khach-hang/:sdt" element={<ChiTietKhachHang />} />
        <Route path="/nhap-hang" element={<NhapHang />} />
        <Route path="/nhap-hang/yeu-cau" element={<LapYeuCau />} />
        <Route path="/nhap-hang/xu-ly" element={<XuLyNhapHang />} />
        <Route path="/nhap-hang/:mapn" element={<ChiTietPhieuNhap />} />
        <Route path="/kho" element={<Kho />} />
        <Route path="/kho/kiem-ke" element={<KiemKe />} />
        <Route path="/kho/muc-ton" element={<MucTonToiThieu />} />
        <Route path="/bao-cao" element={<BaoCao />} />
        <Route path="/thong-ke" element={<ThongKe />} />
        <Route path="/doi-mat-khau" element={<DoiMatKhau />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
