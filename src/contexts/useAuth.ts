import { createContext, useContext } from 'react';
import type { User, Tenant, AuthSession, AuthResponse, RegisterPayload, LoginPayload } from '../types/auth';

export interface AuthContextData {
  user: User | null;
  tenant: Tenant | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  register: (payload: RegisterPayload) => Promise<AuthResponse>;
  logout: () => void;
  setAuthData: (response: AuthResponse) => void;
}

export const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
