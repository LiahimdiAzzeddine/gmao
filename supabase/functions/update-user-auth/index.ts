import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Méthode non autorisée" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    const accessToken = authorization?.replace(/^Bearer\s+/i, "");
    if (!accessToken) return jsonResponse({ success: false, error: "Authentification requise" }, 401);

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
    const requestedUserIds = Array.isArray(body.userIds)
      ? [...new Set(body.userIds.filter((id: unknown): id is string => typeof id === "string"))].slice(0, 200)
      : [];

    if (requestedUserIds.length > 0) {
      const statusEntries = await Promise.all(requestedUserIds.map(async (id) => {
        const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(id);
        if (userError || !userData.user) return [id, { available: false, locked: false }] as const;

        const bannedUntil = userData.user.banned_until || null;
        const locked = Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now());
        return [id, { available: true, locked, bannedUntil }] as const;
      }));

      return jsonResponse({ success: true, statuses: Object.fromEntries(statusEntries) });
    }

    const userId = typeof body.userId === "string" ? body.userId : "";
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const password = typeof body.password === "string" ? body.password : undefined;
    const locked = typeof body.locked === "boolean" ? body.locked : undefined;

    if (!userId) return jsonResponse({ success: false, error: "userId manquant" }, 400);
    if (!email && !password && locked === undefined) return jsonResponse({ success: false, error: "Aucune modification demandée" }, 400);
    if (password && password.length < 6) {
      return jsonResponse({ success: false, error: "Le mot de passe doit contenir au moins 6 caractères" }, 400);
    }

    const { data: targetClient, error: targetError } = await adminClient
      .from("clients")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (locked !== undefined && !targetClient) {
      return jsonResponse({ success: false, error: "Le compte ciblé n’est pas un compte client" }, 400);
    }

    const authUpdates: { email?: string; password?: string; ban_duration?: string } = {};
    if (email) authUpdates.email = email;
    if (password) authUpdates.password = password;
    if (locked !== undefined) authUpdates.ban_duration = locked ? "876000h" : "none";

    const { data, error } = await adminClient.auth.admin.updateUserById(userId, authUpdates);
    if (error) throw error;

    // Synchronisation nécessaire tant que les anciens écrans utilisent ces colonnes.
    const profileUpdates: { email?: string; password?: string } = {};
    if (email) profileUpdates.email = email;
    if (password) profileUpdates.password = password;
    if (email || password) {
      const { error: profileError } = await adminClient.from("profiles").update(profileUpdates).eq("id", userId);
      if (profileError) throw profileError;
    }

    const bannedUntil = data.user.banned_until || null;
    return jsonResponse({
      success: true,
      userId: data.user.id,
      locked: Boolean(bannedUntil && new Date(bannedUntil).getTime() > Date.now()),
      bannedUntil,
    });
  } catch (error) {
    console.error("update-user-auth failed", error);
    const message = error instanceof Error ? error.message : "Erreur interne";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
