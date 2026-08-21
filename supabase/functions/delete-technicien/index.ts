// supabase/functions/delete-technicien/index.ts
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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Méthode non autorisée" }), {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: "userId manquant" }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Vérifier les interventions liées
    const { count: interventionCount, error: countError } = await supabaseAdmin
      .from("interventions")
      .select("*", { count: "exact", head: true })
      .eq("technicien_id", userId);

    if (countError) throw countError;

    if (interventionCount && interventionCount > 0) {
      return new Response(JSON.stringify({
        success: false,
        error: `Impossible de supprimer ce technicien car il a ${interventionCount} intervention(s) associée(s).`
      }), {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Supprimer l'utilisateur Auth
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;

    // Supprimer le profil
    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) throw deleteProfileError;

    return new Response(JSON.stringify({ success: true, message: "Technicien supprimé avec succès" }), {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message || "Erreur inconnue" }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
