import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import {
  bootstrapLocalAuth,
  loginLocalAccount,
  logoutLocalAccount,
  registerLocalAccount,
} from '@/lib/local-learning';
import type { AuthUser } from '@/types/duocode';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, confirmPassword?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bootstrapLocalAuth()
      .then((session) => {
        if (!session) {
          return;
        }

        setToken(session.token);
        setUser(session.user);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function login(email: string, password: string) {
    const session = await loginLocalAccount(email, password);
    setToken(session.token);
    setUser(session.user);
  }

  async function register(name: string, email: string, password: string, _confirmPassword?: string) {
    const session = await registerLocalAccount(name, email, password);
    setToken(session.token);
    setUser(session.user);
  }

  async function logout() {
    await logoutLocalAccount();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
