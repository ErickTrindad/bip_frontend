import { useState, useEffect, type ReactNode } from 'react';
import type { User, Tenant, AuthSession, AuthResponse, RegisterPayload, LoginPayload } from '../types/auth';
import { authService } from '../services/authService';
import { AuthContext } from './useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('@bip:user');
    return saved ? JSON.parse(saved) : null;
  });
  const [tenant, setTenant] = useState<Tenant | null>(() => {
    const saved = localStorage.getItem('@bip:tenant');
    return saved ? JSON.parse(saved) : null;
  });
  const [session, setSession] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem('@bip:session');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.access_token) {
      localStorage.setItem('@bip:token', session.access_token);
    } else {
      localStorage.removeItem('@bip:token');
    }
  }, [session]);

  // Escuta 401 de requisições de API quando online para deslogar e limpar token inválido
  useEffect(() => {
    const handleUnauthorized = () => {
      if (navigator.onLine) {
        logout();
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);
  const setAuthData = (response: AuthResponse) => {
    setUser(response.user);
    setTenant(response.tenant);
    setSession(response.session);

    localStorage.setItem('@bip:user', JSON.stringify(response.user));
    if (response.tenant) {
      localStorage.setItem('@bip:tenant', JSON.stringify(response.tenant));
    }
    if (response.session) {
      localStorage.setItem('@bip:session', JSON.stringify(response.session));
      localStorage.setItem('@bip:token', response.session.access_token);
    }
  };

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const response = await authService.login(payload);
      setAuthData(response);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const response = await authService.register(payload);
      setAuthData(response);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setTenant(null);
    setSession(null);
    localStorage.removeItem('@bip:user');
    localStorage.removeItem('@bip:tenant');
    localStorage.removeItem('@bip:session');
    localStorage.removeItem('@bip:token');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        session,
        isAuthenticated: !!user && !!session,
        isLoading,
        login,
        register,
        logout,
        setAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
