import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    const GOOGLE_SHEET_ID = Deno.env.get("GOOGLE_SHEET_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_SHEET_ID) {
      throw new Error("Missing Google Sheets configuration");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    // Fetch data from Google Sheets (columns B-H, skipping row number column A)
    const range = "B2:H";
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${range}?key=${GOOGLE_SHEETS_API_KEY}`;
    const sheetsRes = await fetch(sheetsUrl);
    if (!sheetsRes.ok) {
      const body = await sheetsRes.text();
      throw new Error(`Google Sheets API error [${sheetsRes.status}]: ${body}`);
    }
    const sheetsData = await sheetsRes.json();
    const rows: string[][] = sheetsData.values || [];

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse rows into tool objects
    // Columns: Nome | Descrição | TAG | Marca | Estado | Quantidade | Apenas Funcionários
    const conditionMap: Record<string, string> = {
      "excelente": "excellent",
      "bom": "good",
      "regular": "fair",
      "ruim": "poor",
      "manutenção": "needs_maintenance",
      "manutencao": "needs_maintenance",
      "excellent": "excellent",
      "good": "good",
      "fair": "fair",
      "poor": "poor",
      "needs_maintenance": "needs_maintenance",
    };

    const sheetTools = rows
      .filter((row) => row[0] && row[0].trim() !== "")
      .map((row) => {
        const name = (row[0] || "").trim();
        const description = (row[1] || "").trim() || null;
        const tag = (row[2] || "").trim() || null;
        const brand = (row[3] || "").trim() || null;
        const rawCondition = (row[4] || "").trim().toLowerCase();
        const condition = rawCondition ? (conditionMap[rawCondition] || null) : null;
        const rawQty = (row[5] || "").trim();
        const parsedQty = parseInt(rawQty, 10);
        const quantityTotal = rawQty === "" || isNaN(parsedQty) ? null : parsedQty;
        const employeeOnlyRaw = (row[6] || "").trim().toLowerCase();
        const employeeOnly = ["sim", "yes", "true", "1", "x"].includes(employeeOnlyRaw);

        return { name, description, tag, brand, condition, quantity_total: quantityTotal, employee_only: employeeOnly };
      });

    // Get existing tools from DB
    const { data: existing, error: fetchErr } = await supabase
      .from("tools")
      .select("id, name, description, tag, brand, condition, quantity_total, quantity_available, employee_only");
    if (fetchErr) throw fetchErr;

    const existingMap = new Map((existing || []).map((t: any) => [t.name.toLowerCase(), t]));
    const sheetNamesLower = new Set(sheetTools.map((t) => t.name.toLowerCase()));

    let added = 0;
    let updated = 0;
    let deleted = 0;
    const errors: string[] = [];

    // Add or update tools from sheet
    for (const tool of sheetTools) {
      const key = tool.name.toLowerCase();
      const existingTool = existingMap.get(key);

      if (!existingTool) {
        // Insert new tool — apply defaults when sheet cells are blank
        const insertPayload = {
          name: tool.name,
          description: tool.description,
          tag: tool.tag,
          brand: tool.brand,
          condition: tool.condition ?? "good",
          quantity_total: tool.quantity_total ?? 1,
          quantity_available: tool.quantity_total ?? 1,
          employee_only: tool.employee_only,
        };
        const { error } = await supabase.from("tools").insert(insertPayload);
        if (error) {
          errors.push(`insert "${tool.name}": ${error.message}`);
        } else {
          added++;
        }
      } else {
        // Preserve existing values when sheet cell is blank
        const finalCondition = tool.condition ?? existingTool.condition;
        const finalQtyTotal = tool.quantity_total ?? existingTool.quantity_total;
        const checkedOutCount = existingTool.quantity_total - existingTool.quantity_available;
        const newAvailable = Math.max(finalQtyTotal - checkedOutCount, 0);

        const needsUpdate =
          existingTool.description !== tool.description ||
          existingTool.tag !== tool.tag ||
          existingTool.brand !== tool.brand ||
          existingTool.condition !== finalCondition ||
          existingTool.quantity_total !== finalQtyTotal ||
          existingTool.employee_only !== tool.employee_only;

        if (needsUpdate) {
          const { error } = await supabase
            .from("tools")
            .update({
              description: tool.description,
              tag: tool.tag,
              brand: tool.brand,
              condition: finalCondition,
              quantity_total: finalQtyTotal,
              quantity_available: newAvailable,
              employee_only: tool.employee_only,
            })
            .eq("id", existingTool.id);
          if (error) {
            errors.push(`update "${tool.name}": ${error.message}`);
          } else {
            updated++;
          }
        }
      }
    }

    // Delete tools not in sheet (only if they have no active checkouts)
    for (const tool of existing || []) {
      if (!sheetNamesLower.has(tool.name.toLowerCase())) {
        const { data: activeCheckouts } = await supabase
          .from("tool_checkouts")
          .select("id")
          .eq("tool_id", tool.id)
          .eq("status", "checked_out")
          .limit(1);

        if (!activeCheckouts || activeCheckouts.length === 0) {
          const { error } = await supabase.from("tools").delete().eq("id", tool.id);
          if (error) {
            errors.push(`delete "${tool.name}": ${error.message}`);
          } else {
            deleted++;
          }
        }
      }
    }

    const summary = { total_sheet_rows: sheetTools.length, added, updated, deleted, errors };

    // Record last successful run for UI ("Última sincronização")
    await supabase
      .from("sync_state")
      .upsert({ key: "sync-google-sheets", last_run_at: new Date().toISOString(), summary });

    if (errors.length > 0) {
      console.error("sync-google-sheets partial errors:", errors);
    }

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("sync-google-sheets error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
