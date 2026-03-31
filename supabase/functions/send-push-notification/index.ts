import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const encoder = new TextEncoder()
const DEFAULT_ICON = '/icon-192.png'
const DEFAULT_BADGE = '/mono-192.png'
const DEFAULT_TTL_SECONDS = '86400'
const AES128_RECORD_SIZE = 4096

type PushSubscriptionRecord = {
  endpoint: string
  p256dh: string
  auth: string
  id?: string
}

type PushResult = {
  endpoint: string
  status: 'sent' | 'failed' | 'error' | 'removed' | 'skipped'
  reason?: string
  code?: number
  message?: string
}

function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < array.byteLength; i++) {
    binary += String.fromCharCode(array[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(new ArrayBuffer(totalLength))
  let offset = 0

  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }

  return result
}

function uint32ToBigEndian(value: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(new ArrayBuffer(4))
  bytes[0] = (value >>> 24) & 0xff
  bytes[1] = (value >>> 16) & 0xff
  bytes[2] = (value >>> 8) & 0xff
  bytes[3] = value & 0xff
  return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(new ArrayBuffer(bytes.byteLength))
  copy.set(bytes)
  return copy.buffer
}

async function importHmacKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toArrayBuffer(keyBytes), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

async function hmacSha256(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const key = await importHmacKey(keyBytes)
  const signature = await crypto.subtle.sign('HMAC', key, toArrayBuffer(data))
  return new Uint8Array(signature)
}

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  return hmacSha256(salt.length > 0 ? salt : new Uint8Array(new ArrayBuffer(32)), ikm)
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array<ArrayBuffer>> {
  let output = new Uint8Array(new ArrayBuffer(0))
  let previous = new Uint8Array(new ArrayBuffer(0))
  let counter = 1

  while (output.length < length) {
    previous = await hmacSha256(prk, concatUint8Arrays(previous, info, new Uint8Array([counter])))
    output = concatUint8Arrays(output, previous)
    counter += 1
  }

  return output.slice(0, length) as Uint8Array<ArrayBuffer>
}

async function deriveVapidJwt(audience: string, subject: string, publicKey: string, privateKey: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { aud: audience, exp: now + 12 * 60 * 60, sub: subject }
  const headerB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(header)))
  const payloadB64 = uint8ArrayToBase64Url(encoder.encode(JSON.stringify(payload)))
  const unsignedToken = `${headerB64}.${payloadB64}`

  const publicKeyBytes = base64UrlToUint8Array(publicKey)
  const x = uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33))
  const y = uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65))

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKey, x, y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    encoder.encode(unsignedToken)
  )

  return `${unsignedToken}.${uint8ArrayToBase64Url(new Uint8Array(signatureBuffer))}`
}

async function encryptPushPayloadAes128Gcm(
  plaintext: string,
  clientPublicKeyBase64: string,
  clientAuthBase64: string
): Promise<Uint8Array<ArrayBuffer>> {
  const clientPublicKeyBytes = base64UrlToUint8Array(clientPublicKeyBase64)
  const clientAuthBytes = base64UrlToUint8Array(clientAuthBase64)

  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const serverPublicKeyBytes = new Uint8Array(await crypto.subtle.exportKey('raw', serverKeys.publicKey))

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(clientPublicKeyBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeys.privateKey,
      256
    )
  )

  const keyInfo = concatUint8Arrays(
    encoder.encode('WebPush: info'),
    new Uint8Array([0]),
    clientPublicKeyBytes,
    serverPublicKeyBytes
  )

  const authPrk = await hkdfExtract(clientAuthBytes, sharedSecret)
  const ikm = await hkdfExpand(authPrk, keyInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const contentPrk = await hkdfExtract(salt, ikm)
  const cek = await hkdfExpand(contentPrk, encoder.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdfExpand(contentPrk, encoder.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', toArrayBuffer(cek), { name: 'AES-GCM' }, false, ['encrypt'])
  const recordPlaintext = concatUint8Arrays(encoder.encode(plaintext), new Uint8Array([0x02]))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce, tagLength: 128 },
      aesKey,
      toArrayBuffer(recordPlaintext)
    )
  )

  const header = concatUint8Arrays(
    salt,
    uint32ToBigEndian(AES128_RECORD_SIZE),
    new Uint8Array([serverPublicKeyBytes.length]),
    serverPublicKeyBytes
  )

  return concatUint8Arrays(header, ciphertext)
}

function buildPushPayload(payload: { title?: string; body?: string; tag?: string; data?: Record<string, unknown> }) {
  return JSON.stringify({
    title: payload.title || 'Nova Notificação',
    body: payload.body || '',
    icon: DEFAULT_ICON,
    badge: DEFAULT_BADGE,
    tag: payload.tag || 'notification',
    data: payload.data || {},
  })
}

async function sendPushToSubscription(
  sub: PushSubscriptionRecord,
  pushPayload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  supabase?: any
): Promise<PushResult> {
  try {
    if (!sub.endpoint || !sub.p256dh || !sub.auth) {
      return { endpoint: sub.endpoint || 'unknown', status: 'skipped', reason: 'invalid-subscription' }
    }

    const url = new URL(sub.endpoint)
    const audience = `${url.protocol}//${url.host}`
    const jwt = await deriveVapidJwt(audience, 'mailto:admin@engemase.com', vapidPublicKey, vapidPrivateKey)
    const encryptedBody = await encryptPushPayloadAes128Gcm(pushPayload, sub.p256dh, sub.auth)

    const response = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'TTL': DEFAULT_TTL_SECONDS,
        'Content-Length': String(encryptedBody.byteLength),
      },
      body: encryptedBody,
    })

    if (response.status === 404 || response.status === 410) {
      if (supabase && sub.id) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
      return { endpoint: sub.endpoint, status: 'removed', reason: 'expired' }
    }

    if (response.ok || response.status === 201) {
      return { endpoint: sub.endpoint, status: 'sent' }
    }

    const responseText = await response.text()
    console.error('Push delivery failed', { endpoint: sub.endpoint, status: response.status, body: responseText })
    return {
      endpoint: sub.endpoint,
      status: 'failed',
      code: response.status,
      message: responseText,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Push encryption/delivery error', { endpoint: sub.endpoint, message })
    return { endpoint: sub.endpoint, status: 'error', message }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Backend configuration missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    if (body.subscription) {
      const { subscription, title, body: messageBody, tag, data } = body

      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(JSON.stringify({ error: 'Invalid subscription data' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const pushPayload = buildPushPayload({ title, body: messageBody, tag, data })
      const result = await sendPushToSubscription(
        {
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        pushPayload,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      )

      return new Response(JSON.stringify({ success: result.status === 'sent', result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser(token)

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { userId, title, body: msgBody, type, toolId, checkoutId } = body

    if (!userId || !title) {
      return new Response(JSON.stringify({ error: 'userId and title are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message: msgBody || '',
        type: type || 'return_reminder',
        tool_id: toolId || null,
        checkout_id: checkoutId || null,
        read: false,
      })
      .select()
      .single()

    if (notifError) {
      throw new Error(`Failed to create notification: ${notifError.message}`)
    }

    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (subscriptionsError) {
      console.error('Error fetching subscriptions', subscriptionsError)
    }

    const pushResults: PushResult[] = []

    if (subscriptions?.length) {
      const pushPayload = buildPushPayload({
        title,
        body: msgBody,
        tag: notification.id,
        data: { notificationId: notification.id, type, toolId, checkoutId },
      })

      for (const sub of subscriptions) {
        const result = await sendPushToSubscription(sub, pushPayload, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, supabase)
        pushResults.push(result)
      }
    }

    const sentCount = pushResults.filter((result) => result.status === 'sent').length

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        pushResults,
        subscriptionsCount: subscriptions?.length || 0,
        sentCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('send-push-notification error', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
