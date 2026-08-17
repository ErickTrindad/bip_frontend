import { useState, useEffect, type FormEvent } from 'react';
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  Barcode,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react';
import type { Product, PosSaleItem, PaymentMethod, PosSaleResponse } from '../../types/product';
import { productService } from '../../services/productService';
import { ApiError } from '../../services/api';

interface PosSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (response: PosSaleResponse) => void;
  onOpenScanner: () => void;
  catalogProducts: Product[];
  scannedBarcode?: string | null;
  onBarcodeConsumed?: () => void;
}
export function PosSaleModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenScanner,
  catalogProducts,
  scannedBarcode,
  onBarcodeConsumed,
}: PosSaleModalProps) {
  const [items, setItems] = useState<PosSaleItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [quantityInput, setQuantityInput] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && scannedBarcode) {
      handleAddItemByBarcode(scannedBarcode, 1);
      if (onBarcodeConsumed) {
        onBarcodeConsumed();
      }
    }
  }, [isOpen, scannedBarcode, onBarcodeConsumed]);

  const [successResult, setSuccessResult] = useState<PosSaleResponse | null>(null);

  const handleAddItemByBarcode = (code: string, qty: number = 1) => {
    setErrorMessage(null);
    const trimmed = code.trim();
    if (!trimmed) return;

    // Buscar no catálogo em memória ou buscar depois
    const found = catalogProducts.find((p) => p.barcode === trimmed);
    const existingIndex = items.findIndex((item) => item.barcode === trimmed);

    const price = found?.price ? Number(found.price) : 0;
    const name = found ? found.name : `Produto (${trimmed})`;

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += qty;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          barcode: trimmed,
          quantity: qty,
          unitPrice: price,
          name,
        },
      ]);
    }
    setBarcodeInput('');
    setQuantityInput(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...items];
    updated[index].quantity = newQty;
    setItems(updated);
  };

  const handleUpdatePrice = (index: number, newPrice: number) => {
    const updated = [...items];
    updated[index].unitPrice = Math.max(0, newPrice);
    setItems(updated);
  };

  const totalAmount = items.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0
  );
  const totalItemsCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const handleSubmitSale = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Adicione pelo menos um item à cesta para finalizar a venda.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        items: items.map((i) => ({
          barcode: i.barcode,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        paymentMethod,
      };
      const res = await productService.registerPosSale(payload);
      setSuccessResult(res);
      onSuccess(res);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao registrar a venda.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setItems([]);
    setSuccessResult(null);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="w-full max-w-xl bg-card border border-border-neutral rounded-3xl p-5 sm:p-7 shadow-2xl relative my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-neutral mb-4 shrink-0">
          <div className="flex items-center gap-2 text-brand-600 font-bold">
            <ShoppingCart className="w-5 h-5" />
            <h3 className="text-base sm:text-lg text-text-primary font-bold">
              PDV Frente de Caixa (Baixa de Gôndola)
            </h3>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success View */}
        {successResult ? (
          <div className="py-6 flex flex-col items-center justify-center text-center space-y-4 text-xs">
            <div className="w-14 h-14 bg-status-success-bg text-status-success rounded-full flex items-center justify-center border border-status-success/30 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-text-primary">Venda Finalizada com Sucesso!</h4>
              <p className="text-text-muted mt-1">
                A baixa no estoque de gôndola foi processada automaticamente.
              </p>
            </div>

            <div className="w-full bg-canvas border border-border-neutral rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Total de Itens:</span>
                <span className="font-bold">{successResult.totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Valor Total:</span>
                <span className="font-bold text-status-success text-sm">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    successResult.totalAmount
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Forma de Pagamento:</span>
                <span className="font-bold">{successResult.paymentMethod}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors cursor-pointer text-sm shadow-md"
            >
              Concluir e Voltar aos Produtos
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitSale} className="overflow-y-auto space-y-4 flex-1 text-xs">
            {errorMessage && (
              <div className="p-3 bg-status-danger-bg border border-status-danger/30 rounded-xl text-status-danger text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick barcode add input */}
            <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl space-y-2">
              <label className="text-[11px] font-bold text-text-muted">
                Bipar Código de Barras ou Selecionar do Catálogo
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItemByBarcode(barcodeInput, quantityInput);
                      }
                    }}
                    placeholder="Bipar ou digitar código de barras..."
                    className="w-full px-3 py-2 bg-card border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500 font-mono"
                  />
                </div>
                <input
                  type="number"
                  min="1"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-2 bg-card border border-border-neutral rounded-xl text-text-primary text-xs text-center font-mono font-bold"
                  title="Quantidade"
                />
                <button
                  type="button"
                  onClick={() => handleAddItemByBarcode(barcodeInput, quantityInput)}
                  className="px-3 py-2 bg-brand-50 hover:bg-brand-100 text-brand-600 border border-brand-100 rounded-xl font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenScanner}
                  title="Abrir Câmera para Escanear"
                  className="p-2 bg-canvas hover:bg-neutral-100 border border-border-neutral text-text-primary rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <Barcode className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Items table / list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
                <span>Cesta de Produtos ({items.length})</span>
                <span>Subtotal</span>
              </div>

              {items.length === 0 ? (
                <div className="p-6 border border-dashed border-border-neutral rounded-2xl text-center text-text-muted space-y-1">
                  <ShoppingCart className="w-8 h-8 mx-auto text-neutral-300" />
                  <p className="font-semibold text-xs text-text-primary">A cesta de compras está vazia</p>
                  <p className="text-[11px]">Bipe o código de barras do produto para iniciar a venda.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.barcode}-${idx}`}
                      className="p-3 bg-canvas border border-border-neutral rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary truncate">{item.name}</p>
                        <p className="text-[10px] font-mono text-text-muted">{item.barcode}</p>
                      </div>

                      {/* Qty and Price */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-border-neutral rounded-lg bg-card overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                            className="px-2 py-1 hover:bg-neutral-100 text-text-muted font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                            className="px-2 py-1 hover:bg-neutral-100 text-text-muted font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        <div className="w-20">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-card border border-border-neutral rounded-lg text-text-primary text-xs font-mono text-right"
                            title="Preço Unitário"
                          />
                        </div>

                        <span className="w-16 font-mono font-bold text-right text-text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(item.quantity * item.unitPrice)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-text-muted hover:text-status-danger hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method selection */}
            <div className="space-y-2 pt-2 border-t border-border-neutral">
              <label className="text-[11px] font-bold text-text-muted">Forma de Pagamento</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'PIX', label: 'PIX', icon: QrCode },
                  { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                  { id: 'CARTAO_DEBITO', label: 'Débito', icon: CreditCard },
                  { id: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard },
                ].map((pm) => {
                  const Icon = pm.icon;
                  const isSelected = paymentMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-canvas hover:bg-neutral-100 border-border-neutral text-text-primary'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total summary & Submit */}
            <div className="pt-4 border-t border-border-neutral space-y-3">
              <div className="p-3 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-brand-800 font-medium">Total a Pagar</span>
                  <p className="text-xs text-text-muted">{totalItemsCount} item(s) selecionado(s)</p>
                </div>
                <p className="text-xl font-extrabold text-brand-600 font-mono">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalAmount
                  )}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 bg-card hover:bg-neutral-100 border border-border-neutral text-text-primary font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || items.length === 0}
                  className="px-6 py-2.5 bg-status-success hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Finalizar Venda & Baixar Gôndola</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
