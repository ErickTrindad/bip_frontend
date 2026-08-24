import { request } from './api';
import type {
  PosPairingSession,
  SessionValidationResponse,
  ClosePosSessionResponse,
} from '../types/posSession';

export const posSessionService = {
  /**
   * POST /pos/sessions/pair
   * Inicia uma nova sessão de pareamento para o scanner remoto desktop
   */
  async createPairingSession(tenantId?: string): Promise<PosPairingSession> {
    return request<PosPairingSession>('/pos/sessions/pair', {
      method: 'POST',
      body: JSON.stringify({ tenantId }),
    });
  },

  /**
   * GET /pos/sessions/:sessionId/validate?token=:token
   * Valida a sessão lida pelo QR Code no smartphone
   */
  async validatePairingSession(sessionId: string, token: string): Promise<SessionValidationResponse> {
    const encodedToken = encodeURIComponent(token);
    return request<SessionValidationResponse>(`/pos/sessions/${sessionId}/validate?token=${encodedToken}`, {
      method: 'GET',
    });
  },

  /**
   * POST /pos/sessions/:sessionId/close
   * Encerra a sessão de pareamento
   */
  async closePairingSession(sessionId: string): Promise<ClosePosSessionResponse> {
    return request<ClosePosSessionResponse>(`/pos/sessions/${sessionId}/close`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
