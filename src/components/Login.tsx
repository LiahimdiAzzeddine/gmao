import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Mail, Lock, User, Shield, AlertCircle } from 'lucide-react';

type UserRole = 'technicien' | 'consultant' | 'admin';
type LocationState = {
  from?: string;
};

export default function Login() {
  const [isSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [role, setRole] = useState<UserRole>('technicien');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Récupérer l'URL de destination depuis location.state
  const from = (location.state as LocationState | null)?.from || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, nom, role);
        if (error) throw error;
      } else {
        const { error, profile: userProfile } = await signIn(email, password);
        if (error) throw error;
        
        // Rediriger selon le rôle de l'utilisateur
        if (userProfile) {
          if (userProfile.role === 'admin') {
            navigate('/admin', { replace: true });
          } else if (userProfile.role === 'technicien') {
            // Les techniciens peuvent voir toutes les machines mais pas les fonctionnalités admin
            navigate('/toutes-machines', { replace: true });
          } else if (userProfile.role === 'consultant') {
            // Les clients/consultants vont sur leur dashboard client
            navigate('/', { replace: true });
          } else {
            // Par défaut
            navigate(from, { replace: true });
          }
        } else {
          // Si pas de profil retourné, utiliser la destination par défaut
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 flex items-center justify-center p-4">
  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

    {/* Header avec gradient */}
    <div className="bg-gradient-to-r from-[#f15c00] to-orange-600 p-8 text-white">
      <div className="flex items-center justify-center mb-3">
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
          <img src='/FSG-Brandmark-CMYK2-01.png' className='h-14'/>
        </div>
      </div>
      <h1 className="text-3xl font-bold text-center mb-2">
        Gestion Maintenance
      </h1>
      <p className="text-orange-100 text-center text-sm">
        {isSignUp ? 'Créez votre compte pour commencer' : 'Bienvenue de retour'}
      </p>
    </div>

    {/* Formulaire */}
    <div className="p-8">
      <form className="space-y-5" onSubmit={handleSubmit}>

        {isSignUp && (
          <>
            <div>
              <label htmlFor="nom" className="block text-sm font-semibold text-slate-700 mb-2">
                Nom complet
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  id="nom"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl 
                  focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all outline-none"
                  placeholder="Entrez votre nom complet"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-slate-700 mb-2">
                Rôle
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl 
                  focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all 
                  outline-none appearance-none bg-white cursor-pointer"
                >
                  <option value="technicien">Technicien</option>
                  <option value="consultant">Consultant</option>
                  <option value="admin">Administrateur</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl 
              focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all outline-none"
              placeholder="exemple@email.com"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
            Mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl 
              focus:ring-2 focus:ring-[#f15c00] focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-3">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* BOUTON ORANGE */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#f15c00] to-orange-600 text-white py-3.5 rounded-xl 
          font-semibold hover:from-orange-700 hover:to-orange-800 transition-all 
          disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 
          shadow-lg shadow-orange-500/30"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Chargement...</span>
            </>
          ) : isSignUp ? (
            <>
              <UserPlus size={20} />
              Créer un compte
            </>
          ) : (
            <>
              <LogIn size={20} />
              Se connecter
            </>
          )}
        </button>
      </form>
       <div className="mt-6 text-center">
            {/* Bouton de basculement commenté comme dans l'original
            <button
              onClick={toggleMode}
              type="button"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              {isSignUp
                ? 'Vous avez déjà un compte ? Connectez-vous'
                : 'Pas encore de compte ? Créez-en un'}
            </button>
            */}
          </div>
    </div>
  </div>
</div>

  );
}
