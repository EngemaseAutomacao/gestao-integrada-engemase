// Shared auth helpers for edge functions.
// NOTE: each function still imports createClient itself; this file only exports pure helpers.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

export function getAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

/**
 * Verifies a request comes from a trusted cron invocation.
 * Returns true if the `x-cron-secret` header matches the vault-stored secret.
 */
export async function verifyCronSecret(req: Request, admin?: SupabaseClient): Promise<boolean> {
  const secret = req.headers.get('x-cron-secret')
  if (!secret) return false
  const client = admin ?? getAdminClient()
  const { data, error } = await client.rpc('verify_cron_secret', { _secret: secret })
  if (error) {
    console.warn('verify_cron_secret error:', error.message)
    return false
  }
  return data === true
}

/**
 * Verifies the caller is an authenticated admin. Returns the user id if so, null otherwise.
 */
export async function verifyAdmin(req: Request, admin?: SupabaseClient): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7)
  const client = admin ?? getAdminClient()
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') return null
  return data.user.id
}

/**
 * Verifies any authenticated user. Returns the user id if so, null otherwise.
 */
export async function verifyUser(req: Request, admin?: SupabaseClient): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.toLowerCase().startsWith('bearer ')) return null
  const token = authHeader.slice(7)
  const client = admin ?? getAdminClient()
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  return data.user.id
}

/**
 * Allowlist of trusted push-service hostnames (Web Push providers).
 */
const PUSH_HOST_ALLOWLIST = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'updates.push.services.mozilla.com',
  'updates-autopush.stage.mozaws.net',
  'updates-autopush.dev.mozaws.net',
  'web.push.apple.com',
  'wns2-bl2p.notify.windows.com',
]

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return PUSH_HOST_ALLOWLIST.some((allowed) =>
      host === allowed || host.endsWith('.' + allowed.split('.').slice(-2).join('.'))
    )
  } catch {
    return false
  }
}
