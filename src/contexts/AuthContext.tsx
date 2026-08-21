import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile, Client } from '../lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  client:Client|null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, nom: string, role: 'technicien' | 'consultant' | 'admin') => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

async function loadProfile(userId: string) {
  //setLoading(true);

  // 1️⃣ Charger le profil
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError || !profileData) {
    console.error('Erreur profil:', profileError);
    setProfile(null);
    setClient(null);
    setLoading(false);
    return;
  }

  setProfile(profileData);

  // 2️⃣ Charger le client associé (s’il existe)
  const { data: clientData, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('profile_id', userId)
    .maybeSingle();

  if (clientError) {
    console.error('Erreur client:', clientError);
  }

  setClient(clientData ?? null);
  setLoading(false);
}

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error || !data.user) {
      return { error: error || null, profile: null };
    }

    // Charger le profil de l'utilisateur
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return { error: profileError, profile: null };
    }

    return { error: null, profile: profileData };
  }

  async function signUp(email: string, password: string, nom: string, role: 'technicien' | 'consultant' | 'admin') {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) return { error };
    if (!data.user) return { error: new Error('User creation failed') };

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, nom, role });

    return { error: profileError || null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, profile,client, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
