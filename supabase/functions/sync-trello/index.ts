import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, verifyCronSecret, verifyAdmin, getAdminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: cron secret OR admin JWT
  const adminClient = getAdminClient();
  const isCron = await verifyCronSecret(req, adminClient);
  if (!isCron) {
    const adminId = await verifyAdmin(req, adminClient);
    if (!adminId) return jsonResponse({ error: "Unauthorized" }, 401);
  }



  try {
    const TRELLO_API_KEY = Deno.env.get("TRELLO_API_KEY");
    const TRELLO_TOKEN = Deno.env.get("TRELLO_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
      throw new Error("Missing Trello configuration");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    // Source of truth: A Fazer, Fazendo – Curto Prazo and Fazendo – Longo Prazo.
    const listIds = [
      "620c56ba85aa9536c3cbc86d",
      "620c56bd53d96f7e9ac3c1a6",
      "68ee51cadc1f85da721361b7",
    ];

    const allCards: { name: string }[] = [];
    for (const listId of listIds) {
      const trelloUrl = `https://api.trello.com/1/lists/${listId}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name`;
      const trelloRes = await fetch(trelloUrl);
      if (!trelloRes.ok) {
        const body = await trelloRes.text();
        throw new Error(`Trello API error on list ${listId} [${trelloRes.status}]: ${body}`);
      }
      const cards = await trelloRes.json();
      allCards.push(...cards);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const trelloNames: string[] = Array.from(
      new Set(allCards.map((c) => c.name.trim()).filter(Boolean)),
    );

    // Get existing construction sites
    const { data: existing, error: fetchErr } = await supabase
      .from("construction_sites")
      .select("id, name, active");
    if (fetchErr) throw fetchErr;

    const existingMap = new Map((existing || []).map((s: any) => [s.name.toLowerCase(), s]));

    let added = 0;
    let reactivated = 0;
    let deleted = 0;

    // Add or reactivate sites from Trello
    for (const name of trelloNames) {
      const key = name.toLowerCase();
      const existingSite = existingMap.get(key);
      if (!existingSite) {
        const { error } = await supabase.from("construction_sites").insert({ name, active: true });
        if (!error) added++;
      } else if (!existingSite.active) {
        const { error } = await supabase.from("construction_sites").update({ active: true }).eq("id", existingSite.id);
        if (!error) reactivated++;
      }
    }

    // Delete sites no longer in Trello "Fazendo"
    const trelloNamesLower = new Set(trelloNames.map(n => n.toLowerCase()));
    for (const site of (existing || [])) {
      if (!trelloNamesLower.has(site.name.toLowerCase())) {
        const { error } = await supabase.from("construction_sites").delete().eq("id", site.id);
        if (!error) deleted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total_trello_cards: trelloNames.length, added, reactivated, deleted },
        sites: trelloNames,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("sync-trello error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
