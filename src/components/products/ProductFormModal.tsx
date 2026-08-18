import { useState, useEffect, type FormEvent } from 'react';
import {
  X,
  Sparkles,
  Save,
  Loader2,
  Package,
  Layers,
  AlertTriangle,
  Info,
  Camera,
} from 'lucide-react';
import type { Product, CreateProductPayload, UpdateProductPayload } from '../../types/product';
import { productService } from '../../services/productService';
import { ApiError } from '../../services/api';
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: Product) => void;
  productToEdit?: Product | null;
  initialBarcode?: string;
  onOpenScanner?: () => void;
}

const COMMON_CATEGORIES = [
  'Bebidas',
  'Laticínios',
  'Mercearia',
  'Padaria',
  'Hortifrúti',
  'Carnes & Frios',
  'Higiene & Limpeza',
  'Doces & Snacks',
  'Congelados',
  'Outros',
];

export function ProductFormModal({
  isOpen,
  onClose,
  onSuccess,
  productToEdit,
  initialBarcode,
  onOpenScanner,
}: ProductFormModalProps) {
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [depotQty, setDepotQty] = useState<number>(0);
  const [depotLocation, setDepotLocation] = useState('');
  const [shelfQty, setShelfQty] = useState<number>(0);
  const [shelfLocation, setShelfLocation] = useState('');
  const [shelfMinQty, setShelfMinQty] = useState<number>(0);
  const [price, setPrice] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [freemiumWarning, setFreemiumWarning] = useState<string | null>(null);

  useEffect(() => {
    if (productToEdit) {
      setBarcode(productToEdit.barcode || '');
      setName(productToEdit.name || '');
      setCategory(productToEdit.category || '');
      setDepotQty(productToEdit.depotQty || 0);
      setDepotLocation(productToEdit.depotLocation || '');
      setShelfQty(productToEdit.shelfQty || 0);
      setShelfLocation(productToEdit.shelfLocation || '');
      setShelfMinQty(productToEdit.shelfMinQty || 0);
      setPrice(productToEdit.price !== undefined && productToEdit.price !== null ? String(productToEdit.price) : '');
    } else {
      setBarcode(initialBarcode || '');
      setName('');
      setCategory('');
      setDepotQty(0);
      setDepotLocation('');
      setShelfQty(0);
      setShelfLocation('');
      setShelfMinQty(0);
      setPrice('');
    }
    setLookupMessage(null);
    setErrorMessage(null);
    setFreemiumWarning(null);
  }, [productToEdit, initialBarcode, isOpen]);

  const handleLookupOpenFoodFacts = async () => {
    if (!barcode.trim()) {
      setErrorMessage('Informe o código de barras para consultar o Open Food Facts');
      return;
    }
    setIsLookingUp(true);
    setLookupMessage(null);
    setErrorMessage(null);

    try {
      const response = await productService.lookupOpenFoodFacts(barcode.trim());
      if (response.product && response.product.name) {
        setName(response.product.name);
        if (response.product.category && !category) {
          setCategory(response.product.category);
        }
        setLookupMessage(`Encontrado: ${response.product.name} ${response.product.brands ? `(${response.product.brands})` : ''}`);
      } else {
        setLookupMessage('Produto não localizado na base Open Food Facts. Preencha manualmente.');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao consultar Open Food Facts');
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFreemiumWarning(null);

    if (!barcode.trim() || !name.trim()) {
      setErrorMessage('Código de barras e nome são campos obrigatórios.');
      return;
    }

    const parsedPrice = price.trim() === '' ? null : parseFloat(price.replace(',', '.'));
    if (parsedPrice !== null && (isNaN(parsedPrice) || parsedPrice < 0)) {
      setErrorMessage('Preço unitário inválido.');
      return;
    }

    setIsLoading(true);
    try {
      if (productToEdit) {
        const payload: UpdateProductPayload = {
          barcode: barcode.trim(),
          name: name.trim(),
          category: category.trim() || null,
          depotQty: Number(depotQty) || 0,
          depotLocation: depotLocation.trim() || null,
          shelfQty: Number(shelfQty) || 0,
          shelfLocation: shelfLocation.trim() || null,
          shelfMinQty: Number(shelfMinQty) || 0,
          price: parsedPrice,
        };
        const res = await productService.update(productToEdit.id, payload);
        onSuccess(res.product);
        onClose();
      } else {
        const payload: CreateProductPayload = {
          barcode: barcode.trim(),
          name: name.trim(),
          category: category.trim() || null,
          depotQty: Number(depotQty) || 0,
          depotLocation: depotLocation.trim() || null,
          shelfQty: Number(shelfQty) || 0,
          shelfLocation: shelfLocation.trim() || null,
          shelfMinQty: Number(shelfMinQty) || 0,
          price: parsedPrice,
        };
        const res = await productService.create(payload);
        onSuccess(res.product);
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 403) {
          setFreemiumWarning(err.message);
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('Ocorreu um erro ao salvar o produto.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl bg-card border border-border-neutral rounded-3xl p-5 sm:p-8 shadow-2xl relative my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-neutral mb-5 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {productToEdit ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Controle duplo: estoque em Depósito e Gôndola física
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 space-y-5 flex-1 text-xs">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-status-danger-bg border border-status-danger/30 rounded-xl text-status-danger text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {freemiumWarning && (
            <div className="p-4 bg-status-warning-bg border border-status-warning/40 rounded-2xl text-text-primary text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-status-warning font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Trava do Plano Freemium (100 SKUs)</span>
              </div>
              <p className="text-text-muted leading-relaxed">{freemiumWarning}</p>
            </div>
          )}

          {lookupMessage && (
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-brand-700 text-xs flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 shrink-0 text-brand-500" />
              <span>{lookupMessage}</span>
            </div>
          )}

          {/* Section 1: Informações Básicas */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Identificação do Produto
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Código de barras + Autopreenchimento Open Food Facts */}
              <div className="sm:col-span-8 space-y-1">
                <label className="text-[11px] font-bold text-text-muted">
                  Código de Barras (EAN/GTIN) <span className="text-status-danger">*</span>
                </label>
                <div className="flex gap-1.5 sm:gap-2">
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Ex: 7891000100103"
                    className="flex-1 min-w-0 px-3 py-2 bg-canvas border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500 font-mono"
                  />
                  {onOpenScanner && (
                    <button
                      type="button"
                      onClick={onOpenScanner}
                      title="Escanear com a Câmera"
                      className="px-3 py-2 bg-neutral-100 hover:bg-neutral-200 border border-border-neutral text-text-primary rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5 text-brand-600" />
                      <span className="hidden sm:inline text-xs">Escanear</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLookupOpenFoodFacts}
                    disabled={isLookingUp || !barcode}
                    title="Consultar catálogo Open Food Facts"
                    className="px-3 py-2 bg-brand-50 hover:bg-brand-100 border border-brand-100 text-brand-600 rounded-xl font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isLookingUp ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline text-xs">Autopreencher</span>
                  </button>
                </div>
              </div>
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-text-muted">
                  Preço de Venda
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs font-bold font-mono pointer-events-none">
                    R$
                  </span>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-9 pr-3 py-2 bg-canvas border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              {/* Nome */}
              <div className="sm:col-span-8 space-y-1">
                <label className="text-[11px] font-bold text-text-muted">
                  Nome / Descrição <span className="text-status-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Leite Condensado Moça 395g"
                  className="w-full px-3 py-2 bg-canvas border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Categoria */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[11px] font-bold text-text-muted">Categoria</label>
                <input
                  type="text"
                  list="categories-list"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Laticínios"
                  className="w-full px-3 py-2 bg-canvas border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500"
                />
                <datalist id="categories-list">
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 2: Estoques Duplos (Depósito vs Gôndola) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Gestão de Estoque Duplo
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Depósito */}
              <div className="p-4 bg-canvas border border-border-neutral rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-border-neutral">
                  <span className="font-bold text-text-primary">Depósito / Estoque Fundo</span>
                  <span className="text-[10px] text-text-muted font-medium bg-neutral-200/60 px-2 py-0.5 rounded-full">
                    Reserva
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted">
                    Quantidade em Depósito
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={depotQty}
                    onChange={(e) => setDepotQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-card border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted">
                    Localização no Depósito
                  </label>
                  <input
                    type="text"
                    value={depotLocation}
                    onChange={(e) => setDepotLocation(e.target.value)}
                    placeholder="Ex: Corredor B, Prateleira 3"
                    className="w-full px-3 py-2 bg-card border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {/* Card Gôndola */}
              <div className="p-4 bg-brand-50/40 border border-brand-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-brand-100">
                  <span className="font-bold text-brand-900">Gôndola / Área de Venda</span>
                  <span className="text-[10px] text-brand-700 font-bold bg-brand-100 px-2 py-0.5 rounded-full">
                    Frente de Loja
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted">
                      Qtd Atual Gôndola
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={shelfQty}
                      onChange={(e) => setShelfQty(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-card border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-status-warning">
                      Qtd Mínima (Alerta)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={shelfMinQty}
                      onChange={(e) => setShelfMinQty(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-card border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted">
                    Localização na Gôndola
                  </label>
                  <input
                    type="text"
                    value={shelfLocation}
                    onChange={(e) => setShelfLocation(e.target.value)}
                    placeholder="Ex: Gôndola 4, Nível 2"
                    className="w-full px-3 py-2 bg-card border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-canvas border border-border-neutral rounded-xl text-[11px] text-text-muted flex items-start gap-2">
            <Info className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
            <span>
              O sistema sinalizará reposição prioritária quando a quantidade na gôndola for menor ou igual à quantidade mínima configurada.
            </span>
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-border-neutral flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-card hover:bg-neutral-100 border border-border-neutral text-text-primary font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{productToEdit ? 'Atualizar Produto' : 'Salvar Produto'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
