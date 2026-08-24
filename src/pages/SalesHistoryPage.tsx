import { useState, useEffect, useId, type ChangeEvent } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  CreditCard,
  Banknote,
  QrCode,
  DollarSign,
  Package,
  Layers,
  Clock,
  User,
} from 'lucide-react';
import { saleService } from '../services/saleService';
import {
  exportToCsv,
  printReport,
  formatCurrency,
  formatNumber,
} from '../lib/reportExport';
import type {
  SaleResponse,
  ListSalesResponse,
  PaymentMethod,
} from '../types/sale';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'Pix',
  CARTAO_DEBITO: 'Cartão de Débito',
  CARTAO_CREDITO: 'Cartão de Crédito',
  OUTROS: 'Outros',
  MULTIPLOS: 'Múltiplos / Misto',
};

export function SalesHistoryPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [salesData, setSalesData] = useState<ListSalesResponse | null>(null);

  // Filtros
  const [searchFilter, setSearchFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | ''>('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [pageOffset, setPageOffset] = useState<number>(0);
  const pageLimit = 25;

  // Modal de Detalhes da Venda
  const [selectedSale, setSelectedSale] = useState<SaleResponse | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const searchInputId = useId();
  const paymentSelectId = useId();
  const startDateId = useId();
  const endDateId = useId();

  const fetchSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await saleService.list({
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        paymentMethod: paymentMethodFilter || undefined,
        limit: pageLimit,
        offset: pageOffset,
      });
      setSalesData(response);
    } catch (err: unknown) {
      console.error('Erro ao buscar histórico de vendas:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao carregar histórico de vendas.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [startDateFilter, endDateFilter, paymentMethodFilter, pageOffset]);

  const handleOpenSaleDetails = async (sale: SaleResponse) => {
    setSelectedSale(sale);
    setLoadingDetails(true);
    try {
      const details = await saleService.getById(sale.id);
      setSelectedSale(details.sale);
    } catch (err) {
      console.error('Erro ao carregar detalhes completos da venda:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Exportação para CSV
  const handleExportCsv = () => {
    if (!salesData || salesData.sales.length === 0) {
      alert('Nenhuma venda encontrada para exportação.');
      return;
    }

    exportToCsv(
      'historico_vendas_pdv',
      salesData.sales,
      [
        { header: 'ID da Venda', key: 'id' },
        {
          header: 'Data/Hora',
          key: (s) => new Date(s.createdAt).toLocaleString('pt-BR'),
        },
        { header: 'Forma de Pagamento', key: (s) => PAYMENT_METHOD_LABELS[s.paymentMethod] || s.paymentMethod },
        { header: 'Quantidade de Itens', key: 'totalItems' },
        { header: 'Valor Total (R$)', key: 'totalAmount' },
        { header: 'Operador / Vendedor', key: (s) => s.user?.name || 'Sistema / Caixa' },
      ]
    );
  };

  // Impressão / PDF
  const handlePrint = () => {
    if (!salesData || salesData.sales.length === 0) {
      alert('Nenhuma venda disponível para impressão.');
      return;
    }

    const title = 'Relatório de Histórico de Vendas (PDV)';
    const contentHtml = `
      <p>
        <strong>Total de Registros:</strong> ${salesData.total} | 
        <strong>Janela do Plano (${salesData.planRetention.plan}):</strong> ${salesData.planRetention.maxDaysAllowed} dias
      </p>
      <table>
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>ID Venda</th>
            <th>Operador</th>
            <th>Forma Pagamento</th>
            <th class="text-center">Qtd Itens</th>
            <th class="text-right">Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${salesData.sales
            .map(
              (sale) => `
            <tr>
              <td>${new Date(sale.createdAt).toLocaleString('pt-BR')}</td>
              <td><small>${sale.id.slice(0, 8)}</small></td>
              <td>${sale.user?.name || 'Caixa'}</td>
              <td>${PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}</td>
              <td class="text-center">${sale.totalItems}</td>
              <td class="text-right"><strong>${formatCurrency(sale.totalAmount)}</strong></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;

    printReport(title, contentHtml);
  };

  // Filtragem local por busca (ID da venda, nome de produto ou operador)
  const filteredSales = salesData?.sales.filter((sale) => {
    const term = searchFilter.toLowerCase();
    const matchesId = sale.id.toLowerCase().includes(term);
    const matchesUser = sale.user?.name.toLowerCase().includes(term);
    const matchesItem = sale.items?.some((item) =>
      item.product?.name.toLowerCase().includes(term) ||
      item.product?.barcode.includes(term)
    );
    return matchesId || matchesUser || matchesItem || !term;
  });

  // Métricas rápidas da página
  const totalPageRevenue = filteredSales?.reduce((acc, s) => acc + s.totalAmount, 0) || 0;
  const totalPageItems = filteredSales?.reduce((acc, s) => acc + s.totalItems, 0) || 0;

  const handlePaymentChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setPaymentMethodFilter(e.target.value as PaymentMethod | '');
    setPageOffset(0);
  };

  const getPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'PIX':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-tiny font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <QrCode className="w-3 h-3" /> Pix
          </span>
        );
      case 'DINHEIRO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-tiny font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Banknote className="w-3 h-3" /> Dinheiro
          </span>
        );
      case 'CARTAO_DEBITO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-tiny font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3 h-3" /> Débito
          </span>
        );
      case 'CARTAO_CREDITO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-tiny font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard className="w-3 h-3" /> Crédito
          </span>
        );
      case 'MULTIPLOS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-tiny font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Layers className="w-3 h-3" /> Múltiplos
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-tiny font-bold bg-neutral-100 text-neutral-700">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-5 rounded-2xl border border-border-neutral shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Receipt className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Histórico de Vendas (PDV)
            </h1>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Registro de todas as operações de frente de caixa com comprovante e itens vendidos.
          </p>
        </div>

        {/* Ações de Exportação e Atualização */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSales}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-text-muted hover:text-text-primary bg-canvas hover:bg-neutral-200/60 rounded-xl border border-border-neutral transition-all disabled:opacity-50 cursor-pointer"
            title="Atualizar histórico"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={loading || !salesData?.sales.length}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-text-primary bg-canvas hover:bg-neutral-200/60 rounded-xl border border-border-neutral transition-all shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-brand-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={loading || !salesData?.sales.length}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir / PDF</span>
          </button>
        </div>
      </div>

      {/* Cards de Métricas Resumo */}
      {salesData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card p-4 rounded-2xl border border-border-neutral shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Total de Vendas
              </span>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {salesData.total} <span className="text-sm font-normal text-text-muted">registros</span>
              </p>
            </div>
            <span className="p-3 bg-brand-50 text-brand-600 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border-neutral shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Volume na Página
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(totalPageRevenue)}
              </p>
            </div>
            <span className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>

          <div className="bg-card p-4 rounded-2xl border border-border-neutral shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Itens Vendidos na Página
              </span>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatNumber(totalPageItems)} <span className="text-sm font-normal text-text-muted">unidades</span>
              </p>
            </div>
            <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="w-5 h-5" />
            </span>
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-card p-4 rounded-2xl border border-border-neutral shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <label htmlFor={searchInputId} className="sr-only">
              Buscar venda
            </label>
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              id={searchInputId}
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Buscar por ID, operador ou produto..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-canvas border border-border-neutral rounded-xl focus:outline-hidden focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Filtro por Forma de Pagamento */}
          <div className="flex items-center gap-2">
            <label htmlFor={paymentSelectId} className="sr-only">
              Forma de Pagamento
            </label>
            <Filter className="w-4 h-4 text-text-muted" />
            <select
              id={paymentSelectId}
              value={paymentMethodFilter}
              onChange={handlePaymentChange}
              className="px-3 py-2 text-xs font-semibold bg-canvas border border-border-neutral rounded-xl focus:outline-hidden focus:border-brand-500"
            >
              <option value="">Todas as Formas de Pagamento</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">Pix</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="MULTIPLOS">Múltiplos / Misto</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>
        </div>

        {/* Filtros de Data */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-canvas px-2.5 py-1.5 rounded-xl border border-border-neutral text-xs">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <label htmlFor={startDateId} className="text-text-muted font-medium">De:</label>
            <input
              id={startDateId}
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setPageOffset(0);
              }}
              className="bg-transparent text-xs font-semibold text-text-primary focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-canvas px-2.5 py-1.5 rounded-xl border border-border-neutral text-xs">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            <label htmlFor={endDateId} className="text-text-muted font-medium">Até:</label>
            <input
              id={endDateId}
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setPageOffset(0);
              }}
              className="bg-transparent text-xs font-semibold text-text-primary focus:outline-hidden"
            />
          </div>

          {(startDateFilter || endDateFilter || paymentMethodFilter || searchFilter) && (
            <button
              onClick={() => {
                setStartDateFilter('');
                setEndDateFilter('');
                setPaymentMethodFilter('');
                setSearchFilter('');
                setPageOffset(0);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-neutral-200/50 rounded-xl transition-colors cursor-pointer"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Informação de Retenção do Plano */}
      {salesData?.planRetention && (
        <div className="px-4 py-2 bg-brand-50/60 border border-brand-100 rounded-xl flex items-center justify-between text-xs text-brand-900">
          <span>
            Plano <strong>{salesData.planRetention.plan}</strong>: Retenção máxima de histórico de{' '}
            <strong>{salesData.planRetention.maxDaysAllowed} dias</strong>.
          </span>
          <span className="text-brand-700 hidden sm:inline">
            Janela: {new Date(salesData.planRetention.appliedStartDate).toLocaleDateString('pt-BR')} até{' '}
            {new Date(salesData.planRetention.appliedEndDate).toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-16 bg-card rounded-2xl border border-border-neutral text-text-muted">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-600 mb-3" />
          <p className="font-semibold text-sm">Carregando histórico de vendas...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="p-4 bg-status-danger-bg border border-red-200 rounded-2xl text-status-danger flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-sm">Erro ao carregar vendas</h2>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Tabela de Vendas */}
      {!loading && !error && salesData && (
        <div className="bg-card rounded-2xl border border-border-neutral shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-border-neutral text-text-muted font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">ID da Venda</th>
                  <th className="py-3 px-4">Operador</th>
                  <th className="py-3 px-4">Forma de Pagamento</th>
                  <th className="py-3 px-4 text-center">Qtd Itens</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-neutral font-medium text-text-primary">
                {filteredSales && filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-text-primary">
                          {new Date(sale.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-tiny text-text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(sale.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-tiny text-text-muted">
                        {sale.id.slice(0, 8)}...
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-text-primary font-semibold">
                          <User className="w-3.5 h-3.5 text-text-muted" />
                          {sale.user?.name || 'Caixa Local'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getPaymentBadge(sale.paymentMethod)}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-text-primary">
                        {sale.totalItems} un
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 text-sm">
                        {formatCurrency(sale.totalAmount)}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenSaleDetails(sale)}
                          className="p-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver detalhes da venda"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-text-muted">
                      Nenhuma venda encontrada para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="p-4 border-t border-border-neutral flex items-center justify-between text-xs text-text-muted">
            <span>
              Exibindo <strong>{salesData.sales.length}</strong> de <strong>{salesData.total}</strong> vendas
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageOffset((prev) => Math.max(0, prev - pageLimit))}
                disabled={pageOffset === 0 || loading}
                className="p-2 border border-border-neutral rounded-xl hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-semibold text-text-primary">
                Página {Math.floor(pageOffset / pageLimit) + 1} de{' '}
                {Math.max(1, Math.ceil(salesData.total / pageLimit))}
              </span>

              <button
                onClick={() => setPageOffset((prev) => prev + pageLimit)}
                disabled={pageOffset + pageLimit >= salesData.total || loading}
                className="p-2 border border-border-neutral rounded-xl hover:bg-canvas disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Venda */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-border-neutral rounded-3xl p-6 shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-border-neutral mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                  <Receipt className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-text-primary">
                    Comprovante de Venda
                  </h3>
                  <p className="text-tiny text-text-muted font-mono">
                    ID: {selectedSale.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSale(null)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Informações da Venda */}
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3 bg-canvas p-3 rounded-2xl border border-border-neutral text-xs">
                <div>
                  <span className="text-text-muted block">Data e Hora:</span>
                  <strong className="text-text-primary">
                    {new Date(selectedSale.createdAt).toLocaleString('pt-BR')}
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted block">Operador:</span>
                  <strong className="text-text-primary">
                    {selectedSale.user?.name || 'Caixa Local'}
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted block">Forma de Pagamento:</span>
                  <div className="mt-0.5">{getPaymentBadge(selectedSale.paymentMethod)}</div>
                </div>
                <div>
                  <span className="text-text-muted block">Total de Itens:</span>
                  <strong className="text-text-primary">{selectedSale.totalItems} un</strong>
                </div>
              </div>

              {/* Lista de Itens */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase mb-2">
                  Itens Comprados
                </h4>

                {loadingDetails ? (
                  <div className="p-6 text-center text-text-muted">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-600" />
                    <span>Carregando itens...</span>
                  </div>
                ) : selectedSale.items && selectedSale.items.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedSale.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 bg-canvas rounded-xl border border-border-neutral flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-text-primary">
                            {item.product?.name || 'Produto'}
                          </p>
                          <p className="text-tiny text-text-muted">
                            EAN: {item.product?.barcode} • {item.quantity} un x{' '}
                            {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                        <span className="font-bold text-text-primary">
                          {formatCurrency(item.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">Itens consolidados na venda.</p>
                )}
              </div>

              {/* Totalizador */}
              <div className="pt-3 border-t border-border-neutral flex items-center justify-between">
                <span className="text-sm font-bold text-text-muted">Valor Total da Venda:</span>
                <span className="text-xl font-bold text-emerald-600">
                  {formatCurrency(selectedSale.totalAmount)}
                </span>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="mt-5 pt-3 border-t border-border-neutral flex justify-end gap-2">
              <button
                onClick={() => setSelectedSale(null)}
                className="px-4 py-2 text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-text-primary rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
