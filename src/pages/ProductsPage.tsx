import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Store,
  LogOut,
  TrendingDown,
  Wifi,
  WifiOff,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { productService } from '../services/productService';
import { ApiError } from '../services/api';
import type { Product, CriticalProduct } from '../types/product';
import { ProductFormModal } from '../components/products/ProductFormModal';
import { TransferStockModal } from '../components/products/TransferStockModal';
import { PosSaleModal } from '../components/products/PosSaleModal';
import { BarcodeScannerModal } from '../components/products/BarcodeScannerModal';
import { db } from '../lib/db';

type ViewTab = 'all' | 'critical';

export function ProductsPage() {
  const { user, tenant, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [criticalProducts, setCriticalProducts] = useState<CriticalProduct[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCriticalLoading, setIsCriticalLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Modals state
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

  // Auth Guard
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch products
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
  // Lista acumulada de categorias
  const categories = availableCategories.slice().sort((a, b) => a.localeCompare(b));

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border-neutral px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-brand-600 tracking-tight text-base sm:text-lg">
                GO PME
              </span>
              <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {tenant?.category || 'Loja'}
              </span>
            </div>
            <p className="text-xs text-text-muted hidden sm:block truncate max-w-xs">
              {tenant?.name || 'Minha Loja'}
            </p>
          </div>
        </div>
        {/* Right Header Status / User Info */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs">
          {/* Online/Offline Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isOnline
                ? 'bg-status-success-bg text-status-success border-status-success/30'
                : 'bg-status-warning-bg text-status-warning border-status-warning/40'
            }`}
            title={isOnline ? 'Online (Supabase Conectado)' : 'Offline (Modo Local Dexie)'}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* User profile info */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="font-bold text-text-primary">{user?.name}</span>
            <span className="text-[10px] text-text-muted">{user?.email}</span>
          </div>

          <button
            onClick={logout}
            className="p-2 bg-canvas hover:bg-neutral-100 text-text-muted hover:text-text-primary border border-border-neutral rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline font-bold text-xs">Sair</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
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

          {/* Search and Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-full pl-9 pr-3 py-2 bg-card border border-border-neutral rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              onClick={() => {
                setScannerTarget('search');
                setIsScannerModalOpen(true);
              }}
              title="Escanear com a Câmera"
              className="p-2 bg-card hover:bg-neutral-100 border border-border-neutral rounded-xl text-text-primary transition-colors cursor-pointer"
            >
              <Barcode className="w-4 h-4 text-brand-600" />
            </button>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-card border border-border-neutral rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="">Todas Categorias</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                fetchProducts();
                fetchCriticalProducts();
              }}
              title="Atualizar Lista"
              className="p-2 bg-card hover:bg-neutral-100 border border-border-neutral rounded-xl text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content View: Products Table / Cards */}
        {activeTab === 'all' ? (
          <div>
            {isLoading ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-brand-500" />
                <p className="text-xs text-text-muted font-medium">Carregando catálogo de produtos...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 bg-card border border-dashed border-border-neutral rounded-3xl text-center p-8 space-y-4">
                <Package className="w-12 h-12 mx-auto text-neutral-300" />
                <div>
                  <h3 className="text-base font-bold text-text-primary">Nenhum produto cadastrado</h3>
                  <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                    Cadastre os produtos do seu mercado para controlar o estoque duplo (depósito e gôndola) e evitar gôndolas vazias.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setProductToEdit(null);
                    setIsFormModalOpen(true);
                  }}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Produto</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => {
                  const isCritical = product.shelfQty <= product.shelfMinQty;
                  return (
                    <div
                      key={product.id}
                      className={`bg-card border rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                        isCritical ? 'border-status-warning/60 bg-status-warning-bg/10' : 'border-border-neutral'
                      }`}
                    >
                      {/* Top Row: Barcode + Category + Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] bg-neutral-100 text-text-muted px-2 py-0.5 rounded-full font-bold">
                            {product.barcode}
                          </span>
                          <h4 className="font-bold text-text-primary text-sm mt-1 line-clamp-1">
                            {product.name}
                          </h4>
                          {product.category && (
                            <span className="text-[11px] text-text-muted">{product.category}</span>
                          )}
                        </div>

                        {/* Price Badge */}
                        {product.price !== undefined && product.price !== null && (
                          <span className="text-xs font-mono font-extrabold text-text-primary bg-canvas border border-border-neutral px-2 py-1 rounded-xl shrink-0">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(Number(product.price))}
                          </span>
                        )}
                      </div>

                      {/* Stock Double Badge Grid */}
                      <div className="grid grid-cols-2 gap-2 bg-canvas p-3 rounded-2xl border border-border-neutral text-xs">
                        {/* Deposito */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-text-muted font-bold block">
                            Depósito
                          </span>
                          <p className="font-mono font-bold text-text-primary">
                            {product.depotQty}{' '}
                            <span className="text-[10px] font-normal text-text-muted">un</span>
                          </p>
                          {product.depotLocation && (
                            <p className="text-[10px] text-text-muted truncate">{product.depotLocation}</p>
                          )}
                        </div>

                        {/* Gondola */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-brand-800 font-bold block">Gôndola</span>
                            {isCritical && (
                              <span className="text-[9px] bg-status-warning text-white font-extrabold px-1.5 py-0.2 rounded-full">
                                Crítico
                              </span>
                            )}
                          </div>
                          <p
                            className={`font-mono font-bold ${
                              isCritical ? 'text-status-warning' : 'text-status-success'
                            }`}
                          >
                            {product.shelfQty}{' '}
                            <span className="text-[10px] font-normal text-text-muted">
                              / min {product.shelfMinQty}
                            </span>
                          </p>
                          {product.shelfLocation && (
                            <p className="text-[10px] text-text-muted truncate">{product.shelfLocation}</p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-border-neutral gap-2">
                        {/* Transfer Reposition Button */}
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setIsTransferModalOpen(true);
                          }}
                          disabled={product.depotQty <= 0}
                          className="flex-1 py-2 px-3 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-100 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Transferir do Depósito para Gôndola"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Repor Gôndola</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setProductToEdit(product);
                            setIsFormModalOpen(true);
                          }}
                          className="p-2 text-text-muted hover:text-text-primary hover:bg-neutral-100 border border-border-neutral rounded-xl transition-colors cursor-pointer"
                          title="Editar Informações"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        {deleteConfirmId === product.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="px-2 py-1 bg-status-danger text-white rounded-lg font-bold text-[10px]"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-neutral-200 text-text-primary rounded-lg font-bold text-[10px]"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(product.id)}
                            className="p-2 text-text-muted hover:text-status-danger hover:bg-neutral-100 border border-border-neutral rounded-xl transition-colors cursor-pointer"
                            title="Excluir Produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                        <span className="font-mono text-[10px] bg-status-warning-bg text-status-warning border border-status-warning/30 px-2 py-0.5 rounded-full font-extrabold">
                          Déficit: {product.deficit} un ({Math.round(product.deficitPercentage)}%)
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">{product.barcode}</span>
                      </div>
                      <h4 className="font-bold text-text-primary text-sm mt-2">{product.name}</h4>
                      {product.category && (
                        <span className="text-[11px] text-text-muted">{product.category}</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-canvas p-3 rounded-2xl border border-border-neutral text-xs">
                      <div>
                        <span className="text-[10px] text-text-muted font-bold block">
                          Disponível no Depósito
                        </span>
                        <p className="font-mono font-extrabold text-text-primary">
                          {product.depotQty} un
                        </p>
                        {product.depotLocation && (
                          <p className="text-[10px] text-text-muted truncate">{product.depotLocation}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-status-warning font-bold block">
                          Gôndola Atual
                        </span>
                        <p className="font-mono font-extrabold text-status-warning">
                          {product.shelfQty} / min {product.shelfMinQty}
                        </p>
                        {product.shelfLocation && (
                          <p className="text-[10px] text-text-muted truncate">{product.shelfLocation}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsTransferModalOpen(true);
                      }}
                      disabled={product.depotQty <= 0}
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>
                        {product.depotQty > 0
                          ? `Repor Gôndola Agora (${product.depotQty} disponíveis)`
                          : 'Sem saldo no depósito para repor'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
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
