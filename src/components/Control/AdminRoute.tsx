import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          {/* Spinner animé */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <div className="w-16 h-16 border-4 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: '#f15c00' }}></div>
            <div className="absolute w-12 h-12 border-4 border-transparent rounded-full animate-spin" style={{ borderTopColor: '#f15c00', opacity: 0.6, animationDuration: '1.5s' }}></div>
          </div>
          
          {/* Texte de chargement */}
          <div className="space-y-2">
            <p className="text-lg font-medium text-slate-700">
              Vérification des permissions
            </p>
            <div className="flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f15c00' }}></span>
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f15c00', animationDelay: '0.1s' }}></span>
              <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f15c00', animationDelay: '0.2s' }}></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return profile?.role === 'admin' ? <>{children}</> : <Navigate to="/" />;
}