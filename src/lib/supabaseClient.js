import { createClient } from '@supabase/supabase-js'

// These come from your free Supabase project (Project Settings → API).
// They are SAFE to expose in the browser: the anon key can only do what
// Row Level Security allows. See docs/PHASE_0_SETUP.md.
const url  = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Login uses "mobile number + PIN". Internally we map a mobile number to a
// synthetic email so we can use Supabase's free email/password auth without
// sending any SMS. e.g. 8800811493 -> 8800811493@tiffin.local
export const LOGIN_EMAIL_DOMAIN =
  import.meta.env.VITE_LOGIN_EMAIL_DOMAIN || 'tiffin.local'

export const isSupabaseConfigured = Boolean(url && anon)

export const supabase = isSupabaseConfigured ? createClient(url, anon) : null

// Keep only digits, so "+91 88008 11493" and "8800811493" resolve the same.
export function normalizeMobile(mobile) {
  const digits = String(mobile || '').replace(/\D/g, '')
  // Drop a leading country code 91 if a 12-digit number was entered.
  return digits.length === 12 && digits.startsWith('91')
    ? digits.slice(2)
    : digits
}

export function mobileToEmail(mobile) {
  return `${normalizeMobile(mobile)}@${LOGIN_EMAIL_DOMAIN}`
}
