// Hằng số + hàm dùng chung cho món (khớp ràng buộc bảng mon / chitietdonban trên Supabase)
export const CON_BAN = 'Còn bán'
export const TAM_HET = 'Tạm hết'
export const DA_XOA = 'Đã xóa'

// kichco lưu trong chitietdonban: 'Nhỏ' | 'Lớn'; giá lấy từ cột gialynho / gialylon của bảng mon
const SIZE = [['Nhỏ', 'gialynho'], ['Lớn', 'gialylon']]
export const sizeCua = (m) => SIZE.filter(([, cot]) => m[cot] != null).map(([ten, cot]) => ({ ten, gia: Number(m[cot]) }))
