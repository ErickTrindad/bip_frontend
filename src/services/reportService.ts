import { request } from './api';
import type {
  ExecutiveOverview,
  AbcReportResponse,
  MatrixReportResponse,
  ReplenishmentReportResponse,
  SpaceOptimizationReportResponse,
} from '../types/report';

export interface AbcQueryParams {
  tenantId?: string;
  category?: string;
  sortBy?: 'revenue' | 'margin' | 'turnover' | 'salesVolume';
  limit?: number;
}

export interface MatrixQueryParams {
  tenantId?: string;
  category?: string;
  classification?: 'ESTRELA' | 'ALTO_GIRO' | 'GERADOR_MARGEM' | 'LENTO_ABAIXO_MARGEM';
}

export interface ReplenishmentQueryParams {
  tenantId?: string;
  category?: string;
  leadTimeDays?: number;
  safetyStockDays?: number;
  status?: 'CRITICO_RUPTURA' | 'COMPRA_URGENTE' | 'ATENCAO' | 'ESTAVEL' | 'EXCESSO';
}

export interface SpaceOptimizationQueryParams {
  tenantId?: string;
  category?: string;
  action?: 'EXPANDIR_GONDOLA' | 'MANTER' | 'REDUZIR_GONDOLA' | 'REAVALIAR_MIX';
}

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

export const reportService = {
  getOverview: async (tenantId?: string): Promise<ExecutiveOverview> => {
    const qs = buildQueryString({ tenantId });
    return request<ExecutiveOverview>(`/reports/overview${qs}`);
  },

  getAbcReport: async (params?: AbcQueryParams): Promise<AbcReportResponse> => {
    const qs = buildQueryString(params || {});
    return request<AbcReportResponse>(`/reports/abc${qs}`);
  },

  getMatrixReport: async (params?: MatrixQueryParams): Promise<MatrixReportResponse> => {
    const qs = buildQueryString(params || {});
    return request<MatrixReportResponse>(`/reports/turnover-margin-matrix${qs}`);
  },

  getReplenishmentReport: async (
    params?: ReplenishmentQueryParams
  ): Promise<ReplenishmentReportResponse> => {
    const qs = buildQueryString(params || {});
    return request<ReplenishmentReportResponse>(`/reports/replenishment-purchasing${qs}`);
  },

  getSpaceOptimizationReport: async (
    params?: SpaceOptimizationQueryParams
  ): Promise<SpaceOptimizationReportResponse> => {
    const qs = buildQueryString(params || {});
    return request<SpaceOptimizationReportResponse>(`/reports/space-optimization${qs}`);
  },
};
