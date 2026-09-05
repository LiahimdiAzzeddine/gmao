import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type DeleteResult = {
  clientId: string;
  storageUrls?: string[];
  deleted?: Record<string, number>;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function storagePathFromPublicUrl(value: string): string | null {
  const marker = "/storage/v1/object/public/gmao-photos/";
  const markerIndex = value.indexOf(marker);
  if (markerIndex < 0) return null;

  const encodedPath = value.slice(markerIndex + marker.length).split(/[?#]/, 1)[0];
  if (!encodedPath) return null;

  try {
    return decodeURIComponent(encodedPath);
  } catch {
    return encodedPath;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Méthode non autorisée" }, 405);
  }

  try {
    const authorization = req.headers.get("Authorization");
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return jsonResponse({ success: false, error: "Authentification requise" }, 401);
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
    if (authError || !authData.user) {
      return jsonResponse({ success: false, error: "Session invalide ou expirée" }, 401);
    }

    const { data: callerProfile, error: callerError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (callerError) throw callerError;
    if (callerProfile?.role !== "admin") {
      return jsonResponse({ success: false, error: "Action réservée aux administrateurs" }, 403);
    }

    const body = await req.json();
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
    if (!clientId) return jsonResponse({ success: false, error: "clientId manquant" }, 400);
    if (body.confirmCascade !== true) {
      return jsonResponse({
        success: false,
        error: "La suppression définitive de toutes les données doit être confirmée",
      }, 400);
    }

    const { data, error } = await adminClient.rpc("delete_client_cascade", {
      p_client_id: clientId,
      p_admin_id: authData.user.id,
    });

    if (error) {
      const status = error.code === "P0002" ? 404 : error.code === "42501" ? 403 : 400;
      return jsonResponse({ success: false, error: error.message }, status);
    }

    const result = data as DeleteResult;
    const storagePaths = [...new Set(
      (result.storageUrls || [])
        .map(storagePathFromPublicUrl)
        .filter((path): path is string => Boolean(path)),
    )];

    const storageWarnings: string[] = [];
    for (let index = 0; index < storagePaths.length; index += 100) {
      const paths = storagePaths.slice(index, index + 100);
      const { error: storageError } = await adminClient.storage.from("gmao-photos").remove(paths);
      if (storageError) {
        console.error("delete-client storage cleanup failed", storageError);
        storageWarnings.push(storageError.message);
      }
    }

    return jsonResponse({
      success: true,
      message: "Client et données associées supprimés définitivement",
      deleted: result.deleted || {},
      deletedFiles: storagePaths.length,
      warnings: storageWarnings,
    });
  } catch (error) {
    console.error("delete-client failed", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
