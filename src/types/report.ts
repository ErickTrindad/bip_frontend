export interface ExecutiveOverview {
  tenant: {
    id: string;
    name: string;
    category: string;
  };
  inventoryOverview: {
    totalSKUs: number;
    totalPhysicalUnits: number;
    totalDepotUnits: number;
    totalShelfUnits: number;
    totalCatalogValue: number;
    potentialGrossProfit: number;
    averageMarginPercentage: number;
  };
  turnoverAndABC: {
    classACount: number;
    classBCount: number;
    classCCount: number;
    highTurnoverSkusCount: number;
    criticalStockoutCount: number;
  };
  purchasingAlerts: {
    reorderUrgentCount: number;
    estimatedCapitalRequired: number;
  };
  quickRecommendations: string[];
}

export interface AbcProductItem {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  price: number;
  estimatedCost: number;
  marginUnit: number;
  marginPercentage: number;
  depotQty: number;
  shelfQty: number;
  totalStockQty: number;
  estimatedDailySales: number;
  estimatedMonthlySales: number;
  estimatedMonthlyRevenue: number;
  estimatedMonthlyProfit: number;
  turnoverRatio: number;
  stockDaysRemaining: number;
  revenueSharePercentage: number;
  accumulatedSharePercentage: number;
  abcClass: 'A' | 'B' | 'C';
  turnoverClass: 'ALTO' | 'MEDIO' | 'BAIXO';
  marginClass: 'ALTA' | 'MEDIA' | 'BAIXA';
}

export interface AbcReportResponse {
  summary: {
    totalProducts: number;
    totalStockValue: number;
    totalMonthlyRevenue: number;
    totalMonthlyProfit: number;
    averageMarginPercentage: number;
    classACount: number;
    classBCount: number;
    classCCount: number;
    classARevenue: number;
    classBRevenue: number;
    classCRevenue: number;
  };
  items: AbcProductItem[];
}

export interface MatrixItem {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  price: number;
  marginPercentage: number;
  turnoverRatio: number;
  estimatedMonthlyRevenue: number;
  estimatedMonthlyProfit: number;
  quadrant: 'ESTRELA' | 'ALTO_GIRO' | 'GERADOR_MARGEM' | 'LENTO_ABAIXO_MARGEM';
  quadrantLabel: string;
  recommendation: string;
  spaceRecommendation: string;
}

export interface MatrixReportResponse {
  benchmarks: {
    marginThresholdPercentage: number;
    turnoverThreshold: number;
  };
  distribution: {
    estrelasCount: number;
    altoGiroCount: number;
    geradorMargemCount: number;
    lentoAbaixoMargemCount: number;
  };
  items: MatrixItem[];
}

export interface ReplenishmentItem {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  price: number;
  estimatedCost: number;
  depotQty: number;
  shelfQty: number;
  totalStockQty: number;
  shelfMinQty: number;
  dailySalesRate: number;
  leadTimeDays: number;
  safetyStockQty: number;
  reorderPoint: number;
  suggestedOrderQty: number;
  estimatedOrderCost: number;
  stockDaysRemaining: number;
  status: 'CRITICO_RUPTURA' | 'COMPRA_URGENTE' | 'ATENCAO' | 'ESTAVEL' | 'EXCESSO';
  statusLabel: string;
  urgencyLevel: 'ALTA' | 'MEDIA' | 'BAIXA' | 'NENHUMA';
}

export interface ReplenishmentReportResponse {
  summary: {
    totalProductsEvaluated: number;
    urgentOrdersCount: number;
    totalSuggestedInvestment: number;
    leadTimeDaysApplied: number;
    safetyStockDaysApplied: number;
  };
  items: ReplenishmentItem[];
}

export interface SpaceOptimizationItem {
  id: string;
  barcode: string;
  name: string;
  category: string | null;
  shelfLocation: string | null;
  depotLocation: string | null;
  shelfQty: number;
  depotQty: number;
  shelfMinQty: number;
  shelfSharePercentage: number;
  revenueSharePercentage: number;
  spaceEfficiencyScore: number;
  recommendedAction: 'EXPANDIR_GONDOLA' | 'MANTER' | 'REDUZIR_GONDOLA' | 'REAVALIAR_MIX';
  actionLabel: string;
  actionReason: string;
  suggestedShelfCapacity: number;
}

export interface SpaceOptimizationReportResponse {
  summary: {
    totalProducts: number;
    expandGondolaCount: number;
    reduceGondolaCount: number;
    maintainCount: number;
    reassessMixCount: number;
  };
  items: SpaceOptimizationItem[];
}
