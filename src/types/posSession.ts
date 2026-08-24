export type PosSessionStatus = 'ACTIVE' | 'EXPIRED' | 'CLOSED';

export interface PosPairingSession {
  message: string;
  sessionId: string;
  token: string;
  channel: string;
  status: PosSessionStatus;
  expiresAt: string;
  expiresInSeconds: number;
  qrCodeUrl: string;
}

export interface SessionValidationResponse {
  valid: boolean;
  sessionId: string;
  channel: string;
  status: PosSessionStatus;
  expiresAt: string;
  remainingSeconds: number;
  tenant: {
    id: string;
    name: string;
    category: string;
  };
  operator: {
    id: string;
    name: string;
    email: string;
  };
}

export interface RemoteBarcodePayload {
  barcode: string;
  scannedAt: number;
  deviceId?: string;
}

export interface ClosePosSessionResponse {
  message: string;
  sessionId: string;
  status: 'CLOSED';
}
