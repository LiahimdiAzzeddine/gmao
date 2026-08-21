import { serve } from "https://deno.land/std@0.224.0/http/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // clé admin
    );

    const { clientId } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: "clientId manquant" }),
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 1️⃣ Vérifier si le client a des machines
    const { data: machines, error: machineError } = await supabase
      .from("machines")
      .select("id")
      .eq("client_id", clientId);

    if (machineError) throw machineError;

    if (machines && machines.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Impossible de supprimer ce client : il a des machines associées.",
        }),
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // 2️⃣ Récupérer le profile_id lié au client
    const { data: clientData, error: clientError } = await supabase
      .from("clients")
      .select("profile_id")
      .eq("id", clientId)
      .single();

    if (clientError || !clientData) {
      return new Response(
        JSON.stringify({ success: false, error: "Client introuvable" }),
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const profileId = clientData.profile_id;

    // 3️⃣ Supprimer le profile (table publique)
    if (profileId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profileId);

      if (profileError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Impossible de supprimer le profil",
          }),
          { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      // 4️⃣ Supprimer le user dans auth.users (API ADMIN)
      const { error: authError } =
        await supabase.auth.admin.deleteUser(profileId);

      if (authError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Impossible de supprimer l'utilisateur Auth",
          }),
          { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }
    }

    // 5️⃣ Supprimer le client
    const { error: delError } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (delError) throw delError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Client, profil et utilisateur Auth supprimés avec succès",
      }),
      { status: 200, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
});
