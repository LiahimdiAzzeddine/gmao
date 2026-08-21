// supabase/functions/get-techniciens/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // clé admin
    );

    // Vérifie que l'utilisateur est admin via userId query param
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "userId manquant" }), { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ success: false, error: "Profil introuvable" }), { status: 404, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    if (profile.role !== "admin") {
      return new Response(JSON.stringify({ success: false, error: "Accès refusé" }), { status: 403, headers: { "Access-Control-Allow-Origin": "*" } });
    }

    // Récupère tous les techniciens avec email et password
    const { data: techniciens, error } = await supabase
      .from("profiles")
      .select("id, nom, email, password, created_at")
      .eq("role", "technicien")
      .order("nom");

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, techniciens }), {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
