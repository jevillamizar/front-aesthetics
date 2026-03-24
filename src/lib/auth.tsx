import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

const TOKEN_KEY = 'auth_token';

export type AuthUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'DOCTOR' | 'CLIENT';
  clinic: { id: number; name: string; slug: string } | null;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function getApiBase() {
  const env = (import.meta.env.VITE_API_BASE ?? '').trim();
  return env || `${window.location.protocol}//${window.location.hostname}:8000`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const apiBase = getApiBase();

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${apiBase}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }, [apiBase]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${apiBase}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) { logout(); return; }
        const data = await res.json();
        setUser(data.user);
      })
      .catch(() => { logout(); })
      .finally(() => { setLoading(false); });
  }, [token, apiBase, logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
