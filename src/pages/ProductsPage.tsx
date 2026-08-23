import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Plus,
  Search,
  Barcode,
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
  Edit2,
  Trash2,
  ArrowRightLeft,
  TrendingDown,
  CheckCircle,
  LayoutGrid,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Filter,
} from 'lucide-react';
import { productService } from '../services/productService';
import { ApiError } from '../services/api';
import type { Product, CriticalProduct } from '../types/product';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { TransferStockModal } from '../components/products/TransferStockModal';
import { PosSaleModal } from '../components/products/PosSaleModal';
import { BarcodeScannerModal } from '../components/products/BarcodeScannerModal';
import { db } from '../lib/db';

type ViewTab = 'all' | 'critical';
type DisplayMode = 'cards' | 'table';
type SortField = 'name' | 'category' | 'depotQty' | 'shelfQty' | 'price';
type SortDirection = 'asc' | 'desc';

export function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [criticalProducts, setCriticalProducts] = useState<CriticalProduct[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('cards');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isLoading, setIsLoading] = useState(false);
  const [isCriticalLoading, setIsCriticalLoading] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formInitialBarcode, setFormInitialBarcode] = useState<string>('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'search' | 'create' | 'pos'>('search');
  const [posScannedBarcode, setPosScannedBarcode] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle welcome message or redirect state
  useEffect(() => {
    const state = location.state;
    if (state && typeof state === 'object' && 'welcomeMessage' in state && typeof state.welcomeMessage === 'string') {
      setFeedbackMessage({
        type: 'success',
        text: state.welcomeMessage,
      });
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setFeedbackMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [location, navigate]);
  // Sincroniza com parâmetros de URL (ex: ?tab=critical ou ?modal=pos da sidebar/bottom-nav)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    const modalParam = searchParams.get('modal');

    if (tabParam === 'critical') {
      setActiveTab('critical');
    } else if (tabParam === 'all') {
      setActiveTab('all');
    }

    if (modalParam === 'pos') {
      setIsPosModalOpen(true);
    }
  }, [location.search]);
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        const response = await productService.list({
          search: searchTerm || undefined,
          category: selectedCategory || undefined,
          limit: 100,
        });
        setProducts(response.products);
        setTotalCount(response.total);

        // Atualiza a lista de categorias disponíveis acumulando as categorias encontradas
        if (response.products.length > 0) {
          const newCats = response.products
            .map((p) => p.category)
            .filter(Boolean) as string[];
          setAvailableCategories((prev) => Array.from(new Set([...prev, ...newCats])));

          // Sync with IndexedDB
          await db.products.bulkPut(
            response.products.map((p) => ({ ...p, synced: true }))
          ).catch((e) => console.warn('Dexie save error:', e));
        }
      } else {
        // Offline load from IndexedDB
        let offlineList = await db.products.toArray();
        const offlineCats = offlineList
          .map((p) => p.category)
          .filter(Boolean) as string[];
        setAvailableCategories((prev) => Array.from(new Set([...prev, ...offlineCats])));

        if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          offlineList = offlineList.filter(
            (p) =>
              p.name.toLowerCase().includes(lower) ||
              p.barcode.toLowerCase().includes(lower)
          );
        }
        if (selectedCategory) {
          offlineList = offlineList.filter((p) => p.category === selectedCategory);
        }
        setProducts(offlineList);
        setTotalCount(offlineList.length);
      }
    } catch (err) {
      console.warn('Erro ao carregar produtos do servidor, tentando offline...', err);
      const offlineList = await db.products.toArray();
      const offlineCats = offlineList
        .map((p) => p.category)
        .filter(Boolean) as string[];
      setAvailableCategories((prev) => Array.from(new Set([...prev, ...offlineCats])));
      setProducts(offlineList);
      setTotalCount(offlineList.length);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  // Fetch critical products
  const fetchCriticalProducts = useCallback(async () => {
    setIsCriticalLoading(true);
    try {
      if (navigator.onLine) {
        const response = await productService.getCritical();
        setCriticalProducts(response.products);
      } else {
        const offlineList = await db.products.toArray();
        const critical = offlineList
          .filter((p) => p.shelfQty <= p.shelfMinQty)
          .map((p) => {
            const deficit = Math.max(0, p.shelfMinQty - p.shelfQty);
            const deficitPct = p.shelfMinQty > 0 ? (deficit / p.shelfMinQty) * 100 : 100;
            return {
              ...p,
              deficit,
              deficitPercentage: deficitPct,
              needsReplenishment: true,
            };
          });
        setCriticalProducts(critical);
      }
    } catch (err) {
      console.warn('Erro ao buscar produtos críticos:', err);
    } finally {
      setIsCriticalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCriticalProducts();
  }, [fetchProducts, fetchCriticalProducts]);

  const handleProductCreatedOrUpdated = (product: Product) => {
    setFeedbackMessage({
      type: 'success',
      text: `Produto "${product.name}" salvo com sucesso!`,
    });
    fetchProducts();
    fetchCriticalProducts();
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleStockTransferred = (product: Product) => {
    setFeedbackMessage({
      type: 'success',
      text: `Transferência de ${product.name} para a gôndola concluída!`,
    });
    fetchProducts();
    fetchCriticalProducts();
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handlePosSaleSuccess = () => {
    setFeedbackMessage({
      type: 'success',
      text: 'Venda registrada e estoque de gôndola baixado com sucesso!',
    });
    fetchProducts();
    fetchCriticalProducts();
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await productService.delete(id);
      await db.products.delete(id).catch(() => {});
      setFeedbackMessage({
        type: 'success',
        text: 'Produto excluído com sucesso!',
      });
      setDeleteConfirmId(null);
      fetchProducts();
      fetchCriticalProducts();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      console.error('Erro ao excluir produto:', err);
      setDeleteConfirmId(null);
      const errorMsg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : 'Não foi possível excluir o produto.';
      setFeedbackMessage({
        type: 'error',
        text: errorMsg,
      });
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };
  const handleScanComplete = (code: string) => {
    if (scannerTarget === 'search') {
      setSearchTerm(code);
    } else if (scannerTarget === 'create') {
      setProductToEdit(null);
      setSelectedProduct(null);
      setFormInitialBarcode(code);
      setIsFormModalOpen(true);
    } else if (scannerTarget === 'pos') {
      setPosScannedBarcode(code);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Ordenação rápida de produtos
  const sortedProducts = [...products].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    if (typeof valA === 'string' && typeof valB === 'string') {
      const comp = valA.localeCompare(valB, 'pt-BR', { sensitivity: 'base' });
      return sortDirection === 'asc' ? comp : -comp;
    }

    const numA = Number(valA) || 0;
    const numB = Number(valB) || 0;
    return sortDirection === 'asc' ? numA - numB : numB - numA;
  });

  // Lista acumulada de categorias
  const categories = availableCategories.slice().sort((a, b) => a.localeCompare(b));

  return (
    <div className="max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
      {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-md animate-fade-in ${
              feedbackMessage.type === 'success'
                ? 'bg-status-success-bg border-status-success/30 text-status-success'
                : 'bg-status-danger-bg border-status-danger/30 text-status-danger'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-text-muted hover:text-text-primary"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Hero Section & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Total SKUs & Freemium Tracker */}
          <div className="p-5 bg-card border border-border-neutral rounded-3xl shadow-xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted">Total de Produtos (SKUs)</span>
              <Package className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-text-primary font-mono">
                {totalCount}
              </span>
              <span className="text-xs text-text-muted font-medium">/ 100 no Plano Free</span>
            </div>
            {/* Freemium Progress Bar */}
            <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  totalCount >= 90
                    ? 'bg-status-danger'
                    : totalCount >= 70
                    ? 'bg-status-warning'
                    : 'bg-brand-600'
                }`}
                style={{ width: `${Math.min(100, (totalCount / 100) * 100)}%` }}
              />
            </div>
            {totalCount >= 100 && (
              <p className="text-[10px] text-status-danger font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Limite máximo do plano atingido
              </p>
            )}
          </div>

          {/* Card Critical Shelves */}
          <div
            onClick={() => setActiveTab('critical')}
            className={`p-5 bg-card border rounded-3xl shadow-xs space-y-2 cursor-pointer transition-all ${
              criticalProducts.length > 0
                ? 'border-status-warning/60 hover:bg-status-warning-bg/40'
                : 'border-border-neutral hover:border-brand-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted">Gôndolas Críticas</span>
              <div className="p-1.5 bg-status-warning-bg text-status-warning rounded-xl">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-extrabold font-mono ${
                  criticalProducts.length > 0 ? 'text-status-warning' : 'text-text-primary'
                }`}
              >
                {criticalProducts.length}
              </span>
              <span className="text-xs text-text-muted font-medium">precisam de reposição</span>
            </div>
            <p className="text-[11px] text-text-muted">
              {criticalProducts.length > 0
                ? 'Clique para visualizar produtos abaixo do estoque mínimo'
                : 'Todas as gôndolas abastecidas no momento'}
            </p>
          </div>

          {/* Card Quick Actions */}
          <div className="p-5 bg-card border border-border-neutral rounded-3xl shadow-xs flex flex-col justify-between gap-3">
            <span className="text-xs font-bold text-text-muted">Ações Rápidas</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setProductToEdit(null);
                    setFormInitialBarcode('');
                    setIsFormModalOpen(true);
                  }}
                  className="flex-1 py-2.5 px-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo SKU</span>
                </button>
                
              </div>
              <button
                onClick={() => setIsPosModalOpen(true)}
                className="py-2.5 px-3 bg-text-primary hover:bg-neutral-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Abrir PDV</span>
              </button>
            </div>
          </div>
        </div>
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border-neutral pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-text-primary text-white shadow-sm'
                  : 'bg-card text-text-muted hover:text-text-primary border border-border-neutral'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Todos os Produtos ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('critical')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'critical'
                  ? 'bg-status-warning text-white shadow-sm'
                  : 'bg-card text-text-muted hover:text-text-primary border border-border-neutral'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Gôndolas Críticas ({criticalProducts.length})</span>
            </button>
          </div>

          {/* Search, Filters & View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-full h-11 pl-9 pr-3 bg-card border border-border-neutral rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setScannerTarget('search');
                setIsScannerModalOpen(true);
              }}
              title="Escanear com a Câmera"
              className="min-w-[44px] min-h-[44px] p-2.5 bg-card hover:bg-neutral-100 border border-border-neutral rounded-xl text-text-primary transition-colors cursor-pointer flex items-center justify-center"
            >
              <Barcode className="w-5 h-5 text-brand-600" />
            </button>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-11 px-3 bg-card border border-border-neutral rounded-xl text-xs text-text-primary font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="">Todas Categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* Alternador de Visualização: Cards vs Tabela */}
            <div className="flex items-center bg-card p-1 border border-border-neutral rounded-xl h-11">
              <button
                type="button"
                onClick={() => setDisplayMode('cards')}
                className={`min-w-[36px] h-9 px-2.5 rounded-lg flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'cards'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Visualização em Cards"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('table')}
                className={`min-w-[36px] h-9 px-2.5 rounded-lg flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer ${
                  displayMode === 'table'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Visualização em Tabela Compacta"
              >
                <List className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">Tabela</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchProducts();
                fetchCriticalProducts();
              }}
              title="Atualizar Lista"
              className="min-w-[44px] min-h-[44px] p-2.5 bg-card hover:bg-neutral-100 border border-border-neutral rounded-xl text-text-muted hover:text-text-primary transition-colors cursor-pointer flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {/* Feedback visual de filtros ativos */}
        {(searchTerm || selectedCategory) && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-brand-50/70 border border-brand-200/60 rounded-2xl text-xs animate-fadeIn">
            <span className="flex items-center gap-1 text-brand-800 font-bold text-tiny uppercase tracking-wider">
              <Filter className="w-3 h-3" /> Filtros Ativos ({products.length} {products.length === 1 ? 'encontrado' : 'encontrados'}):
            </span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-card border border-border-neutral rounded-xl font-medium text-text-primary text-xs shadow-2xs">
                <span>Busca: &quot;<strong>{searchTerm}</strong>&quot;</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-0.5 hover:bg-neutral-100 rounded-md text-text-muted hover:text-text-primary cursor-pointer"
                  title="Remover filtro de busca"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-card border border-border-neutral rounded-xl font-medium text-text-primary text-xs shadow-2xs">
                <span>Categoria: <strong>{selectedCategory}</strong></span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className="p-0.5 hover:bg-neutral-100 rounded-md text-text-muted hover:text-text-primary cursor-pointer"
                  title="Remover filtro de categoria"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
              }}
              className="ml-auto text-tiny font-bold text-brand-600 hover:text-brand-800 underline cursor-pointer px-1 py-0.5"
            >
              Limpar Filtros
            </button>
          </div>
        )}

        {/* Content View: Products Table / Cards */}
        {activeTab === 'all' ? (
          isLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-500" />
              <p className="text-xs text-text-muted font-medium">Carregando catálogo de produtos...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 bg-card border border-dashed border-border-neutral rounded-3xl text-center p-8 space-y-4">
              <Package className="w-12 h-12 mx-auto text-neutral-300" />
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {searchTerm || selectedCategory
                    ? 'Nenhum produto encontrado com os filtros aplicados'
                    : 'Nenhum produto cadastrado'}
                </h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                  {searchTerm || selectedCategory
                    ? 'Tente buscar por outro termo ou limpar os filtros para visualizar os outros produtos.'
                    : 'Cadastre os produtos do seu mercado para controlar o estoque duplo (depósito e gôndola) e evitar gôndolas vazias.'}
                </p>
              </div>
              {searchTerm || selectedCategory ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                  }}
                  className="px-5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl text-xs transition-colors border border-brand-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Limpar Filtros de Busca</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setProductToEdit(null);
                    setIsFormModalOpen(true);
                  }}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Produto</span>
                </button>
              )}
            </div>
          ) : displayMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedProducts.map((product) => {
                  const isCritical = product.shelfQty <= product.shelfMinQty;
                  return (
                    <div
                      key={product.id}
                      className={`bg-card border rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-md relative overflow-hidden ${
                        isCritical
                          ? 'border-l-6 border-l-status-warning border-y-status-warning/40 border-r-status-warning/40 bg-status-warning-bg/15'
                          : 'border-border-neutral'
                      }`}
                    >
                      {/* Tarja de alerta no topo do card se estiver crítico */}
                      {isCritical && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-status-warning" />
                      )}
                      {/* Top Row: Barcode + Category + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-tiny bg-neutral-100 text-text-muted px-2 py-0.5 rounded-full font-bold">
                            {product.barcode}
                          </span>
                          <h4 className="font-bold text-text-primary text-sm mt-1 line-clamp-1">
                            {product.name}
                          </h4>
                          {product.category && (
                            <span className="text-tiny text-text-muted font-medium block mt-0.5">{product.category}</span>
                          )}
                        </div>

                        {/* Price Badge */}
                        {product.price !== undefined && product.price !== null && (
                          <span className="text-xs font-mono font-bold text-text-primary bg-canvas border border-border-neutral px-2 py-0.5 rounded-xl shrink-0">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(Number(product.price))}
                          </span>
                        )}
                      </div>

                      {/* Stock Double Badge Grid com text-tiny */}
                      <div className="grid grid-cols-2 gap-2 bg-canvas p-2.5 rounded-2xl border border-border-neutral">
                        {/* Deposito */}
                        <div className="space-y-0.5">
                          <span className="text-tiny text-text-muted font-bold block">
                            Depósito
                          </span>
                          <p className="font-mono font-bold text-text-primary text-sm">
                            {product.depotQty}{' '}
                            <span className="text-tiny font-normal text-text-muted">un</span>
                          </p>
                          {product.depotLocation && (
                            <p className="text-tiny text-text-muted truncate">{product.depotLocation}</p>
                          )}
                        </div>

                        {/* Gondola */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-tiny text-brand-800 font-bold block">Gôndola</span>
                            {isCritical && (
                              <span className="text-tiny bg-status-warning text-white font-bold px-1.5 py-0.2 rounded-full">
                                Repor
                              </span>
                            )}
                          </div>
                          <p
                            className={`font-mono font-bold text-sm ${
                              isCritical ? 'text-status-warning' : 'text-status-success'
                            }`}
                          >
                            {product.shelfQty}{' '}
                            <span className="text-tiny font-normal text-text-muted">
                              / min {product.shelfMinQty}
                            </span>
                          </p>
                          {product.shelfLocation && (
                            <p className="text-tiny text-text-muted truncate">{product.shelfLocation}</p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons com touch targets mínimos 44px */}
                      <div className="flex items-center justify-between pt-2 border-t border-border-neutral gap-2">
                        {/* Transfer Reposition Button */}
                        {/* Transfer Reposition Button com destaque para itens críticos */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsTransferModalOpen(true);
                          }}
                          disabled={product.depotQty <= 0}
                          className={`flex-1 min-h-[44px] py-2 px-3.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isCritical && product.depotQty > 0
                              ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-sm ring-2 ring-brand-500/30'
                              : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200'
                          }`}
                          title="Transferir do Depósito para Gôndola"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                          <span>{isCritical ? 'Repor Agora' : 'Repor Gôndola'}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setProductToEdit(product);
                            setIsFormModalOpen(true);
                          }}
                          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-neutral-100 border border-border-neutral rounded-xl transition-colors cursor-pointer"
                          title="Editar Informações"
                          aria-label="Editar Produto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        {deleteConfirmId === product.id ? (
                          <div className="flex items-center gap-1 min-h-[44px]">
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="min-h-[44px] px-3 bg-status-danger text-white rounded-xl font-bold text-xs"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="min-h-[44px] px-3 bg-neutral-200 text-text-primary rounded-xl font-bold text-xs"
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(product.id)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-status-danger hover:bg-status-danger-bg border border-border-neutral rounded-xl transition-colors cursor-pointer"
                            title="Excluir Produto"
                            aria-label="Excluir Produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* View em Tabela Compacta com Ordenação */
              <div className="bg-card border border-border-neutral rounded-3xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-canvas border-b border-border-neutral text-text-muted font-bold text-xs uppercase tracking-wider">
                        <th
                          onClick={() => handleSort('name')}
                          className="py-3.5 px-4 cursor-pointer hover:text-text-primary select-none"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Produto</span>
                            {sortField === 'name' ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('category')}
                          className="py-3.5 px-4 cursor-pointer hover:text-text-primary select-none hidden md:table-cell"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Categoria</span>
                            {sortField === 'category' ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('depotQty')}
                          className="py-3.5 px-4 cursor-pointer hover:text-text-primary select-none text-right"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Depósito</span>
                            {sortField === 'depotQty' ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('shelfQty')}
                          className="py-3.5 px-4 cursor-pointer hover:text-text-primary select-none text-right"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Gôndola</span>
                            {sortField === 'shelfQty' ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => handleSort('price')}
                          className="py-3.5 px-4 cursor-pointer hover:text-text-primary select-none text-right hidden sm:table-cell"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Preço</span>
                            {sortField === 'price' ? (
                              sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                            )}
                          </div>
                        </th>
                        <th className="py-3.5 px-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-neutral">
                      {sortedProducts.map((product) => {
                        const isCritical = product.shelfQty <= product.shelfMinQty;
                        return (
                          <tr
                            key={product.id}
                            className={`hover:bg-canvas/60 transition-colors ${
                              isCritical ? 'bg-status-warning-bg/25 border-l-4 border-l-status-warning' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-bold text-text-primary text-xs">{product.name}</p>
                                <p className="font-mono text-tiny text-text-muted">{product.barcode}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-text-muted text-tiny font-medium hidden md:table-cell">
                              {product.category || '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-xs text-text-primary">
                              {product.depotQty} un
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-xs">
                              <span className={isCritical ? 'text-status-warning' : 'text-status-success'}>
                                {product.shelfQty}
                              </span>
                              <span className="text-tiny text-text-muted font-normal"> / {product.shelfMinQty}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-xs text-text-primary hidden sm:table-cell">
                              {product.price !== undefined && product.price !== null
                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price))
                                : '-'}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setIsTransferModalOpen(true);
                                  }}
                                  disabled={product.depotQty <= 0}
                                  className={`min-w-[40px] min-h-[40px] px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                    isCritical && product.depotQty > 0
                                      ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-2xs'
                                      : 'bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200/80'
                                  }`}
                                  title="Repor Gôndola"
                                >
                                  <ArrowRightLeft className="w-4 h-4" />
                                  <span className="hidden xl:inline">{isCritical ? 'Repor Agora' : 'Repor'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProductToEdit(product);
                                    setIsFormModalOpen(true);
                                  }}
                                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                                  title="Editar"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-text-muted hover:text-status-danger hover:bg-status-danger-bg rounded-xl transition-colors cursor-pointer"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : (
          /* View Tab: Critical Products Dashboard */
          <div className="space-y-4">
            <div className="p-4 bg-status-warning-bg/50 border border-status-warning/40 rounded-2xl text-xs space-y-1">
              <div className="flex items-center gap-2 text-status-warning font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Painel de Reposição Prioritária (Gôndolas Críticas)</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                Estes produtos possuem quantidade na gôndola abaixo ou igual ao estoque mínimo configurado.
                Priorize o abastecimento trazendo as unidades do depósito para a área de vendas.
              </p>
            </div>

            {isCriticalLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-status-warning" />
                <p className="text-xs text-text-muted font-medium">Calculando reposição crítica...</p>
              </div>
            ) : criticalProducts.length === 0 ? (
              <div className="py-16 bg-card border border-border-neutral rounded-3xl text-center p-8 space-y-3">
                <CheckCircle className="w-12 h-12 mx-auto text-status-success" />
                <h3 className="text-base font-bold text-text-primary">
                  Nenhuma gôndola crítica no momento!
                </h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  Todos os produtos no salão de vendas estão com estoque acima do limite mínimo de segurança.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {criticalProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-card border border-status-warning/60 rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-tiny bg-status-warning-bg text-status-warning border border-status-warning/30 px-2 py-0.5 rounded-full font-bold">
                          Déficit: {product.deficit} un ({Math.round(product.deficitPercentage)}%)
                        </span>
                        <span className="text-tiny font-mono text-text-muted font-bold">{product.barcode}</span>
                      </div>
                      <h4 className="font-bold text-text-primary text-sm mt-1.5">{product.name}</h4>
                      {product.category && (
                        <span className="text-tiny text-text-muted font-medium">{product.category}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-canvas p-2.5 rounded-2xl border border-border-neutral">
                      <div>
                        <span className="text-tiny text-text-muted font-bold block">
                          Disponível no Depósito
                        </span>
                        <p className="font-mono font-bold text-sm text-text-primary">
                          {product.depotQty} un
                        </p>
                        {product.depotLocation && (
                          <p className="text-tiny text-text-muted truncate">{product.depotLocation}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-tiny text-status-warning font-bold block">
                          Gôndola Atual
                        </span>
                        <p className="font-mono font-bold text-sm text-status-warning">
                          {product.shelfQty} / min {product.shelfMinQty}
                        </p>
                        {product.shelfLocation && (
                          <p className="text-tiny text-text-muted truncate">{product.shelfLocation}</p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsTransferModalOpen(true);
                      }}
                      disabled={product.depotQty <= 0}
                      className="w-full min-h-[44px] py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>
                        {product.depotQty > 0
                          ? `Repor Gôndola Agora (${product.depotQty} un)`
                          : 'Sem saldo no depósito para repor'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      {/* Modais */}
      <ProductFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setProductToEdit(null);
          setFormInitialBarcode('');
        }}
        onSuccess={handleProductCreatedOrUpdated}
        productToEdit={productToEdit}
        initialBarcode={formInitialBarcode}
        onOpenScanner={() => {
          setScannerTarget('create');
          setIsScannerModalOpen(true);
        }}
      />

      <TransferStockModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        onSuccess={handleStockTransferred}
      />

      <PosSaleModal
        isOpen={isPosModalOpen}
        onClose={() => setIsPosModalOpen(false)}
        onSuccess={handlePosSaleSuccess}
        onOpenScanner={() => {
          setScannerTarget('pos');
          setIsScannerModalOpen(true);
        }}
        catalogProducts={products}
        scannedBarcode={posScannedBarcode}
        onBarcodeConsumed={() => setPosScannedBarcode(null)}
      />

      <BarcodeScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onScan={handleScanComplete}
      />
    </div>
  );
}
