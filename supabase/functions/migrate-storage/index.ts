import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results = { moved: 0, errors: 0, details: [] as string[] };

    // 1. Migrate tool-images bucket → imagens/ferramentas/
    const { data: toolFiles, error: toolErr } = await supabase.storage
      .from("tool-images")
      .list("", { limit: 500 });

    if (toolErr) {
      results.details.push(`Error listing tool-images: ${toolErr.message}`);
    } else if (toolFiles) {
      for (const file of toolFiles) {
        if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
        try {
          const { data: fileData, error: dlErr } = await supabase.storage
            .from("tool-images")
            .download(file.name);
          if (dlErr || !fileData) {
            results.details.push(`Error downloading tool-images/${file.name}: ${dlErr?.message}`);
            results.errors++;
            continue;
          }
          const newPath = `ferramentas/${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("imagens")
            .upload(newPath, fileData, { upsert: true });
          if (upErr) {
            results.details.push(`Error uploading imagens/${newPath}: ${upErr.message}`);
            results.errors++;
          } else {
            results.moved++;
            // Update tools table to reference new path
            const { data: { publicUrl: oldPublicUrl } } = supabase.storage
              .from("tool-images")
              .getPublicUrl(file.name);
            
            await supabase
              .from("tools")
              .update({ image_url: newPath })
              .eq("image_url", oldPublicUrl);
          }
        } catch (e) {
          results.details.push(`Exception for tool-images/${file.name}: ${e.message}`);
          results.errors++;
        }
      }
    }

    // 2. Migrate checkout-images bucket
    // Root files (tool checkout/checkin photos) → imagens/ferramentas/
    const { data: checkoutRoot, error: coErr } = await supabase.storage
      .from("checkout-images")
      .list("", { limit: 1000 });

    if (coErr) {
      results.details.push(`Error listing checkout-images root: ${coErr.message}`);
    } else if (checkoutRoot) {
      for (const file of checkoutRoot) {
        if (!file.name || file.name === ".emptyFolderPlaceholder" || !file.id) continue;
        try {
          const { data: fileData, error: dlErr } = await supabase.storage
            .from("checkout-images")
            .download(file.name);
          if (dlErr || !fileData) {
            results.errors++;
            continue;
          }
          const newPath = `ferramentas/${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("imagens")
            .upload(newPath, fileData, { upsert: true });
          if (upErr) {
            results.errors++;
          } else {
            results.moved++;
            // Update tool_checkouts table references
            const cols = ["checkout_photo_url", "checkin_photo_url", "checkout_signature_url", "checkin_signature_url"];
            for (const col of cols) {
              await supabase
                .from("tool_checkouts")
                .update({ [col]: newPath })
                .eq(col, file.name);
            }
          }
        } catch (e) {
          results.errors++;
        }
      }
    }

    // 3. Migrate checkout-images/vehicles/ → imagens/veiculos/saidas/ and entradas/
    const { data: vehicleFiles, error: vErr } = await supabase.storage
      .from("checkout-images")
      .list("vehicles", { limit: 1000 });

    if (vErr) {
      results.details.push(`Error listing checkout-images/vehicles: ${vErr.message}`);
    } else if (vehicleFiles) {
      for (const file of vehicleFiles) {
        if (!file.name || file.name === ".emptyFolderPlaceholder" || !file.id) continue;
        try {
          const { data: fileData, error: dlErr } = await supabase.storage
            .from("checkout-images")
            .download(`vehicles/${file.name}`);
          if (dlErr || !fileData) {
            results.errors++;
            continue;
          }
          // Determine if it's checkin (_in) or checkout (_out)
          const isCheckin = file.name.includes("_in_") || file.name.includes("_in.");
          const folder = isCheckin ? "veiculos/entradas" : "veiculos/saidas";
          const newPath = `${folder}/${file.name}`;
          
          const { error: upErr } = await supabase.storage
            .from("imagens")
            .upload(newPath, fileData, { upsert: true });
          if (upErr) {
            results.errors++;
          } else {
            results.moved++;
            // Update vehicle_checkouts references
            const oldPath = `vehicles/${file.name}`;
            const photoCols = [
              "photo_front_checkout", "photo_back_checkout", "photo_left_checkout", "photo_right_checkout",
              "photo_front_checkin", "photo_back_checkin", "photo_left_checkin", "photo_right_checkin",
            ];
            for (const col of photoCols) {
              await supabase
                .from("vehicle_checkouts")
                .update({ [col]: newPath })
                .eq(col, oldPath);
            }
          }
        } catch (e) {
          results.errors++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
