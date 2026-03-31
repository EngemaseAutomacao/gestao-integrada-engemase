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

    const results = { moved: 0, errors: 0, skipped: 0, details: [] as string[] };

    const getExt = (name: string) => {
      const parts = name.split(".");
      return parts.length > 1 ? parts.pop()! : "jpg";
    };

    // Extract date from filename like saida_front_out_2026-03-31_123456.jpg
    // or ferramenta_2026-03-31_0001.jpg or entrada_photo_2026-03-31_123456.jpg
    const extractDate = (name: string): string | null => {
      const match = name.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    };

    const moveFileInBucket = async (
      oldPath: string,
      newPath: string,
      dbUpdates: { table: string; column: string }[]
    ) => {
      try {
        const { data: fileData, error: dlErr } = await supabase.storage
          .from("imagens")
          .download(oldPath);

        if (dlErr || !fileData) {
          results.details.push(`DL error ${oldPath}: ${dlErr?.message}`);
          results.errors++;
          return;
        }

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
            .eq(upd.column, oldPath);
        }

        // Remove old file
        await supabase.storage.from("imagens").remove([oldPath]);
        results.moved++;
        results.details.push(`Moved: ${oldPath} → ${newPath}`);
      } catch (e) {
        results.details.push(`Exception moving ${oldPath}: ${e.message}`);
        results.errors++;
      }
    };

    // Folders to reorganize: files directly in these folders need to move to date subfolders
    const foldersToReorganize = [
      {
        path: "ferramentas/catalogo",
        dbUpdates: [{ table: "tools", column: "image_url" }],
      },
      {
        path: "ferramentas/saidas",
        dbUpdates: [
          { table: "tool_checkouts", column: "checkout_photo_url" },
          { table: "tool_checkouts", column: "checkout_signature_url" },
        ],
      },
      {
        path: "ferramentas/entradas",
        dbUpdates: [
          { table: "tool_checkouts", column: "checkin_photo_url" },
          { table: "tool_checkouts", column: "checkin_signature_url" },
        ],
      },
      {
        path: "veiculos/catalogo",
        dbUpdates: [{ table: "vehicles", column: "image_url" }],
      },
      {
        path: "veiculos/saidas",
        dbUpdates: [
          { table: "vehicle_checkouts", column: "photo_front_checkout" },
          { table: "vehicle_checkouts", column: "photo_back_checkout" },
          { table: "vehicle_checkouts", column: "photo_left_checkout" },
          { table: "vehicle_checkouts", column: "photo_right_checkout" },
          { table: "vehicle_checkouts", column: "photo_dashboard_checkout" },
        ],
      },
      {
        path: "veiculos/entradas",
        dbUpdates: [
          { table: "vehicle_checkouts", column: "photo_front_checkin" },
          { table: "vehicle_checkouts", column: "photo_back_checkin" },
          { table: "vehicle_checkouts", column: "photo_left_checkin" },
          { table: "vehicle_checkouts", column: "photo_right_checkin" },
          { table: "vehicle_checkouts", column: "photo_dashboard_checkin" },
        ],
      },
    ];

    for (const folder of foldersToReorganize) {
      const { data: items, error: listErr } = await supabase.storage
        .from("imagens")
        .list(folder.path, { limit: 500 });

      if (listErr) {
        results.details.push(`List error ${folder.path}: ${listErr.message}`);
        results.errors++;
        continue;
      }

      if (!items) continue;

      // Only process actual files (items with id), skip subfolders
      const filesInFolder = items.filter(
        (f) => f.name !== ".emptyFolderPlaceholder" && f.id
      );

      for (const file of filesInFolder) {
        const oldPath = `${folder.path}/${file.name}`;
        const dateStr = extractDate(file.name);

        if (!dateStr) {
          // No date in filename, use file created_at or today
          const fallbackDate = file.created_at
            ? new Date(file.created_at).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

          const newPath = `${folder.path}/${fallbackDate}/${file.name}`;
          await moveFileInBucket(oldPath, newPath, folder.dbUpdates);
        } else {
          // Has date in filename, move to date subfolder
          const newPath = `${folder.path}/${dateStr}/${file.name}`;
          await moveFileInBucket(oldPath, newPath, folder.dbUpdates);
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
