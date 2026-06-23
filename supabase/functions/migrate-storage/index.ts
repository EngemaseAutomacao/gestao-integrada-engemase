import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, verifyAdmin, getAdminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: admin-only (storage mutations)
  const adminId = await verifyAdmin(req, getAdminClient());
  if (!adminId) return jsonResponse({ error: "Unauthorized" }, 401);



  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results = { moved: 0, errors: 0, skipped: 0, details: [] as string[] };
    let seqCounter = 1;

    const genName = (prefix: string, ext: string) => {
      const date = new Date().toISOString().slice(0, 10);
      const seq = String(seqCounter++).padStart(4, "0");
      return `${prefix}_${date}_${seq}.${ext}`;
    };

    const getExt = (name: string) => {
      const parts = name.split(".");
      return parts.length > 1 ? parts.pop()! : "jpg";
    };

    const moveFile = async (
      srcBucket: string, srcPath: string,
      dstFolder: string, namePrefix: string,
      dbUpdates: { table: string; column: string; oldValue: string }[]
    ) => {
      try {
        const { data: fileData, error: dlErr } = await supabase.storage
          .from(srcBucket)
          .download(srcPath);
        if (dlErr || !fileData) {
          results.details.push(`DL error ${srcBucket}/${srcPath}: ${dlErr?.message}`);
          results.errors++;
          return;
        }

        const ext = getExt(srcPath);
        const newName = genName(namePrefix, ext);
        const newPath = `${dstFolder}/${newName}`;

        const { error: upErr } = await supabase.storage
          .from("imagens")
          .upload(newPath, fileData, { upsert: true });
        if (upErr) {
          results.details.push(`Upload error ${newPath}: ${upErr.message}`);
          results.errors++;
          return;
        }

        // Update DB references
        for (const upd of dbUpdates) {
          await supabase
            .from(upd.table)
            .update({ [upd.column]: newPath })
            .eq(upd.column, upd.oldValue);
        }

        results.moved++;
      } catch (e) {
        results.details.push(`Exception: ${e.message}`);
        results.errors++;
      }
    };

    // ===== 1. tool-images bucket → ferramentas/catalogo/ =====
    const { data: toolFiles } = await supabase.storage.from("tool-images").list("", { limit: 500 });
    if (toolFiles) {
      for (const file of toolFiles) {
        if (!file.name || file.name === ".emptyFolderPlaceholder" || !file.id) continue;
        // Get the public URL to match DB
        const { data: { publicUrl } } = supabase.storage.from("tool-images").getPublicUrl(file.name);
        await moveFile("tool-images", file.name, "ferramentas/catalogo", "ferramenta", [
          { table: "tools", column: "image_url", oldValue: publicUrl },
          { table: "tools", column: "image_url", oldValue: file.name },
        ]);
      }
    }

    // ===== 2. checkout-images root files → ferramentas/saidas/ or ferramentas/entradas/ =====
    const { data: checkoutRoot } = await supabase.storage.from("checkout-images").list("", { limit: 1000 });
    if (checkoutRoot) {
      for (const file of checkoutRoot) {
        if (!file.name || file.name === ".emptyFolderPlaceholder" || !file.id) continue;
        const isCheckin = file.name.startsWith("checkin_");
        const folder = isCheckin ? "ferramentas/entradas" : "ferramentas/saidas";
        const prefix = isCheckin ? "entrada_foto" : "saida_foto";
        
        const cols = isCheckin
          ? ["checkin_photo_url", "checkin_signature_url"]
          : ["checkout_photo_url", "checkout_signature_url"];

        const dbUpdates = cols.map(col => ({
          table: "tool_checkouts",
          column: col,
          oldValue: file.name,
        }));

        await moveFile("checkout-images", file.name, folder, prefix, dbUpdates);
      }
    }

    // ===== 3. checkout-images/vehicles/ → veiculos/saidas/ or veiculos/entradas/ =====
    const vehicleFolders = ["vehicles", "veiculos/saidas", "veiculos/entradas"];
    for (const vFolder of vehicleFolders) {
      const { data: vehicleFiles } = await supabase.storage.from("checkout-images").list(vFolder, { limit: 1000 });
      if (vehicleFiles) {
        for (const file of vehicleFiles) {
          if (!file.name || file.name === ".emptyFolderPlaceholder" || !file.id) continue;
          const oldPath = `${vFolder}/${file.name}`;

          // Check if already exists in imagens
          const isCheckin = file.name.includes("_in_") || file.name.includes("_in.") || file.name.startsWith("entrada_") || vFolder.includes("entradas");
          const folder = isCheckin ? "veiculos/entradas" : "veiculos/saidas";
          const prefix = isCheckin ? "entrada_foto" : "saida_foto";

          const photoCols = [
            "photo_front_checkout", "photo_back_checkout", "photo_left_checkout", "photo_right_checkout",
            "photo_front_checkin", "photo_back_checkin", "photo_left_checkin", "photo_right_checkin",
          ];
          const dbUpdates = photoCols.map(col => ({
            table: "vehicle_checkouts",
            column: col,
            oldValue: oldPath,
          }));

          await moveFile("checkout-images", oldPath, folder, prefix, dbUpdates);
        }
      }
    }

    // ===== 4. Re-organize files already in imagens bucket (from previous migration) =====
    // Files in ferramentas/ root (not in subfolders) → move to proper subfolder
    const { data: ferRoot } = await supabase.storage.from("imagens").list("ferramentas", { limit: 500 });
    if (ferRoot) {
      for (const file of ferRoot) {
        if (!file.name || file.name === ".emptyFolderPlaceholder" || !file.id) continue;
        const oldPath = `ferramentas/${file.name}`;
        
        // Determine destination
        let folder: string;
        let prefix: string;
        if (file.name.startsWith("checkin_") || file.name.startsWith("entrada_")) {
          folder = "ferramentas/entradas";
          prefix = "entrada_foto";
        } else if (file.name.startsWith("checkout_") || file.name.startsWith("saida_")) {
          folder = "ferramentas/saidas";
          prefix = "saida_foto";
        } else {
          // Catalog image
          folder = "ferramentas/catalogo";
          prefix = "ferramenta";
        }

        try {
          const { data: fileData, error: dlErr } = await supabase.storage.from("imagens").download(oldPath);
          if (dlErr || !fileData) { results.errors++; continue; }

          const ext = getExt(file.name);
          const newName = genName(prefix, ext);
          const newPath = `${folder}/${newName}`;

          const { error: upErr } = await supabase.storage.from("imagens").upload(newPath, fileData, { upsert: true });
          if (upErr) { results.errors++; continue; }

          // Update all possible DB columns
          const toolCols = ["checkout_photo_url", "checkin_photo_url", "checkout_signature_url", "checkin_signature_url"];
          for (const col of toolCols) {
            await supabase.from("tool_checkouts").update({ [col]: newPath }).eq(col, oldPath);
          }
          await supabase.from("tools").update({ image_url: newPath }).eq("image_url", oldPath);

          // Delete old file
          await supabase.storage.from("imagens").remove([oldPath]);
          results.moved++;
        } catch (e) {
          results.errors++;
        }
      }
    }

    // Files in veiculos/ root → move to subfolders
    const { data: vehRoot } = await supabase.storage.from("imagens").list("veiculos", { limit: 500 });
    if (vehRoot) {
      for (const file of vehRoot) {
        if (!file.name || file.name === ".emptyFolderPlaceholder" || !file.id) continue;
        const oldPath = `veiculos/${file.name}`;
        const isCheckin = file.name.includes("_in_") || file.name.includes("_in.") || file.name.startsWith("entrada_");
        const folder = isCheckin ? "veiculos/entradas" : "veiculos/saidas";
        const prefix = isCheckin ? "entrada_foto" : "saida_foto";

        try {
          const { data: fileData, error: dlErr } = await supabase.storage.from("imagens").download(oldPath);
          if (dlErr || !fileData) { results.errors++; continue; }

          const ext = getExt(file.name);
          const newName = genName(prefix, ext);
          const newPath = `${folder}/${newName}`;

          const { error: upErr } = await supabase.storage.from("imagens").upload(newPath, fileData, { upsert: true });
          if (upErr) { results.errors++; continue; }

          const photoCols = [
            "photo_front_checkout", "photo_back_checkout", "photo_left_checkout", "photo_right_checkout",
            "photo_front_checkin", "photo_back_checkin", "photo_left_checkin", "photo_right_checkin",
          ];
          for (const col of photoCols) {
            await supabase.from("vehicle_checkouts").update({ [col]: newPath }).eq(col, oldPath);
          }
          await supabase.from("vehicles").update({ image_url: newPath }).eq("image_url", oldPath);

          await supabase.storage.from("imagens").remove([oldPath]);
          results.moved++;
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
