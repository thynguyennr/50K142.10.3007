import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, EMAIL_DOMAIN } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [chuQuan, setChuQuan] = useState(null) // dòng của bảng chuquan (manguoidung, hoten...)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) { setChuQuan(null); setLoading(false) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    supabase.from('chuquan').select('*').eq('auth_id', session.user.id).single()
      .then(({ data }) => { setChuQuan(data); setLoading(false) })
  }, [session])

  const signIn = async (tenDangNhap, matKhau) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: tenDangNhap.trim().toLowerCase() + EMAIL_DOMAIN,
      password: matKhau,
    })
    return error
  }
  const signOut = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ session, chuQuan, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
