import { createContext, PropsWithChildren, useContext, useEffect, useState } from 'react';

import { apiRequest } from '@/lib/api';
import type { AuthUser } from '@/types/duocode';

type AuthPayload = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'duocode-auth-token';

function readStoredToken() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function writeStoredToken(token: string | null) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  if (token) {
    window.localStorage.setItem(STORAGE_KEY, token);
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = readStoredToken();

    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);

    apiRequest<{ user: AuthUser }>('/api/auth/me', {}, storedToken)
      .then((response) => {
        setUser(response.user);
      })
      .catch(() => {
        writeStoredToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function consumeAuth(action: Promise<AuthPayload>) {
    const response = await action;
    writeStoredToken(response.token);
    setToken(response.token);
    setUser(response.user);
  }

  async function login(email: string, password: string) {
    await consumeAuth(
      apiRequest<AuthPayload>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
    );
  }

  async function register(name: string, email: string, password: string) {
    await consumeAuth(
      apiRequest<AuthPayload>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      })
    );
  }

  function logout() {
    writeStoredToken(null);
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
