// Edge Function: login-with-username
// Performs username -> email lookup server-side, then sign-in.
// Returns a generic error to prevent user enumeration.
// Rate-limited by IP to mitigate brute-force.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders, jsonResponse, getAdminClient } from '../_shared/auth.ts'
import { enforceRateLimit } from '../_shared/rateLimit.ts'

interface LoginBody {
  username?: unknown
  password?: unknown
}

const GENERIC_ERROR = 'Usuário ou senha inválidos'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  // ---- Rate limit by IP (10 attempts / minute) ----
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  const blocked = await enforceRateLimit({
    key: `login:${ip}`,
    limit: 10,
    windowSeconds: 60,
  })
  if (blocked) return blocked

  // ---- Parse + validate body ----
  let body: LoginBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: GENERIC_ERROR }, 400)
  }
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!username || !password || username.length > 100 || password.length > 200) {
    return jsonResponse({ error: GENERIC_ERROR }, 400)
  }

  const admin = getAdminClient()

  // ---- Lookup email from username (service-role) ----
  const { data: email, error: lookupError } = await admin.rpc('get_email_from_username', {
    _username: username,
  })

  // Always reply with generic error on any failure — no enumeration.
  if (lookupError || !email || typeof email !== 'string') {
    return jsonResponse({ error: GENERIC_ERROR }, 401)
  }

  // ---- Sign in using anon client (server-side) ----
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { data, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !data.session) {
    return jsonResponse({ error: GENERIC_ERROR }, 401)
  }

  // Return the session — frontend will hand it to supabase.auth.setSession()
  return jsonResponse({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  })
})
