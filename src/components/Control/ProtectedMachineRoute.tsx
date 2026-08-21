import { Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

export function ProtectedMachineRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const { machineId } = useParams<{ machineId: string }>();

  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAccess() {
      if (!user || !profile || !machineId) {
        setAuthorized(false);
        return;
      }

      // ✅ Admin ou technicien → accès direct
      if (profile.role === "admin" || profile.role === "technicien") {
        setAuthorized(true);
        return;
      }

      // ✅ Consultant → accès seulement si la machine lui appartient
      if (profile.role === "consultant") {
        const { data, error } = await supabase
          .from("machines")
          .select(`
            id,
            client_id,
            clients!inner (
              id,
              profile_id
            )
          `)
          .eq("id", machineId)
          .eq("clients.profile_id", profile.id)
          .maybeSingle();

        setAuthorized(!error && !!data);
        return;
      }

      setAuthorized(false);
    }

    // Attendre que le chargement soit terminé ET que le profil soit disponible
    if (!loading && user && profile) {
      checkAccess();
    } else if (!loading && !user) {
      // Pas d'utilisateur connecté
      setAuthorized(false);
    }
  }, [user, profile, loading, machineId]);

  /* 🔁 UI DE CHARGEMENT — IDENTIQUE À LA TIENNE */
  if (loading || authorized === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          {/* Spinner animé */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <div
              className="w-16 h-16 border-4 border-slate-200 rounded-full animate-spin"
              style={{ borderTopColor: "#f15c00" }}
            ></div>
            <div
              className="absolute w-12 h-12 border-4 border-transparent rounded-full animate-spin"
              style={{
                borderTopColor: "#f15c00",
                opacity: 0.6,
                animationDuration: "1.5s",
              }}
            ></div>
          </div>

          {/* Texte */}
          <div className="space-y-2">
            <p className="text-lg font-medium text-slate-700">
              Vérification des autorisations
            </p>
            <div className="flex items-center justify-center gap-1">
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: "#f15c00" }}
              ></span>
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: "#f15c00",
                  animationDelay: "0.1s",
                }}
              ></span>
              <span
                className="w-2 h-2 rounded-full animate-bounce"
                style={{
                  backgroundColor: "#f15c00",
                  animationDelay: "0.2s",
                }}
              ></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ❌ Pas connecté → login
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  // ❌ Connecté mais pas autorisé
  if (!authorized) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
