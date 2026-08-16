export type TenantCategory =
  | 'PADARIA'
  | 'MERCEARIA'
  | 'BAR'
  | 'LANCHONETE'
  | 'FARMACIA'
  | 'CONVENIENCIA'
  | 'PET_SHOP'
  | 'MERCADO'
  | 'OUTROS';

export type EmployeeRange =
  | 'solo_1'
  | 'team_2_5'
  | 'team_6_10'
  | 'team_11_plus';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  tenantId: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  category: TenantCategory;
  employeeRange?: EmployeeRange;
  email: string | null;
  phone: string | null;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tenant: Tenant | null;
  session: AuthSession | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  tenantName: string;
  tenantCategory: TenantCategory;
  tenantEmployeeRange?: EmployeeRange;
  tenantEmail?: string;
  tenantPhone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordOtpPayload {
  email: string;
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}
