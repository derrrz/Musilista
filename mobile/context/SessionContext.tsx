import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, removeToken, setToken } from '@/lib/api';
import type { Session, User } from '@/types';

interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const token = await getToken();
      if (!token) return;
      const user = await api.get<User>('/api/me');
      setSession({ token, user });
    } catch {
      await removeToken();
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(token: string) {
    await setToken(token);
    const user = await api.get<User>('/api/me');
    setSession({ token, user });
  }

  async function signOut() {
    await removeToken();
    setSession(null);
  }

  return (
    <SessionContext.Provider value={{ session, isLoading, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
