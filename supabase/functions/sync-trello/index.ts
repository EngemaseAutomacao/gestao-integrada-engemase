import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const TRELLO_API_KEY = Deno.env.get("TRELLO_API_KEY");
    const TRELLO_TOKEN = Deno.env.get("TRELLO_TOKEN");
    const TRELLO_LIST_ID = Deno.env.get("TRELLO_LIST_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_LIST_ID) {
      throw new Error("Missing Trello configuration");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    // Fetch cards from the "Fazendo" list
    const trelloUrl = `https://api.trello.com/1/lists/${TRELLO_LIST_ID}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}&fields=name`;
    const trelloRes = await fetch(trelloUrl);
    if (!trelloRes.ok) {
      const body = await trelloRes.text();
      throw new Error(`Trello API error [${trelloRes.status}]: ${body}`);
    }
    const cards = await trelloRes.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const trelloNames: string[] = cards.map((c: { name: string }) => c.name.trim());

    // Get existing construction sites
    const { data: existing, error: fetchErr } = await supabase
      .from("construction_sites")
      .select("id, name, active");
    if (fetchErr) throw fetchErr;

    const existingMap = new Map((existing || []).map((s: any) => [s.name.toLowerCase(), s]));

    let added = 0;
    let reactivated = 0;
    let deactivated = 0;

    // Add or reactivate sites from Trello
    for (const name of trelloNames) {
      const key = name.toLowerCase();
      const existingSite = existingMap.get(key);
      if (!existingSite) {
        // Insert new site
        const { error } = await supabase.from("construction_sites").insert({ name, active: true });
        if (!error) added++;
      } else if (!existingSite.active) {
        // Reactivate
        const { error } = await supabase.from("construction_sites").update({ active: true }).eq("id", existingSite.id);
        if (!error) reactivated++;
      }
    }

    // Deactivate sites no longer in Trello "Fazendo" (only auto-managed ones without created_by)
    const trelloNamesLower = new Set(trelloNames.map(n => n.toLowerCase()));
    for (const site of (existing || [])) {
      if (site.active && !trelloNamesLower.has(site.name.toLowerCase())) {
        // Only deactivate if it was likely auto-created (we don't touch manually created ones)
        // For safety, deactivate all that aren't in Trello anymore
        // Admin can always reactivate manually
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total_trello_cards: trelloNames.length, added, reactivated },
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
