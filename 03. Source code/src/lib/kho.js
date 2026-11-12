import { supabase } from './supabase'

// Đã chốt với nhóm: "Hết" nếu tồn = 0; "Sắp hết" nếu 0 < tồn < mức tối thiểu; "Đủ" nếu tồn >= mức tối thiểu
export const trangThaiTon = (ton, min) => {
  const t = Number(ton) || 0, m = Number(min) || 0
  return t <= 0 ? 'Hết' : t < m ? 'Sắp hết' : 'Đủ'
}
export const canNhap = (n) => trangThaiTon(n.tonkho, n.muctontoithieu) !== 'Đủ'
const THU_TU = { 'Hết': 0, 'Sắp hết': 1, 'Đủ': 2 }
// BR5-06: Hết -> Sắp hết -> Đủ, cùng trạng thái xếp theo tên
export const sapXepKho = (ds) => [...ds].sort((a, b) =>
  THU_TU[trangThaiTon(a.tonkho, a.muctontoithieu)] - THU_TU[trangThaiTon(b.tonkho, b.muctontoithieu)]
  || a.tennl.localeCompare(b.tennl, 'vi'))

// 1,5 / 1.5 -> 1.5 ; trống -> null ; sai -> NaN
export const docSoLe = (s) => {
  const t = String(s ?? '').trim().replace(',', '.')
  if (!t) return null
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN
}
export const so2 = (n) => Number(n || 0).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const chuanTen = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()

export const taiNguyenLieu = () => supabase.from('nguyenlieu').select('manl,tennl,donvitinh,tonkho,muctontoithieu').order('tennl')

// Cập nhật nguyên liệu và đồng bộ cột trangthaitonkho (Trang chủ dùng cột này).
// Nếu database tự tính cột đó (trigger / generated) thì bước đồng bộ lỗi cũng bỏ qua.
export async function capNhatNguyenLieu(manl, thayDoi, nl) {
  const kq = await supabase.from('nguyenlieu').update(thayDoi).eq('manl', manl).select('manl')
  if (kq.error) return kq.error
  if (!kq.data?.length) return { message: 'Không có quyền cập nhật nguyên liệu', code: 'RLS' }
  const moi = { ...nl, ...thayDoi }
  await supabase.from('nguyenlieu').update({ trangthaitonkho: trangThaiTon(moi.tonkho, moi.muctontoithieu) }).eq('manl', manl)
  return null
}
