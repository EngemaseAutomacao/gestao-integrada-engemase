// Rate limiting helper for edge functions.
// Uses fixed-window counters stored in public.rate_limits.
// NOT 100% race-free under heavy concurrency, but sufficient for abuse prevention.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { getAdminClient, jsonResponse } from './auth.ts'

export interface RateLimitOptions {
  /** Identifier for the bucket. Typically `${fnName}:${userId|ip}`. */
  key: string
  /** Maximum requests allowed in the window. */
  limit: number
  /** Window length in seconds. */
  windowSeconds: number
  /** Optional admin client to reuse. */
  admin?: SupabaseClient
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

/**
 * Checks (and atomically increments) a rate-limit bucket.
 * Returns whether the request is allowed.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = opts
  const client = opts.admin ?? getAdminClient()

  // Compute window-start bucket (floor of now / window).
  const now = Date.now()
  const windowMs = windowSeconds * 1000
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs)
  const resetAt = new Date(windowStart.getTime() + windowMs)

  // Upsert: insert with count=1, or read existing then update.
  // Two-step (read + write) — acceptable for abuse prevention.
  const { data: existing, error: selectError } = await client
    .from('rate_limits')
    .select('id, request_count')
    .eq('bucket_key', key)
    .eq('window_start', windowStart.toISOString())
    .maybeSingle()

  if (selectError) {
    console.error('[rateLimit] select error, failing open:', selectError.message)
    return { allowed: true, remaining: limit, resetAt }
  }

  if (!existing) {
    const { error: insertError } = await client.from('rate_limits').insert({
      bucket_key: key,
      window_start: windowStart.toISOString(),
      request_count: 1,
    })
    // Ignore unique-constraint conflicts (concurrent insert) — re-read.
    if (insertError && !insertError.message?.includes('duplicate')) {
      console.error('[rateLimit] insert error, failing open:', insertError.message)
    }
    return { allowed: 1 <= limit, remaining: Math.max(0, limit - 1), resetAt }
  }

  const newCount = existing.request_count + 1
  if (newCount > limit) {
    return { allowed: false, remaining: 0, resetAt }
  }

  const { error: updateError } = await client
    .from('rate_limits')
    .update({ request_count: newCount })
    .eq('id', existing.id)

  if (updateError) {
    console.error('[rateLimit] update error, failing open:', updateError.message)
  }

  return { allowed: true, remaining: Math.max(0, limit - newCount), resetAt }
}

/**
 * Convenience: returns a 429 response with headers, or null if allowed.
 * Usage:
 *   const blocked = await enforceRateLimit({ key: `fn:${userId}`, limit: 10, windowSeconds: 60 })
 *   if (blocked) return blocked
 */
export async function enforceRateLimit(opts: RateLimitOptions): Promise<Response | null> {
  const result = await checkRateLimit(opts)
  if (result.allowed) return null
  const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
  return jsonResponse(
    {
      error: 'Too many requests',
      message: 'Limite de requisições excedido. Tente novamente em alguns instantes.',
      retry_after_seconds: retryAfter,
    },
    429,
  )
}
