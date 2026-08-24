import { request } from './api';
import type {
  CreateSalePayload,
  ListSalesQueryParams,
  ListSalesResponse,
  SingleSaleResponse,
} from '../types/sale';
import type { PosSaleResponse } from '../types/product';

function buildQueryString<T extends object>(params: T): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
}

export const saleService = {
  /**
   * Registra uma nova venda no PDV e persiste no histórico de vendas (Sale / SaleItem).
   */
  async create(payload: CreateSalePayload): Promise<PosSaleResponse> {
    return request<PosSaleResponse>('/sales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Consulta a listagem de vendas com filtros e retenção por plano.
   */
  async list(params?: ListSalesQueryParams): Promise<ListSalesResponse> {
    const qs = params ? buildQueryString(params) : '';
    return request<ListSalesResponse>(`/sales${qs}`, {
      method: 'GET',
    });
  },

  /**
   * Busca detalhes de uma venda por ID com itens e operador.
   */
  async getById(id: string): Promise<SingleSaleResponse> {
    return request<SingleSaleResponse>(`/sales/${id}`, {
      method: 'GET',
    });
  },
};
