// Supabase Edge Function: nhận thông báo "có tiền vào" từ SePay (webhook) và tự đánh dấu đơn đã thanh toán.
// Đặc tả UC 2.3 bước 3a.2 + NFR-03: "Hệ thống phải tự động báo nhận tiền chính xác khi thanh toán bằng QR".
//
// Luồng: khách quét QR (nội dung CK = mã đơn, ví dụ HD0010) -> tiền vào tài khoản -> SePay gọi hàm này
//        -> hàm tìm mã đơn trong nội dung, kiểm tra số tiền -> cập nhật donhang -> màn Thanh toán tự chuyển sang "thành công".
//
// Triển khai: xem hướng dẫn trong README.md (mục "Tự động nhận tiền chuyển khoản").
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SEPAY_API_KEY = Deno.env.get('SEPAY_API_KEY') ?? ''

const traVe = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method !== 'POST') return traVe({ success: false, message: 'Chỉ nhận POST' }, 405)

  // SePay gửi header "Authorization: Apikey <khoá>" -> chặn các request giả mạo
  if (!SEPAY_API_KEY || req.headers.get('Authorization') !== `Apikey ${SEPAY_API_KEY}`) {
    return traVe({ success: false, message: 'Sai khoá API' }, 401)
  }

  const gd = await req.json().catch(() => null)
  if (!gd) return traVe({ success: false, message: 'Dữ liệu không hợp lệ' }, 400)

  // Chỉ xử lý tiền VÀO
  if (gd.transferType !== 'in') return traVe({ success: true, message: 'Bỏ qua giao dịch tiền ra' })

  // Mã đơn nằm trong nội dung chuyển khoản (SePay cũng tách sẵn vào trường "code" nếu đã cấu hình tiền tố HD)
  const madon = (String(gd.code ?? '').match(/HD\d+/i) ?? String(gd.content ?? '').match(/HD\d+/i))?.[0]?.toUpperCase()
  if (!madon) return traVe({ success: true, message: 'Không có mã đơn trong nội dung, bỏ qua' })

  const { data: don, error: loiDoc } = await supabase.from('donhang')
    .select('madon,trangthai,tongtien').eq('madon', madon).maybeSingle()
  if (loiDoc) return traVe({ success: false, message: loiDoc.message }, 500)
  if (!don) return traVe({ success: true, message: `Không có đơn ${madon}` })
  if (don.trangthai !== 'Chưa thanh toán') return traVe({ success: true, message: `Đơn ${madon} đã xử lý trước đó` })

  // Chuyển thiếu tiền thì không ghi nhận (màn Thanh toán sẽ báo "Chưa thanh toán thành công" khi hết thời gian chờ)
  if (Number(gd.transferAmount) < Number(don.tongtien)) {
    return traVe({ success: true, message: `Đơn ${madon}: chuyển ${gd.transferAmount} < cần ${don.tongtien}` })
  }

  // transactionDate của SePay có dạng "2026-11-03 18:00:00" theo giờ Việt Nam
  const thoiGian = gd.transactionDate ? new Date(String(gd.transactionDate).replace(' ', 'T') + '+07:00') : new Date()
  const { error } = await supabase.from('donhang')
    .update({ trangthai: 'Đã thanh toán', hinhthuc: 'Chuyển khoản', thoigianthanhtoan: thoiGian.toISOString() })
    .eq('madon', madon).eq('trangthai', 'Chưa thanh toán')
  if (error) return traVe({ success: false, message: error.message }, 500)

  return traVe({ success: true, message: `Đã ghi nhận thanh toán đơn ${madon}` })
})
