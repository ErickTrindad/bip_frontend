import { useState, useEffect, useId, type ChangeEvent } from 'react';
import {
  BarChart3,
  TrendingUp,
  LayoutGrid,
  Truck,
  Maximize2,
  Download,
  Printer,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import { reportService } from '../services/reportService';
import {
  exportToCsv,
  printReport,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../lib/reportExport';
import type {
  ExecutiveOverview,
  AbcReportResponse,
  MatrixReportResponse,
  ReplenishmentReportResponse,
  SpaceOptimizationReportResponse,
} from '../types/report';

type ReportTab = 'overview' | 'abc' | 'matrix' | 'replenishment' | 'space';
type MatrixQuadrantOption = 'ESTRELA' | 'ALTO_GIRO' | 'GERADOR_MARGEM' | 'LENTO_ABAIXO_MARGEM' | '';
type ReplenishmentStatusOption = 'CRITICO_RUPTURA' | 'COMPRA_URGENTE' | 'ATENCAO' | 'ESTAVEL' | 'EXCESSO' | '';
type SpaceActionOption = 'EXPANDIR_GONDOLA' | 'MANTER' | 'REDUZIR_GONDOLA' | 'REAVALIAR_MIX' | '';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // States dos dados de cada relatório
  const [overviewData, setOverviewData] = useState<ExecutiveOverview | null>(null);
  const [abcData, setAbcData] = useState<AbcReportResponse | null>(null);
  const [matrixData, setMatrixData] = useState<MatrixReportResponse | null>(null);
  const [replenishmentData, setReplenishmentData] = useState<ReplenishmentReportResponse | null>(null);
  const [spaceData, setSpaceData] = useState<SpaceOptimizationReportResponse | null>(null);

  // Filtros Globais / Por Aba
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [abcSortBy, setAbcSortBy] = useState<'revenue' | 'margin' | 'turnover' | 'salesVolume'>('revenue');
  const [matrixClassification, setMatrixClassification] = useState<MatrixQuadrantOption>('');
  const [replenishmentStatus, setReplenishmentStatus] = useState<ReplenishmentStatusOption>('');
  const [replenishmentLeadTime, setReplenishmentLeadTime] = useState<number>(7);
  const [replenishmentSafetyStock, setReplenishmentSafetyStock] = useState<number>(3);
  const [spaceAction, setSpaceAction] = useState<SpaceActionOption>('');

  const searchInputId = useId();
  const categoryInputId = useId();

  // Carregamento de dados de acordo com a aba ativa e filtros
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'overview') {
        const data = await reportService.getOverview();
        setOverviewData(data);
      } else if (activeTab === 'abc') {
        const data = await reportService.getAbcReport({
          category: categoryFilter || undefined,
          sortBy: abcSortBy,
        });
        setAbcData(data);
      } else if (activeTab === 'matrix') {
        const data = await reportService.getMatrixReport({
          category: categoryFilter || undefined,
          classification: matrixClassification || undefined,
        });
        setMatrixData(data);
      } else if (activeTab === 'replenishment') {
        const data = await reportService.getReplenishmentReport({
          category: categoryFilter || undefined,
          status: replenishmentStatus || undefined,
          leadTimeDays: replenishmentLeadTime,
          safetyStockDays: replenishmentSafetyStock,
        });
        setReplenishmentData(data);
      } else if (activeTab === 'space') {
        const data = await reportService.getSpaceOptimizationReport({
          category: categoryFilter || undefined,
          action: spaceAction || undefined,
        });
        setSpaceData(data);
      }
    } catch (err: unknown) {
      console.error('Erro ao carregar relatório:', err);
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados do relatório.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [
    activeTab,
    categoryFilter,
    abcSortBy,
    matrixClassification,
    replenishmentStatus,
    replenishmentLeadTime,
    replenishmentSafetyStock,
    spaceAction,
  ]);

  // Exportações
  const handleExportCsv = () => {
    if (activeTab === 'abc' && abcData) {
      exportToCsv(
        'relatorio_curva_abc',
        abcData.items,
        [
          { header: 'Código de Barras', key: 'barcode' },
          { header: 'Produto', key: 'name' },
          { header: 'Categoria', key: (r) => r.category || 'Geral' },
          { header: 'Preço Venda (R$)', key: 'price' },
          { header: 'Custo Est. (R$)', key: 'estimatedCost' },
          { header: 'Margem %', key: 'marginPercentage' },
          { header: 'Estoque Gôndola', key: 'shelfQty' },
          { header: 'Estoque Depósito', key: 'depotQty' },
          { header: 'Estoque Total', key: 'totalStockQty' },
          { header: 'Venda Mensal Est.', key: 'estimatedMonthlySales' },
          { header: 'Faturamento Mensal Est. (R$)', key: 'estimatedMonthlyRevenue' },
          { header: 'Lucro Mensal Est. (R$)', key: 'estimatedMonthlyProfit' },
          { header: 'Giro Anual', key: 'turnoverRatio' },
          { header: 'Autonomia (Dias)', key: 'stockDaysRemaining' },
          { header: 'Part. Faturamento %', key: 'revenueSharePercentage' },
          { header: 'Part. Acumulada %', key: 'accumulatedSharePercentage' },
          { header: 'Curva ABC', key: 'abcClass' },
          { header: 'Classificação Giro', key: 'turnoverClass' },
          { header: 'Classificação Margem', key: 'marginClass' },
        ]
      );
    } else if (activeTab === 'matrix' && matrixData) {
      exportToCsv(
        'matriz_giro_margem',
        matrixData.items,
        [
          { header: 'Código de Barras', key: 'barcode' },
          { header: 'Produto', key: 'name' },
          { header: 'Categoria', key: (r) => r.category || 'Geral' },
          { header: 'Preço (R$)', key: 'price' },
          { header: 'Margem %', key: 'marginPercentage' },
          { header: 'Taxa de Giro', key: 'turnoverRatio' },
          { header: 'Faturamento Est. (R$)', key: 'estimatedMonthlyRevenue' },
          { header: 'Lucro Est. (R$)', key: 'estimatedMonthlyProfit' },
          { header: 'Quadrante', key: 'quadrantLabel' },
          { header: 'Recomendação Comercial', key: 'recommendation' },
          { header: 'Recomendação Gôndola', key: 'spaceRecommendation' },
        ]
      );
    } else if (activeTab === 'replenishment' && replenishmentData) {
      exportToCsv(
        'planejamento_compras_reposicao',
        replenishmentData.items,
        [
          { header: 'Código de Barras', key: 'barcode' },
          { header: 'Produto', key: 'name' },
          { header: 'Categoria', key: (r) => r.category || 'Geral' },
          { header: 'Preço Venda (R$)', key: 'price' },
          { header: 'Custo Unit. (R$)', key: 'estimatedCost' },
          { header: 'Estoque Atual', key: 'totalStockQty' },
          { header: 'Mínimo Gôndola', key: 'shelfMinQty' },
          { header: 'Venda Diária', key: 'dailySalesRate' },
          { header: 'Estoque Segurança', key: 'safetyStockQty' },
          { header: 'Ponto de Pedido (ROP)', key: 'reorderPoint' },
          { header: 'Sugestão Compra (Qtd)', key: 'suggestedOrderQty' },
          { header: 'Investimento Sugerido (R$)', key: 'estimatedOrderCost' },
          { header: 'Dias de Cobertura', key: 'stockDaysRemaining' },
          { header: 'Status Reposição', key: 'statusLabel' },
          { header: 'Urgência', key: 'urgencyLevel' },
        ]
      );
    } else if (activeTab === 'space' && spaceData) {
      exportToCsv(
        'otimizacao_espaco_gondolas',
        spaceData.items,
        [
          { header: 'Código de Barras', key: 'barcode' },
          { header: 'Produto', key: 'name' },
          { header: 'Categoria', key: (r) => r.category || 'Geral' },
          { header: 'Local Gôndola', key: (r) => r.shelfLocation || '-' },
          { header: 'Local Depósito', key: (r) => r.depotLocation || '-' },
          { header: 'Qtd Gôndola', key: 'shelfQty' },
          { header: 'Qtd Depósito', key: 'depotQty' },
          { header: 'Mínimo Gôndola', key: 'shelfMinQty' },
          { header: 'Ocupação Gôndola %', key: 'shelfSharePercentage' },
          { header: 'Part. Faturamento %', key: 'revenueSharePercentage' },
          { header: 'Score Eficiência Espaço', key: 'spaceEfficiencyScore' },
          { header: 'Ação Recomendada', key: 'actionLabel' },
          { header: 'Motivo', key: 'actionReason' },
          { header: 'Capacidade Sugerida', key: 'suggestedShelfCapacity' },
        ]
      );
    } else if (activeTab === 'overview' && overviewData) {
      exportToCsv(
        'visao_geral_executiva',
        [
          { Metrica: 'Total de SKUs', Valor: overviewData.inventoryOverview.totalSKUs },
          { Metrica: 'Unidades Totais em Estoque', Valor: overviewData.inventoryOverview.totalPhysicalUnits },
          { Metrica: 'Unidades no Depósito', Valor: overviewData.inventoryOverview.totalDepotUnits },
          { Metrica: 'Unidades na Gôndola', Valor: overviewData.inventoryOverview.totalShelfUnits },
          { Metrica: 'Valor do Catálogo (R$)', Valor: overviewData.inventoryOverview.totalCatalogValue },
          { Metrica: 'Lucro Bruto Potencial (R$)', Valor: overviewData.inventoryOverview.potentialGrossProfit },
          { Metrica: 'Margem Média (%)', Valor: overviewData.inventoryOverview.averageMarginPercentage },
          { Metrica: 'Produtos Classe A', Valor: overviewData.turnoverAndABC.classACount },
          { Metrica: 'Produtos Classe B', Valor: overviewData.turnoverAndABC.classBCount },
          { Metrica: 'Produtos Classe C', Valor: overviewData.turnoverAndABC.classCCount },
          { Metrica: 'SKUs em Risco Crítico de Ruptura', Valor: overviewData.turnoverAndABC.criticalStockoutCount },
          { Metrica: 'SKUs com Pedido Urgente', Valor: overviewData.purchasingAlerts.reorderUrgentCount },
          { Metrica: 'Capital Necessário para Compras (R$)', Valor: overviewData.purchasingAlerts.estimatedCapitalRequired },
        ],
        [
          { header: 'Métrica Operacional', key: 'Metrica' },
          { header: 'Valor Consolidado', key: 'Valor' },
        ]
      );
    }
  };

  const handlePrint = () => {
    let contentHtml = '';
    let title = '';

    if (activeTab === 'overview' && overviewData) {
      title = 'Visão Geral Executiva - Relatório Gerencial';
      contentHtml = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
            <h3>Visão do Estoque</h3>
            <p><strong>Total de SKUs:</strong> ${overviewData.inventoryOverview.totalSKUs}</p>
            <p><strong>Valor do Estoque:</strong> ${formatCurrency(overviewData.inventoryOverview.totalCatalogValue)}</p>
            <p><strong>Lucro Bruto Potencial:</strong> ${formatCurrency(overviewData.inventoryOverview.potentialGrossProfit)}</p>
            <p><strong>Margem Média:</strong> ${formatPercent(overviewData.inventoryOverview.averageMarginPercentage)}</p>
          </div>
          <div style="border: 1px solid #ddd; padding: 12px; border-radius: 6px;">
            <h3>Alertas de Compras & Curva ABC</h3>
            <p><strong>Classe A / B / C:</strong> ${overviewData.turnoverAndABC.classACount} / ${overviewData.turnoverAndABC.classBCount} / ${overviewData.turnoverAndABC.classCCount}</p>
            <p><strong>Itens Críticos (Ruptura):</strong> ${overviewData.turnoverAndABC.criticalStockoutCount}</p>
            <p><strong>Compras Urgentes:</strong> ${overviewData.purchasingAlerts.reorderUrgentCount}</p>
            <p><strong>Capital Necessário Reposição:</strong> ${formatCurrency(overviewData.purchasingAlerts.estimatedCapitalRequired)}</p>
          </div>
        </div>
        <h3>Recomendações Estratégicas</h3>
        <ul>
          ${overviewData.quickRecommendations.map((r) => `<li>${r}</li>`).join('')}
        </ul>
      `;
    } else if (activeTab === 'abc' && abcData) {
      title = 'Relatório de Curva ABC (Giro, Margem e Faturamento)';
      contentHtml = `
        <p><strong>Faturamento Estimado:</strong> ${formatCurrency(abcData.summary.totalMonthlyRevenue)} | <strong>Lucro:</strong> ${formatCurrency(abcData.summary.totalMonthlyProfit)} | <strong>Margem Média:</strong> ${formatPercent(abcData.summary.averageMarginPercentage)}</p>
        <table>
          <thead>
            <tr>
              <th>Curva</th>
              <th>Produto</th>
              <th>Preço</th>
              <th>Margem</th>
              <th>Estoque Total</th>
              <th>Fat. Mensal Est.</th>
              <th>Part. %</th>
              <th>Part. Acum.</th>
              <th>Giro</th>
            </tr>
          </thead>
          <tbody>
            ${abcData.items
              .map(
                (item) => `
              <tr>
                <td class="text-center"><strong>${item.abcClass}</strong></td>
                <td>${item.name} <br><small>${item.barcode}</small></td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatPercent(item.marginPercentage)}</td>
                <td>${item.totalStockQty}</td>
                <td>${formatCurrency(item.estimatedMonthlyRevenue)}</td>
                <td>${formatPercent(item.revenueSharePercentage)}</td>
                <td>${formatPercent(item.accumulatedSharePercentage)}</td>
                <td>${item.turnoverClass}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (activeTab === 'matrix' && matrixData) {
      title = 'Matriz de Rentabilidade x Giro (Decisão de Mix e Estoque)';
      contentHtml = `
        <table>
          <thead>
            <tr>
              <th>Quadrante</th>
              <th>Produto</th>
              <th>Preço</th>
              <th>Margem</th>
              <th>Giro</th>
              <th>Fat. Est.</th>
              <th>Recomendação Comercial</th>
            </tr>
          </thead>
          <tbody>
            ${matrixData.items
              .map(
                (item) => `
              <tr>
                <td><strong>${item.quadrantLabel}</strong></td>
                <td>${item.name}</td>
                <td>${formatCurrency(item.price)}</td>
                <td>${formatPercent(item.marginPercentage)}</td>
                <td>${formatNumber(item.turnoverRatio, 1)}x</td>
                <td>${formatCurrency(item.estimatedMonthlyRevenue)}</td>
                <td>${item.recommendation}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (activeTab === 'replenishment' && replenishmentData) {
      title = 'Planejamento de Compras e Ponto de Reposição (ROP)';
      contentHtml = `
        <p><strong>Total Pedidos Urgentes:</strong> ${replenishmentData.summary.urgentOrdersCount} | <strong>Investimento Total Sugerido:</strong> ${formatCurrency(replenishmentData.summary.totalSuggestedInvestment)}</p>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Produto</th>
              <th>Estoque Atual</th>
              <th>Ponto Pedido</th>
              <th>Sugestão Compra</th>
              <th>Custo Est.</th>
              <th>Autonomia</th>
            </tr>
          </thead>
          <tbody>
            ${replenishmentData.items
              .map(
                (item) => `
              <tr>
                <td><strong>${item.statusLabel}</strong></td>
                <td>${item.name}</td>
                <td>${item.totalStockQty}</td>
                <td>${item.reorderPoint}</td>
                <td><strong>${item.suggestedOrderQty} un</strong></td>
                <td>${formatCurrency(item.estimatedOrderCost)}</td>
                <td>${item.stockDaysRemaining} dias</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    } else if (activeTab === 'space' && spaceData) {
      title = 'Otimização de Espaço Físico (Gôndolas vs Depósito)';
      contentHtml = `
        <table>
          <thead>
            <tr>
              <th>Ação Recomendada</th>
              <th>Produto</th>
              <th>Gôndola</th>
              <th>Depósito</th>
              <th>Part. Faturamento</th>
              <th>Score Eficiência</th>
              <th>Capacidade Sugerida</th>
            </tr>
          </thead>
          <tbody>
            ${spaceData.items
              .map(
                (item) => `
              <tr>
                <td><strong>${item.actionLabel}</strong></td>
                <td>${item.name}</td>
                <td>${item.shelfQty} un</td>
                <td>${item.depotQty} un</td>
                <td>${formatPercent(item.revenueSharePercentage)}</td>
                <td>${formatNumber(item.spaceEfficiencyScore, 2)}</td>
                <td>${item.suggestedShelfCapacity} un</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      `;
    }

    if (title && contentHtml) {
      printReport(title, contentHtml);
    }
  };

  // Filtragem local por texto de busca para tabelas
  const filteredAbcItems = abcData?.items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.barcode.includes(searchFilter)
  );

  const filteredMatrixItems = matrixData?.items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.barcode.includes(searchFilter)
  );

  const filteredReplenishmentItems = replenishmentData?.items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.barcode.includes(searchFilter)
  );

  const filteredSpaceItems = spaceData?.items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.barcode.includes(searchFilter)
  );

  const handleMatrixChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setMatrixClassification(e.target.value as MatrixQuadrantOption);
  };

  const handleReplenishmentStatusChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setReplenishmentStatus(e.target.value as ReplenishmentStatusOption);
  };

  const handleSpaceActionChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSpaceAction(e.target.value as SpaceActionOption);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border-neutral shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <BarChart3 className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Relatórios e Inteligência Comercial
            </h1>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Análises executivas de Curva ABC, Matriz de Giro x Margem, Compras (ROP) e Otimização de Gôndolas.
          </p>
        </div>

        {/* Ações de Exportação e Atualização */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-text-muted hover:text-text-primary bg-canvas hover:bg-neutral-200/60 rounded-xl border border-border-neutral transition-all disabled:opacity-50"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-text-primary bg-canvas hover:bg-neutral-200/60 rounded-xl border border-border-neutral transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-brand-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Navegação de Abas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-neutral pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'overview'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-card text-text-muted hover:text-text-primary border border-border-neutral'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Visão Geral Executiva
        </button>

        <button
          onClick={() => setActiveTab('abc')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'abc'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-card text-text-muted hover:text-text-primary border border-border-neutral'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Curva ABC
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'matrix'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-card text-text-muted hover:text-text-primary border border-border-neutral'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Matriz Giro x Margem
        </button>

        <button
          onClick={() => setActiveTab('replenishment')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'replenishment'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-card text-text-muted hover:text-text-primary border border-border-neutral'
          }`}
        >
          <Truck className="w-4 h-4" />
          Planejamento de Compras (ROP)
        </button>

        <button
          onClick={() => setActiveTab('space')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'space'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'bg-card text-text-muted hover:text-text-primary border border-border-neutral'
          }`}
        >
          <Maximize2 className="w-4 h-4" />
          Otimização de Espaço
        </button>
      </div>

      {/* Barra de Filtros Customizada de Acordo com a Aba */}
      {activeTab !== 'overview' && (
        <div className="bg-card p-4 rounded-2xl border border-border-neutral shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Campo de Busca Rápida */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <label htmlFor={searchInputId} className="sr-only">
                Buscar por produto ou código de barras
              </label>
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id={searchInputId}
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar por produto ou código de barras..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-canvas border border-border-neutral rounded-xl focus:outline-hidden focus:border-brand-500 transition-colors"
              />
            </div>

            {/* Filtro por Categoria */}
            <div className="flex items-center gap-2">
              <label htmlFor={categoryInputId} className="sr-only">
                Filtrar por Categoria
              </label>
              <Filter className="w-4 h-4 text-text-muted" />
              <input
                id={categoryInputId}
                type="text"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Filtrar Categoria..."
                className="px-3 py-2 text-sm bg-canvas border border-border-neutral rounded-xl focus:outline-hidden focus:border-brand-500 transition-colors w-40"
              />
            </div>
          </div>

          {/* Filtros específicos de cada aba */}
          <div className="flex flex-wrap items-center gap-3">
            {activeTab === 'abc' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted">Ordenar por:</span>
                <select
                  value={abcSortBy}
                  onChange={(e) =>
                    setAbcSortBy(e.target.value as 'revenue' | 'margin' | 'turnover' | 'salesVolume')
                  }
                  className="px-3 py-2 text-xs font-semibold bg-canvas border border-border-neutral rounded-xl focus:outline-hidden focus:border-brand-500"
                >
                  <option value="revenue">Faturamento Estimado</option>
                  <option value="margin">Margem Unitária</option>
                  <option value="turnover">Velocidade de Giro</option>
                  <option value="salesVolume">Volume de Vendas</option>
                </select>
              </div>
            )}

            {activeTab === 'matrix' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted">Quadrante:</span>
                <select
                  value={matrixClassification}
                  onChange={handleMatrixChange}
                  className="px-3 py-2 text-xs font-semibold bg-canvas border border-border-neutral rounded-xl focus:outline-hidden focus:border-brand-500"
                >
                  <option value="">Todos os Quadrantes</option>
                  <option value="ESTRELA">Estrelas (Alto Giro / Alta Margem)</option>
                  <option value="ALTO_GIRO">Alto Giro (Giro Rápido / Margem Baixa)</option>
                  <option value="GERADOR_MARGEM">Gerador de Margem (Alta Margem / Giro Baixo)</option>
                  <option value="LENTO_ABAIXO_MARGEM">Críticos / Lentos (Baixo Giro / Baixa Margem)</option>
                </select>
              </div>
            )}

            {activeTab === 'replenishment' && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-text-muted">Status:</span>
                  <select
                    value={replenishmentStatus}
                    onChange={handleReplenishmentStatusChange}
                    className="px-2.5 py-1.5 text-xs font-semibold bg-canvas border border-border-neutral rounded-xl focus:outline-hidden focus:border-brand-500"
                  >
                    <option value="">Todos</option>
                    <option value="CRITICO_RUPTURA">Crítico (Ruptura)</option>
                    <option value="COMPRA_URGENTE">Compra Urgente</option>
                    <option value="ATENCAO">Atenção</option>
                    <option value="ESTAVEL">Estável</option>
                    <option value="EXCESSO">Excesso de Estoque</option>
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-canvas px-2.5 py-1.5 rounded-xl border border-border-neutral text-xs">
                  <span className="text-text-muted font-medium">Lead Time:</span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={replenishmentLeadTime}
                    onChange={(e) => setReplenishmentLeadTime(Number(e.target.value) || 7)}
                    className="w-10 text-center font-bold text-text-primary bg-card rounded border border-border-neutral"
                  />
                  <span className="text-text-muted">dias</span>
                </div>

                <div className="flex items-center gap-1 bg-canvas px-2.5 py-1.5 rounded-xl border border-border-neutral text-xs">
                  <span className="text-text-muted font-medium">Segurança:</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={replenishmentSafetyStock}
                    onChange={(e) => setReplenishmentSafetyStock(Number(e.target.value) || 3)}
                    className="w-10 text-center font-bold text-text-primary bg-card rounded border border-border-neutral"
                  />
                  <span className="text-text-muted">dias</span>
                </div>
              </div>
            )}

            {activeTab === 'space' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted">Recomendação:</span>
                <select
                  value={spaceAction}
                  onChange={handleSpaceActionChange}
                  className="px-3 py-2 text-xs font-semibold bg-canvas border border-border-neutral rounded-xl focus:outline-hidden focus:border-brand-500"
                >
                  <option value="">Todas as Ações</option>
                  <option value="EXPANDIR_GONDOLA">Expandir Espaço na Gôndola</option>
                  <option value="MANTER">Manter Proporção Atual</option>
                  <option value="REDUZIR_GONDOLA">Reduzir Espaço na Gôndola</option>
                  <option value="REAVALIAR_MIX">Reavaliar Mix / Remover de Linha</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estado de Carregamento */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-16 bg-card rounded-2xl border border-border-neutral text-text-muted">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mb-3" />
          <p className="font-semibold text-sm">Processando métricas e indicadores de estoque...</p>
        </div>
      )}

      {/* Estado de Erro */}
      {error && !loading && (
        <div className="p-4 bg-status-danger-bg border border-red-200 rounded-2xl text-status-danger flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-sm">Não foi possível carregar o relatório</h2>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. ABA: VISÃO GERAL EXECUTIVA                                       */}
      {/* ==================================================================== */}
      {!loading && !error && activeTab === 'overview' && overviewData && (
        <div className="space-y-6">
          {/* Métricas Principais (Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-2xl border border-border-neutral shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Valor em Estoque
                </span>
                <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary mt-2">
                {formatCurrency(overviewData.inventoryOverview.totalCatalogValue)}
              </p>
              <div className="flex items-center justify-between text-xs text-text-muted mt-2 pt-2 border-t border-border-neutral">
                <span>Lucro Bruto Est.:</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(overviewData.inventoryOverview.potentialGrossProfit)}
                </span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border-neutral shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Mix e Unidades
                </span>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Package className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-text-primary mt-2">
                {overviewData.inventoryOverview.totalSKUs} <span className="text-sm font-normal text-text-muted">SKUs</span>
              </p>
              <div className="flex items-center justify-between text-xs text-text-muted mt-2 pt-2 border-t border-border-neutral">
                <span>Gôndola / Depósito:</span>
                <span className="font-semibold text-text-primary">
                  {overviewData.inventoryOverview.totalShelfUnits} / {overviewData.inventoryOverview.totalDepotUnits} un
                </span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border-neutral shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Margem Média Geral
                </span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 mt-2">
                {formatPercent(overviewData.inventoryOverview.averageMarginPercentage)}
              </p>
              <div className="flex items-center justify-between text-xs text-text-muted mt-2 pt-2 border-t border-border-neutral">
                <span>Itens Alta Rentab. (A):</span>
                <span className="font-semibold text-text-primary">
                  {overviewData.turnoverAndABC.classACount} SKUs
                </span>
              </div>
            </div>

            <div className="bg-card p-5 rounded-2xl border border-border-neutral shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Risco de Ruptura & Compras
                </span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-600 mt-2">
                {overviewData.purchasingAlerts.reorderUrgentCount} <span className="text-sm font-normal text-text-muted">pedidos urgentes</span>
              </p>
              <div className="flex items-center justify-between text-xs text-text-muted mt-2 pt-2 border-t border-border-neutral">
                <span>Capital Necessário:</span>
                <span className="font-semibold text-amber-700">
                  {formatCurrency(overviewData.purchasingAlerts.estimatedCapitalRequired)}
                </span>
              </div>
            </div>
          </div>

          {/* Curva ABC Resumo & Recomendações da IA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Divisão Curva ABC */}
            <div className="bg-card p-6 rounded-2xl border border-border-neutral shadow-2xs flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-text-primary mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-brand-600" />
                  Distribuição da Curva ABC
                </h3>
                <p className="text-xs text-text-muted mb-6">
                  Proporção de SKUs que concentram o faturamento e giro da loja conforme o princípio de Pareto.
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-emerald-700">Classe A (80% Faturamento)</span>
                      <span>{overviewData.turnoverAndABC.classACount} itens</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            overviewData.inventoryOverview.totalSKUs > 0
                              ? (overviewData.turnoverAndABC.classACount /
                                  overviewData.inventoryOverview.totalSKUs) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-blue-700">Classe B (15% Faturamento)</span>
                      <span>{overviewData.turnoverAndABC.classBCount} itens</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            overviewData.inventoryOverview.totalSKUs > 0
                              ? (overviewData.turnoverAndABC.classBCount /
                                  overviewData.inventoryOverview.totalSKUs) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-amber-700">Classe C (5% Faturamento)</span>
                      <span>{overviewData.turnoverAndABC.classCCount} itens</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-2.5 rounded-full"
                        style={{
                          width: `${
                            overviewData.inventoryOverview.totalSKUs > 0
                              ? (overviewData.turnoverAndABC.classCCount /
                                  overviewData.inventoryOverview.totalSKUs) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('abc')}
                className="mt-6 w-full py-2 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Ver Detalhes da Curva ABC
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Recomendações Estratégicas Inteligentes */}
            <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border-neutral shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-500" />
                    Recomendações e Insights do Assistente
                  </h3>
                  <span className="px-2.5 py-0.5 text-tiny font-bold bg-brand-50 text-brand-700 rounded-full">
                    AUTOMÁTICO
                  </span>
                </div>

                <div className="space-y-3">
                  {overviewData.quickRecommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-canvas rounded-xl border border-border-neutral flex items-start gap-3 text-xs leading-relaxed"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
                      <span className="text-text-primary font-medium">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border-neutral flex items-center justify-between text-xs text-text-muted">
                <span>Tenant: <strong>{overviewData.tenant.name}</strong> ({overviewData.tenant.category})</span>
                <span>Foco: <strong>Máxima Rentabilidade & Zero Ruptura</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. ABA: CURVA ABC                                                    */}
      {/* ==================================================================== */}
      {!loading && !error && activeTab === 'abc' && abcData && (
        <div className="space-y-6">
          {/* Sumário da Curva ABC */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                Classe A (80% Faturamento)
              </span>
              <p className="text-2xl font-bold text-emerald-950 mt-1">
                {abcData.summary.classACount} <span className="text-sm font-normal">produtos</span>
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {formatCurrency(abcData.summary.classARevenue)} faturamento estimado
              </p>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">
                Classe B (15% Faturamento)
              </span>
              <p className="text-2xl font-bold text-blue-950 mt-1">
                {abcData.summary.classBCount} <span className="text-sm font-normal">produtos</span>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                {formatCurrency(abcData.summary.classBRevenue)} faturamento estimado
              </p>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                Classe C (5% Faturamento)
              </span>
              <p className="text-2xl font-bold text-amber-950 mt-1">
                {abcData.summary.classCCount} <span className="text-sm font-normal">produtos</span>
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {formatCurrency(abcData.summary.classCRevenue)} faturamento estimado
              </p>
            </div>
          </div>

          {/* Tabela da Curva ABC */}
          <div className="bg-card rounded-2xl border border-border-neutral shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-border-neutral text-text-muted font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Classe</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-right">Preço</th>
                    <th className="py-3 px-4 text-right">Margem %</th>
                    <th className="py-3 px-4 text-center">Gôndola / Depósito</th>
                    <th className="py-3 px-4 text-right">Fat. Mensal Est.</th>
                    <th className="py-3 px-4 text-right">Part. %</th>
                    <th className="py-3 px-4 text-right">Acumulado %</th>
                    <th className="py-3 px-4 text-center">Giro</th>
                    <th className="py-3 px-4 text-center">Autonomia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-neutral font-medium text-text-primary">
                  {filteredAbcItems && filteredAbcItems.length > 0 ? (
                    filteredAbcItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-bold text-xs ${
                              item.abcClass === 'A'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : item.abcClass === 'B'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {item.abcClass}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-text-primary">{item.name}</div>
                          <div className="text-tiny text-text-muted flex items-center gap-2 mt-0.5">
                            <span>EAN: {item.barcode}</span>
                            {item.category && (
                              <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">
                                {item.category}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`font-bold ${
                              item.marginPercentage >= 30
                                ? 'text-emerald-600'
                                : item.marginPercentage >= 15
                                ? 'text-blue-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {formatPercent(item.marginPercentage)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-text-muted">
                          <span className="font-bold text-text-primary">{item.shelfQty}</span> / {item.depotQty} un
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                          {formatCurrency(item.estimatedMonthlyRevenue)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold">
                          {formatPercent(item.revenueSharePercentage)}
                        </td>
                        <td className="py-3.5 px-4 text-right text-text-muted">
                          {formatPercent(item.accumulatedSharePercentage)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-tiny font-bold ${
                              item.turnoverClass === 'ALTO'
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.turnoverClass === 'MEDIO'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {item.turnoverClass}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-semibold ${
                              item.stockDaysRemaining <= 5
                                ? 'text-red-600 font-bold'
                                : item.stockDaysRemaining <= 15
                                ? 'text-amber-600'
                                : 'text-text-muted'
                            }`}
                          >
                            {item.stockDaysRemaining} dias
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-text-muted">
                        Nenhum produto encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. ABA: MATRIZ GIRO X MARGEM                                         */}
      {/* ==================================================================== */}
      {!loading && !error && activeTab === 'matrix' && matrixData && (
        <div className="space-y-6">
          {/* Visão em Grid dos 4 Quadrantes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-emerald-50/50 border border-emerald-200 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  PRODUTOS ESTRELA (Alto Giro + Alta Margem)
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                  {matrixData.distribution.estrelasCount} itens
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-2">
                Os motores da loja. Priorizar máxima visibilidade na gôndola, garantir estoque de segurança reforçado e nunca deixar faltar.
              </p>
            </div>

            <div className="bg-blue-50/50 border border-blue-200 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-blue-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  ALTO GIRO (Chamarizes de Tráfego)
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-xs rounded-full">
                  {matrixData.distribution.altoGiroCount} itens
                </span>
              </div>
              <p className="text-xs text-blue-800 mt-2">
                Produtos de altíssima saída mas margem reduzida. Atraem clientes; testar pequenos aumentos de preço ou vendas combinadas.
              </p>
            </div>

            <div className="bg-purple-50/50 border border-purple-200 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-purple-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  GERADORES DE MARGEM (Rentáveis / Especialidades)
                </span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-xs rounded-full">
                  {matrixData.distribution.geradorMargemCount} itens
                </span>
              </div>
              <p className="text-xs text-purple-800 mt-2">
                Margem excelente com saída moderada/lenta. Melhorar sinalização, posicionar na altura dos olhos e promover vendas casadas.
              </p>
            </div>

            <div className="bg-amber-50/50 border border-amber-200 p-5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-amber-900 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  LENTOS / ABAIXO DA MARGEM (Atenção / Redução)
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
                  {matrixData.distribution.lentoAbaixoMargemCount} itens
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-2">
                Capital empatado com baixa rentabilidade. Fazer promoções de queima, reduzir espaço na gôndola ou substituir no mix.
              </p>
            </div>
          </div>

          {/* Tabela com Recomendações da Matriz */}
          <div className="bg-card rounded-2xl border border-border-neutral shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-border-neutral text-text-muted font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Quadrante</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-right">Preço</th>
                    <th className="py-3 px-4 text-right">Margem %</th>
                    <th className="py-3 px-4 text-right">Taxa Giro</th>
                    <th className="py-3 px-4 text-right">Fat. Mensal</th>
                    <th className="py-3 px-4">Recomendação Estratégica</th>
                    <th className="py-3 px-4">Ação Gôndola</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-neutral font-medium text-text-primary">
                  {filteredMatrixItems && filteredMatrixItems.length > 0 ? (
                    filteredMatrixItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-tiny font-bold ${
                              item.quadrant === 'ESTRELA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.quadrant === 'ALTO_GIRO'
                                ? 'bg-blue-100 text-blue-800'
                                : item.quadrant === 'GERADOR_MARGEM'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.quadrantLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-text-primary">{item.name}</div>
                          <div className="text-tiny text-text-muted">EAN: {item.barcode}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                          {formatPercent(item.marginPercentage)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-text-muted">
                          {formatNumber(item.turnoverRatio, 1)}x
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                          {formatCurrency(item.estimatedMonthlyRevenue)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-text-primary max-w-xs">
                          {item.recommendation}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-brand-700 max-w-xs">
                          {item.spaceRecommendation}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-text-muted">
                        Nenhum produto encontrado neste quadrante.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. ABA: PLANEJAMENTO DE COMPRAS (ROP)                                */}
      {/* ==================================================================== */}
      {!loading && !error && activeTab === 'replenishment' && replenishmentData && (
        <div className="space-y-6">
          {/* Header de Resumo de Compras */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card p-4 rounded-2xl border border-border-neutral shadow-2xs">
              <span className="text-xs font-bold text-text-muted uppercase">Produtos Avaliados</span>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {replenishmentData.summary.totalProductsEvaluated} <span className="text-sm font-normal text-text-muted">SKUs</span>
              </p>
            </div>

            <div className="bg-red-50/60 border border-red-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-red-800 uppercase">Necessitam Compra Urgente</span>
              <p className="text-2xl font-bold text-red-950 mt-1">
                {replenishmentData.summary.urgentOrdersCount} <span className="text-sm font-normal">SKUs</span>
              </p>
            </div>

            <div className="bg-brand-50/60 border border-brand-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-brand-800 uppercase">Investimento Sugerido</span>
              <p className="text-2xl font-bold text-brand-950 mt-1">
                {formatCurrency(replenishmentData.summary.totalSuggestedInvestment)}
              </p>
            </div>
          </div>

          {/* Tabela de Ponto de Pedido */}
          <div className="bg-card rounded-2xl border border-border-neutral shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-border-neutral text-text-muted font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Status / Urgência</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Estoque Atual</th>
                    <th className="py-3 px-4 text-center">Mín. Gôndola</th>
                    <th className="py-3 px-4 text-center">Venda / Dia</th>
                    <th className="py-3 px-4 text-center">Ponto de Pedido (ROP)</th>
                    <th className="py-3 px-4 text-center">Sugestão Compra</th>
                    <th className="py-3 px-4 text-right">Investimento Est.</th>
                    <th className="py-3 px-4 text-center">Cobertura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-neutral font-medium text-text-primary">
                  {filteredReplenishmentItems && filteredReplenishmentItems.length > 0 ? (
                    filteredReplenishmentItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-tiny font-bold ${
                              item.status === 'CRITICO_RUPTURA'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : item.status === 'COMPRA_URGENTE'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : item.status === 'ATENCAO'
                                ? 'bg-yellow-100 text-yellow-800'
                                : item.status === 'ESTAVEL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {item.statusLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-text-primary">{item.name}</div>
                          <div className="text-tiny text-text-muted">
                            EAN: {item.barcode} • Custo: {formatCurrency(item.estimatedCost)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-text-primary">
                          {item.totalStockQty} un
                        </td>
                        <td className="py-3.5 px-4 text-center text-text-muted">
                          {item.shelfMinQty} un
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-text-primary">
                          {formatNumber(item.dailySalesRate, 1)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-brand-700">
                          {item.reorderPoint} un
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.suggestedOrderQty > 0 ? (
                            <span className="inline-block px-2 py-0.5 bg-brand-100 text-brand-900 font-bold rounded-md">
                              +{item.suggestedOrderQty} un
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                          {formatCurrency(item.estimatedOrderCost)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-semibold ${
                              item.stockDaysRemaining <= 3
                                ? 'text-red-600 font-bold'
                                : item.stockDaysRemaining <= 7
                                ? 'text-amber-600'
                                : 'text-emerald-700'
                            }`}
                          >
                            {item.stockDaysRemaining} dias
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-text-muted">
                        Nenhum item com este status de reposição.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. ABA: OTIMIZAÇÃO DE ESPAÇO FÍSICO                                  */}
      {/* ==================================================================== */}
      {!loading && !error && activeTab === 'space' && spaceData && (
        <div className="space-y-6">
          {/* Header de Resumo de Gôndolas */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-emerald-800 uppercase">Expandir Gôndola</span>
              <p className="text-2xl font-bold text-emerald-950 mt-1">
                {spaceData.summary.expandGondolaCount} <span className="text-sm font-normal">itens</span>
              </p>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-blue-800 uppercase">Manter Espaço</span>
              <p className="text-2xl font-bold text-blue-950 mt-1">
                {spaceData.summary.maintainCount} <span className="text-sm font-normal">itens</span>
              </p>
            </div>

            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-amber-800 uppercase">Reduzir Gôndola</span>
              <p className="text-2xl font-bold text-amber-950 mt-1">
                {spaceData.summary.reduceGondolaCount} <span className="text-sm font-normal">itens</span>
              </p>
            </div>

            <div className="bg-red-50/60 border border-red-200 p-4 rounded-2xl">
              <span className="text-xs font-bold text-red-800 uppercase">Reavaliar Mix / Remover</span>
              <p className="text-2xl font-bold text-red-950 mt-1">
                {spaceData.summary.reassessMixCount} <span className="text-sm font-normal">itens</span>
              </p>
            </div>
          </div>

          {/* Tabela de Otimização de Gôndola */}
          <div className="bg-card rounded-2xl border border-border-neutral shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-neutral-50 border-b border-border-neutral text-text-muted font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Ação Recomendada</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Localização</th>
                    <th className="py-3 px-4 text-center">Gôndola / Depósito</th>
                    <th className="py-3 px-4 text-right">Part. Faturamento</th>
                    <th className="py-3 px-4 text-center">Eficiência de Espaço</th>
                    <th className="py-3 px-4 text-center">Capacidade Sugerida</th>
                    <th className="py-3 px-4">Motivo / Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-neutral font-medium text-text-primary">
                  {filteredSpaceItems && filteredSpaceItems.length > 0 ? (
                    filteredSpaceItems.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-tiny font-bold ${
                              item.recommendedAction === 'EXPANDIR_GONDOLA'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : item.recommendedAction === 'MANTER'
                                ? 'bg-blue-100 text-blue-800'
                                : item.recommendedAction === 'REDUZIR_GONDOLA'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {item.actionLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-text-primary">{item.name}</div>
                          <div className="text-tiny text-text-muted">EAN: {item.barcode}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center text-text-muted">
                          {item.shelfLocation || 'Gôndola'} / {item.depotLocation || 'Depósito'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-text-primary">
                          <span className="font-bold text-brand-600">{item.shelfQty}</span> / {item.depotQty} un
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                          {formatPercent(item.revenueSharePercentage)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-tiny ${
                              item.spaceEfficiencyScore >= 1.5
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.spaceEfficiencyScore >= 0.8
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {formatNumber(item.spaceEfficiencyScore, 2)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-brand-700">
                          {item.suggestedShelfCapacity} un
                        </td>
                        <td className="py-3.5 px-4 text-xs text-text-muted max-w-sm">
                          {item.actionReason}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-text-muted">
                        Nenhum item encontrado com esta ação.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
