import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ---- Web Push Encryption (RFC 8291 / aes128gcm) ----

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - base64Url.length % 4) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < array.byteLength; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, salt.length > 0 ? salt : new Uint8Array(32)));
  const prkKey = await crypto.subtle.importKey('raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const infoWithCounter = concatUint8Arrays(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoWithCounter));
  return okm.slice(0, length);
}

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const padding = new Uint8Array(1);
  const header = encoder.encode('Content-Encoding: ');
  const clientLen = new Uint8Array(2);
  clientLen[0] = 0;
  clientLen[1] = clientPublicKey.length;
  const serverLen = new Uint8Array(2);
  serverLen[0] = 0;
  serverLen[1] = serverPublicKey.length;
  return concatUint8Arrays(
    header, typeBytes, padding,
    encoder.encode('P-256'), padding,
    clientLen, clientPublicKey,
    serverLen, serverPublicKey
  );
}

async function encryptPayload(
  plaintext: string,
  clientPublicKeyBase64: string,
  clientAuthBase64: string,
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKeyBytes: Uint8Array }> {
  const clientPublicKeyBytes = base64UrlToUint8Array(clientPublicKeyBase64);
  const clientAuthBytes = base64UrlToUint8Array(clientAuthBase64);

  const serverKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey)
  );

  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientPublicKeyBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeys.privateKey,
      256
    )
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const authInfo = new TextEncoder().encode('Content-Encoding: auth\0');
  const prk = await hkdf(clientAuthBytes, sharedSecret, authInfo, 32);
  const contentEncKeyInfo = createInfo('aesgcm', clientPublicKeyBytes, serverPublicKeyRaw);
  const contentEncKey = await hkdf(salt, prk, contentEncKeyInfo, 16);
  const nonceInfo = createInfo('nonce', clientPublicKeyBytes, serverPublicKeyRaw);
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  const aesKey = await crypto.subtle.importKey('raw', contentEncKey, { name: 'AES-GCM' }, false, ['encrypt']);
  const paddingLength = new Uint8Array(2);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const paddedPlaintext = concatUint8Arrays(paddingLength, plaintextBytes);

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, paddedPlaintext)
  );

  return { ciphertext: encrypted, salt, serverPublicKeyBytes: serverPublicKeyRaw };
}

// ---- VAPID JWT ----

function publicKeyToXY(publicKeyBase64Url: string): { x: string; y: string } {
  const pubBytes = base64UrlToUint8Array(publicKeyBase64Url);
  return {
    x: uint8ArrayToBase64Url(pubBytes.slice(1, 33)),
    y: uint8ArrayToBase64Url(pubBytes.slice(33, 65)),
  };
}

async function generateVapidJWT(audience: string, subject: string, publicKey: string, privateKey: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 60 * 60, sub: subject };
  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  const { x, y } = publicKeyToXY(publicKey);
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKey, x, y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  return `${unsignedToken}.${uint8ArrayToBase64Url(new Uint8Array(signatureBuffer))}`;
}

// ---- Send push to a single subscription ----

async function sendPushToSubscription(
  sub: { endpoint: string; p256dh: string; auth: string; id?: string },
  pushPayload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  supabase?: any
): Promise<{ endpoint: string; status: string; reason?: string; code?: number; message?: string }> {
  try {
    const url = new URL(sub.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await generateVapidJWT(audience, 'mailto:admin@engemase.com', vapidPublicKey, vapidPrivateKey);
    const { ciphertext, salt, serverPublicKeyBytes } = await encryptPayload(pushPayload, sub.p256dh, sub.auth);

    const response = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aesgcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Crypto-Key': `dh=${uint8ArrayToBase64Url(serverPublicKeyBytes)};p256ecdsa=${vapidPublicKey}`,
        'Encryption': `salt=${uint8ArrayToBase64Url(salt)}`,
      },
      body: ciphertext,
    });

    if (response.status === 410 || response.status === 404) {
      if (supabase && sub.id) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      }
      return { endpoint: sub.endpoint, status: 'removed', reason: 'expired' };
    } else if (response.ok || response.status === 201) {
      return { endpoint: sub.endpoint, status: 'sent' };
    } else {
      const text = await response.text();
      console.error('Push failed:', response.status, text);
      return { endpoint: sub.endpoint, status: 'failed', code: response.status, message: text };
    }
  } catch (pushError: unknown) {
    const errorMessage = pushError instanceof Error ? pushError.message : 'Unknown error';
    console.error('Push error for endpoint:', sub.endpoint, pushError);
    return { endpoint: sub.endpoint, status: 'error', message: errorMessage };
  }
}

// ---- Main Handler ----

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---- MODE 1: Trigger-based call (subscription object in body) ----
    if (body.subscription) {
      console.log('Trigger-based push notification call');
      const { subscription, title, body: messageBody, tag } = body;

      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(
          JSON.stringify({ error: 'Invalid subscription data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        return new Response(
          JSON.stringify({ error: 'VAPID keys not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const pushPayload = JSON.stringify({
        title: title || 'Nova Notificação',
        body: messageBody || '',
        icon: '/icon-192.png',
        tag: tag || 'notification',
      });

      const result = await sendPushToSubscription(
        { endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        pushPayload,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
      );

      console.log('Push result:', JSON.stringify(result));

      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ---- MODE 2: Admin API call (userId in body) ----
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabase.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, title, body: msgBody, type, toolId, checkoutId } = body;

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: 'userId and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert notification into database
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
      .single();

    if (notifError) {
      throw new Error('Failed to create notification: ' + notifError.message);
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
    }

    const pushResults: Array<{ endpoint: string; status: string; reason?: string; code?: number; message?: string }> = [];

    if (subscriptions && subscriptions.length > 0 && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      const pushPayload = JSON.stringify({
        title,
        body: msgBody || '',
        icon: '/icon-192.png',
        tag: notification.id,
        data: { notificationId: notification.id, type, toolId, checkoutId },
      });

      for (const sub of subscriptions) {
        const result = await sendPushToSubscription(sub, pushPayload, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, supabase);
        pushResults.push(result);
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification, pushResults, subscriptionsCount: subscriptions?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
