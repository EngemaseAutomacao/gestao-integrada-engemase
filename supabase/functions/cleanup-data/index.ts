import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders, jsonResponse, verifyAdmin, getAdminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth: admin-only (destructive)
  const adminId = await verifyAdmin(req, getAdminClient());
  if (!adminId) return jsonResponse({ error: "Unauthorized" }, 401);



  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch enabled retention settings
    const { data: settings, error: settingsError } = await supabase
      .from("data_retention_settings")
      .select("*")
      .eq("enabled", true);

    if (settingsError) throw settingsError;
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: "No enabled retention settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, number> = {};

    for (const setting of settings) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - setting.retention_days);
      const cutoff = cutoffDate.toISOString();
      let deleted = 0;

      switch (setting.setting_key) {
        case "notifications": {
          const { data } = await supabase
            .from("notifications")
            .delete()
            .eq("read", true)
            .lt("created_at", cutoff)
            .select("id");
          deleted = data?.length || 0;
          break;
        }
        case "system_logs": {
          const { data } = await supabase
            .from("system_logs")
            .delete()
            .lt("created_at", cutoff)
            .select("id");
          deleted = data?.length || 0;
          break;
        }
        case "tool_checkout_history": {
          const { data } = await supabase
            .from("tool_checkouts")
            .delete()
            .eq("status", "checked_in")
            .lt("checkin_date", cutoff)
            .select("id");
          deleted = data?.length || 0;
          break;
        }
        case "vehicle_checkout_history": {
          const { data } = await supabase
            .from("vehicle_checkouts")
            .delete()
            .eq("status", "checked_in")
            .lt("checkin_date", cutoff)
            .select("id");
          deleted = data?.length || 0;
          break;
        }
        case "transfer_history": {
          const { data } = await supabase
            .from("asset_transfers")
            .delete()
            .in("status", ["approved", "rejected", "cancelled"])
            .lt("updated_at", cutoff)
            .select("id");
          deleted = data?.length || 0;
          break;
        }
        case "tool_checkout_photos": {
          // Clear photo URLs from old checked-in tool checkouts
          const { data: oldCheckouts } = await supabase
            .from("tool_checkouts")
            .select("id, checkout_photo_url, checkin_photo_url")
            .eq("status", "checked_in")
            .lt("checkin_date", cutoff)
            .or("checkout_photo_url.neq.,checkin_photo_url.neq.");

          if (oldCheckouts) {
            for (const co of oldCheckouts) {
              // Delete storage files
              const paths: string[] = [];
              if (co.checkout_photo_url) paths.push(co.checkout_photo_url);
              if (co.checkin_photo_url) paths.push(co.checkin_photo_url);
              
              if (paths.length > 0) {
                // Extract storage paths from URLs
                const storagePaths = paths
                  .map(url => {
                    const match = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^?]+)/);
                    return match ? decodeURIComponent(match[1]) : null;
                  })
                  .filter(Boolean) as string[];

                if (storagePaths.length > 0) {
                  const bucketPaths = storagePaths.map(p => {
                    const parts = p.split("/");
                    return { bucket: parts[0], path: parts.slice(1).join("/") };
                  });
                  
                  for (const bp of bucketPaths) {
                    await supabase.storage.from(bp.bucket).remove([bp.path]);
                  }
                }
              }

              await supabase
                .from("tool_checkouts")
                .update({ checkout_photo_url: null, checkin_photo_url: null })
                .eq("id", co.id);
            }
            deleted = oldCheckouts.length;
          }
          break;
        }
        case "vehicle_checkout_photos": {
          const photoColumns = [
            "photo_front_checkout", "photo_back_checkout", "photo_left_checkout",
            "photo_right_checkout", "photo_dashboard_checkout",
            "photo_front_checkin", "photo_back_checkin", "photo_left_checkin",
            "photo_right_checkin", "photo_dashboard_checkin",
          ];

          const { data: oldVehicleCheckouts } = await supabase
            .from("vehicle_checkouts")
            .select(`id, ${photoColumns.join(", ")}`)
            .eq("status", "checked_in")
            .lt("checkin_date", cutoff);

          if (oldVehicleCheckouts) {
            for (const vc of oldVehicleCheckouts) {
              const urls: string[] = [];
              for (const col of photoColumns) {
                const val = (vc as Record<string, unknown>)[col];
                if (val && typeof val === "string") urls.push(val);
              }

              // Delete from storage
              const storagePaths = urls
                .map(url => {
                  const match = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^?]+)/);
                  return match ? decodeURIComponent(match[1]) : null;
                })
                .filter(Boolean) as string[];

              for (const sp of storagePaths) {
                const parts = sp.split("/");
                const bucket = parts[0];
                const path = parts.slice(1).join("/");
                await supabase.storage.from(bucket).remove([path]);
              }

              const nullUpdates: Record<string, null> = {};
              for (const col of photoColumns) {
                if ((vc as Record<string, unknown>)[col]) nullUpdates[col] = null;
              }
              if (Object.keys(nullUpdates).length > 0) {
                await supabase.from("vehicle_checkouts").update(nullUpdates).eq("id", vc.id);
              }
            }
            deleted = oldVehicleCheckouts.length;
          }
          break;
        }
      }

      results[setting.setting_key] = deleted;
    }

    // Log the cleanup
    await supabase.from("system_logs").insert({
      action: "data_cleanup",
      entity_type: "system",
      details: { results, timestamp: new Date().toISOString() },
    });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
