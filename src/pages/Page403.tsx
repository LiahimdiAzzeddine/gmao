import { ShieldAlert, Home, ArrowLeft } from "lucide-react";

export default function Page403() {
  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icône avec effet de pulsation */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div
              className="absolute w-24 h-24 rounded-full opacity-20 animate-ping"
              style={{ backgroundColor: "#f15c00" }}
            ></div>
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "#f15c00" }}
            >
              <ShieldAlert className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Code erreur */}
          <h1 className="text-6xl font-bold text-slate-800 mb-2">403</h1>
          
          {/* Message principal */}
          <h2 className="text-2xl font-semibold text-slate-700 mb-4">
            Accès refusé
          </h2>
          
          {/* Description */}
          <p className="text-slate-600 mb-8 leading-relaxed">
            Vous n'avez pas les autorisations nécessaires pour accéder à cette ressource. 
            Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.
          </p>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
            
            <button
              onClick={handleGoHome}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded-lg transition-all hover:shadow-lg"
              style={{ 
                backgroundColor: "#f15c00"
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#d94f00"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f15c00"}
            >
              <Home className="w-4 h-4" />
              Accueil
            </button>
          </div>
        </div>

        {/* Information complémentaire */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Code d'erreur : <span className="font-mono font-semibold">HTTP 403 Forbidden</span>
          </p>
        </div>
      </div>
    </div>
  );
}