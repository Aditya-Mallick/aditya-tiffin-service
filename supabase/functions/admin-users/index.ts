// Edge Function: admin-users
// Lets the Owner/Admin create, re-PIN, enable/disable, or delete logins from
// inside the app. It runs on Supabase's servers and uses the SECRET service
// role key, which must NEVER be shipped in the browser.
//
// Deploy (see docs/PHASE_0_SETUP.md, step 6):
//   supabase functions deploy admin-users
//
// Rules enforced here:
//   - caller must be signed in and be 'owner' or 'admin'
//   - only an 'owner' may create/modify an 'owner' or 'admin'
//   - an 'admin' may only manage 'staff'

import { createClient } from 'jsr:@supabase/supabase-js@2'

const DOMAIN = Deno.env.get('LOGIN_EMAIL_DOMAIN') ?? 'tiffin.local'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  // Must include every header the Supabase browser client sends, or the
  // preflight fails with "Failed to send a request to the Edge Function".
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function mobileToEmail(mobile: string) {
  let d = String(mobile ?? '').replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  return { digits: d, email: `${d}@${DOMAIN}` }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json(405, { error: 'Use POST' })

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization') ?? ''

  // Identify the caller and read their role (RLS applies to this client).
  // Everything is guarded so an internal error can never drop CORS headers.
  let myRole: string | undefined
  try {
    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } })
    const userRes = await caller.auth.getUser()
    const user = userRes?.data?.user
    if (!user) return json(401, { error: 'Not signed in' })
    const { data: me } = await caller.from('profiles').select('role').eq('id', user.id).single()
    myRole = me?.role
  } catch (e) {
    return json(500, { error: 'Auth check failed: ' + String(e) })
  }
  if (myRole !== 'owner' && myRole !== 'admin') return json(403, { error: 'Not allowed' })

  let body: any
  try { body = await req.json() } catch { return json(400, { error: 'Bad JSON' }) }
  const action = body?.action

  // Admin client: bypasses RLS, can manage auth users.
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

  // An admin can only ever touch staff-level accounts.
  const guardTargetRole = (targetRole: string) => {
    if (myRole === 'owner') return null
    if (targetRole === 'staff') return null
    return json(403, { error: 'Only the owner can manage admins/owners.' })
  }

  try {
    if (action === 'create') {
      const { full_name, mobile, pin, role } = body
      const targetRole = role ?? 'staff'
      const guard = guardTargetRole(targetRole)
      if (guard) return guard
      if (!full_name || !mobile || !pin) return json(400, { error: 'Missing full_name, mobile or pin' })

      const { digits, email } = mobileToEmail(mobile)
      if (digits.length < 10) return json(400, { error: 'Invalid mobile number' })

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password: String(pin), email_confirm: true,
      })
      if (cErr) return json(400, { error: cErr.message })

      const { error: pErr } = await admin.from('profiles').insert({
        id: created.user.id, full_name, mobile: digits, role: targetRole, active: true,
      })
      if (pErr) {
        await admin.auth.admin.deleteUser(created.user.id) // roll back
        return json(400, { error: pErr.message })
      }
      return json(200, { ok: true, id: created.user.id })
    }

    if (action === 'set_pin') {
      const { user_id, pin } = body
      const { data: target } = await admin.from('profiles').select('role').eq('id', user_id).single()
      const guard = guardTargetRole(target?.role ?? 'staff')
      if (guard) return guard
      const { error } = await admin.auth.admin.updateUserById(user_id, { password: String(pin) })
      if (error) return json(400, { error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'set_active') {
      const { user_id, active } = body
      const { data: target } = await admin.from('profiles').select('role').eq('id', user_id).single()
      const guard = guardTargetRole(target?.role ?? 'staff')
      if (guard) return guard
      const { error } = await admin.from('profiles').update({ active: Boolean(active) }).eq('id', user_id)
      if (error) return json(400, { error: error.message })
      return json(200, { ok: true })
    }

    if (action === 'delete') {
      const { user_id } = body
      const { data: target } = await admin.from('profiles').select('role').eq('id', user_id).single()
      const guard = guardTargetRole(target?.role ?? 'staff')
      if (guard) return guard
      const { error } = await admin.auth.admin.deleteUser(user_id) // cascades to profile
      if (error) return json(400, { error: error.message })
      return json(200, { ok: true })
    }

    return json(400, { error: 'Unknown action' })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
