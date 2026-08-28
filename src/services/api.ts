const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export class ApiError extends Error {
  statusCode: number;
  issues?: Record<string, string[]>;

  constructor(message: string, statusCode: number, issues?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.issues = issues;
  }
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('@bip:token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error || data.message || 'Ocorreu um erro na requisição';
      
      // Se o token estiver expirado ou inválido (401), despacha evento para logout / redirecionamento
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { message } }));
      }

      throw new ApiError(message, response.status, data.issues);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão.', 500);
  }
}
