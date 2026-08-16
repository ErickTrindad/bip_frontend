import { request } from './api';
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth';

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const cleanPayload: RegisterPayload = {
      ...payload,
      tenantEmail: payload.tenantEmail?.trim() ? payload.tenantEmail.trim() : undefined,
      tenantPhone: payload.tenantPhone?.trim() ? payload.tenantPhone.trim() : undefined,
    };
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(cleanPayload),
    });
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<{ user: unknown; tenant: unknown; ownedTenants: unknown[] }> {
    return request('/auth/me', {
      method: 'GET',
    });
  },
};
