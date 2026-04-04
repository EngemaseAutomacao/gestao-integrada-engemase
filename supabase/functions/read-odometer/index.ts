import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { checkout_photo_path, checkin_photo_path } = await req.json();

    if (!checkout_photo_path || !checkin_photo_path) {
      return new Response(
        JSON.stringify({ error: "Both checkout and checkin dashboard photo paths are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate signed URLs for both photos
    const [checkoutUrlResult, checkinUrlResult] = await Promise.all([
      supabase.storage.from("imagens").createSignedUrl(checkout_photo_path, 600),
      supabase.storage.from("imagens").createSignedUrl(checkin_photo_path, 600),
    ]);

    if (checkoutUrlResult.error || checkinUrlResult.error) {
      return new Response(
        JSON.stringify({ error: "Failed to generate signed URLs for photos" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const checkoutImageUrl = checkoutUrlResult.data.signedUrl;
    const checkinImageUrl = checkinUrlResult.data.signedUrl;

    // Call AI to read odometers from both images
    const aiResponse = await fetch("https://ai.lovable.dev/api/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at reading vehicle odometers/dashboards from photos. 
Your task is to read the kilometer reading from two dashboard photos and calculate the distance traveled.
Respond ONLY with valid JSON in this exact format:
{
  "checkout_km": <number or null>,
  "checkin_km": <number or null>,
  "distance_km": <number or null>,
  "confidence": "high" | "medium" | "low",
  "notes": "<brief explanation in Portuguese>"
}
If you cannot read a value, set it to null. If both values are readable, calculate the distance.
Do NOT include any text outside the JSON.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Leia o hodômetro (quilometragem) nas duas fotos do painel do veículo. A primeira foto é da SAÍDA e a segunda é da DEVOLUÇÃO. Calcule a distância percorrida.",
              },
              {
                type: "image_url",
                image_url: { url: checkoutImageUrl },
              },
              {
                type: "image_url",
                image_url: { url: checkinImageUrl },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable", details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON response from AI
    let result;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      result = {
        checkout_km: null,
        checkin_km: null,
        distance_km: null,
        confidence: "low",
        notes: "Não foi possível interpretar a resposta da IA. Por favor, informe a quilometragem manualmente.",
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
