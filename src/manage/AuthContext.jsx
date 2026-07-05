import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured, mobileToEmail } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null) // { id, full_name, role, active }
  const [loading, setLoading] = useState(true)

  // Load the logged-in user's profile row (their name + role).
  const loadProfile = useCallback(async (userId) => {
    if (!supabase || !userId) { setProfile(null); return }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, active')
      .eq('id', userId)
      .single()
    if (error) { setProfile(null); return }
    setProfile(data)
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      await loadProfile(newSession?.user?.id)
    })

    return () => { active = false; sub.subscription.unsubscribe() }
  }, [loadProfile])

  // Sign in with mobile number + PIN (no SMS — mapped to an internal email).
  async function signInWithMobilePin(mobile, pin) {
    if (!supabase) return { error: { message: 'App is not connected to the database yet.' } }
    const email = mobileToEmail(mobile)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pin })
    return { error }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const role = profile?.role || null
  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    isAuthenticated: Boolean(session),
    role,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin', // owner is a super-admin
    isStaff: role === 'staff',
    canSeeMoney: role === 'owner' || role === 'admin',
    signInWithMobilePin,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
