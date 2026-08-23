export interface Product {
  id: string;
  tenantId: string;
  barcode: string;
  name: string;
  category?: string | null;
  depotQty: number;
  depotLocation?: string | null;
  shelfQty: number;
  shelfLocation?: string | null;
  shelfMinQty: number;
  price?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CriticalProduct extends Product {
  deficit: number;
  deficitPercentage: number;
  needsReplenishment: boolean;
}

export interface CreateProductPayload {
  barcode: string;
  name: string;
  category?: string | null;
  depotQty?: number;
  depotLocation?: string | null;
  shelfQty?: number;
  shelfLocation?: string | null;
  shelfMinQty?: number;
  price?: number | null;
}

export interface UpdateProductPayload {
  barcode?: string;
  name?: string;
  category?: string | null;
  depotQty?: number;
  depotLocation?: string | null;
  shelfQty?: number;
  shelfLocation?: string | null;
  shelfMinQty?: number;
  price?: number | null;
}

export interface ProductListParams {
  search?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface ListProductsResponse {
  total: number;
  products: Product[];
}

export interface ListCriticalProductsResponse {
  total: number;
  products: CriticalProduct[];
}

export interface OpenFoodFactsLookupResponse {
  status: number;
  statusVerbose: string;
  product?: {
    barcode: string;
    name?: string;
    category?: string;
    brands?: string;
    imageUrl?: string;
    quantity?: string;
  };
}

export interface TransferStockPayload {
  quantity: number;
}

export interface PosSaleItem {
  barcode: string;
  quantity: number;
  unitPrice: number;
  name?: string;
}

export type PaymentMethod =
  | 'DINHEIRO'
  | 'PIX'
  | 'CARTAO_DEBITO'
  | 'CARTAO_CREDITO'
  | 'OUTROS'
  | 'MULTIPLOS';

export interface PaymentSplitItem {
  method: 'DINHEIRO' | 'PIX' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'OUTROS';
  amount: number;
}

export interface PosSalePayload {
  items: Array<{
    barcode: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod: PaymentMethod;
  payments?: PaymentSplitItem[];
}
export interface PosSaleResponse {
  message: string;
  paymentMethod: PaymentMethod;
  totalItems: number;
  totalAmount: number;
  updatedProducts: Array<{
    id: string;
    name: string;
    barcode: string;
    soldQty: number;
    remainingShelfQty: number;
  }>;
}

export interface ProductDeltaSyncParams {
  since: string;
  tenantId?: string;
  limit?: number;
}

export interface ProductDeltaSyncResponse {
  syncedAt: string;
  serverTimestamp: number;
  totalChanged: number;
  hasMore: boolean;
  upserted: Product[];
  deletedIds: string[];
  deleted: Product[];
}
