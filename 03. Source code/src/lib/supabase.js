import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Tên đăng nhập trên web = phần trước dấu @ của email trong Supabase Auth
export const EMAIL_DOMAIN = '@bichngau.vn'
