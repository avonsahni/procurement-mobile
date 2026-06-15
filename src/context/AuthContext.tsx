import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AppUser } from '../lib/types';

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, signOut: async () => {} });

async function resolveUser(userId: string, email: string): Promise<AppUser | null> {
  const [profileRes, memberRes] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase.from('organization_members').select('org_id, role').eq('user_id', userId).maybeSingle(),
  ]);
  if (!memberRes.data) return null;
  return {
    id: userId,
    email,
    fullName: (profileRes.data as any)?.full_name || email,
    orgId: memberRes.data.org_id,
    role: memberRes.data.role,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const resolved = await resolveUser(session.user.id, session.user.email ?? '');
        setUser(resolved);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const resolved = await resolveUser(session.user.id, session.user.email ?? '');
        setUser(resolved);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
