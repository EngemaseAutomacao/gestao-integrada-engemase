import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );

  const pub = new Uint8Array(
    await crypto.subtle.exportKey("raw", keyPair.publicKey)
  );

  const privJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const b64url = (arr: Uint8Array) =>
    btoa(String.fromCharCode(...arr))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return new Response(
    JSON.stringify({
      publicKey: b64url(pub),
      privateKey: privJwk.d,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
