import { request } from './api';
import type {
  Product,
  ListProductsResponse,
  ListCriticalProductsResponse,
  CreateProductPayload,
  UpdateProductPayload,
  ProductListParams,
  OpenFoodFactsLookupResponse,
  TransferStockPayload,
  PosSalePayload,
  PosSaleResponse,
} from '../types/product';

export const productService = {
  async list(params?: ProductListParams): Promise<ListProductsResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    if (params?.offset !== undefined) query.append('offset', String(params.offset));

    const queryString = query.toString();
    const endpoint = `/products${queryString ? `?${queryString}` : ''}`;
    return request<ListProductsResponse>(endpoint, { method: 'GET' });
  },

  async getById(id: string): Promise<{ product: Product }> {
    return request<{ product: Product }>(`/products/${id}`, { method: 'GET' });
  },

  async getByBarcode(barcode: string): Promise<{ product: Product }> {
    return request<{ product: Product }>(`/products/barcode/${encodeURIComponent(barcode)}`, { method: 'GET' });
  },

  async lookupOpenFoodFacts(barcode: string): Promise<OpenFoodFactsLookupResponse> {
    return request<OpenFoodFactsLookupResponse>(`/products/lookup/${encodeURIComponent(barcode)}`, { method: 'GET' });
  },

  async getCritical(): Promise<ListCriticalProductsResponse> {
    return request<ListCriticalProductsResponse>('/products/critical', { method: 'GET' });
  },

  async create(payload: CreateProductPayload): Promise<{ product: Product }> {
    return request<{ product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: UpdateProductPayload): Promise<{ product: Product }> {
    return request<{ product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async delete(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  async transferStock(id: string, payload: TransferStockPayload): Promise<{ product: Product }> {
    return request<{ product: Product }>(`/products/${id}/transfer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async registerPosSale(payload: PosSalePayload): Promise<PosSaleResponse> {
    return request<PosSaleResponse>('/products/pos/sale', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
