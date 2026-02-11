import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Web Push utilities
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

async function generateVapidJWT(
  audience: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const headerStr = JSON.stringify(header);
  const payloadStr = JSON.stringify(payload);
  
  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(headerStr));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(payloadStr));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = base64UrlToUint8Array(privateKey);
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    createPKCS8Key(privateKeyBytes),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signatureBuffer);
  const signatureB64 = uint8ArrayToBase64Url(signatureArray);

  return `${unsignedToken}.${signatureB64}`;
}

function createPKCS8Key(rawKey: Uint8Array): ArrayBuffer {
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20
  ]);
  
  const result = new Uint8Array(pkcs8Header.length + rawKey.length);
  result.set(pkcs8Header);
  result.set(rawKey, pkcs8Header.length);
  
  return result.buffer;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

    // Authenticate caller - require admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabaseAuth.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is admin
    const { data: callerProfile } = await supabaseAuth
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

    const { userId, title, body, type, toolId, checkoutId } = await req.json();

    if (!userId || !title) {
      return new Response(
        JSON.stringify({ error: 'userId and title are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = supabaseAuth;

    // Insert notification into database
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message: body || '',
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
        body: body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: notification.id,
        data: {
          notificationId: notification.id,
          type,
          toolId,
          checkoutId,
        },
      });

      for (const sub of subscriptions) {
        try {
          const url = new URL(sub.endpoint);
          const audience = `${url.protocol}//${url.host}`;

          const jwt = await generateVapidJWT(
            audience,
            'mailto:admin@engemase.com',
            VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY
          );

          const response = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'TTL': '86400',
              'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
            },
            body: pushPayload,
          });

          if (response.status === 410 || response.status === 404) {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
            
            pushResults.push({ endpoint: sub.endpoint, status: 'removed', reason: 'expired' });
          } else if (response.ok) {
            pushResults.push({ endpoint: sub.endpoint, status: 'sent' });
          } else {
            const text = await response.text();
            console.error('Push failed:', response.status, text);
            pushResults.push({ endpoint: sub.endpoint, status: 'failed', code: response.status, message: text });
          }
        } catch (pushError: unknown) {
          const errorMessage = pushError instanceof Error ? pushError.message : 'Unknown error';
          console.error('Push error for endpoint:', sub.endpoint, pushError);
          pushResults.push({ endpoint: sub.endpoint, status: 'error', message: errorMessage });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notification created',
        notification,
        pushResults,
        subscriptionsCount: subscriptions?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating notification:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
