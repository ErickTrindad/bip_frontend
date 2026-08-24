export type PaymentMethod =
  | 'DINHEIRO'
  | 'PIX'
  | 'CARTAO_DEBITO'
  | 'CARTAO_CREDITO'
  | 'OUTROS'
  | 'MULTIPLOS';

export interface SaleItemInput {
  productId?: string;
  barcode?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface CreateSalePayload {
  items: SaleItemInput[];
  paymentMethod?: PaymentMethod;
  tenantId?: string;
}

export interface SaleItemResponse {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  product?: {
    id: string;
    barcode: string;
    name: string;
    category: string | null;
    shelfQty?: number;
  };
}

export interface SaleResponse {
  id: string;
  tenantId: string;
  userId: string | null;
  totalAmount: number;
  totalItems: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  items?: SaleItemResponse[];
}

export interface ListSalesQueryParams {
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: PaymentMethod;
  userId?: string;
  limit?: number;
  offset?: number;
}

export interface ListSalesResponse {
  total: number;
  limit: number;
  offset: number;
  planRetention: {
    plan: string;
    maxDaysAllowed: number;
    appliedStartDate: string;
    appliedEndDate: string;
  };
  sales: SaleResponse[];
}

export interface SingleSaleResponse {
  sale: SaleResponse;
}
