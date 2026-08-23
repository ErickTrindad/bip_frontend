import { useState, useEffect, type SyntheticEvent } from 'react';
import {
  X,
  ArrowRight,
  Loader2,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { Product } from '../../types/product';
import { productService } from '../../services/productService';
import { ApiError } from '../../services/api';

interface TransferStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: (updatedProduct: Product) => void;
}

export function TransferStockModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: TransferStockModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (quantity <= 0) {
      setErrorMessage('A quantidade a transferir deve ser maior que zero.');
      return;
    }

    if (quantity > product.depotQty) {
      setErrorMessage(
        `Quantidade indisponível no depósito. Saldo atual: ${product.depotQty} un.`
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await productService.transferStock(product.id, { quantity });
      onSuccess(res.product);
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Erro ao realizar a transferência de estoque.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetMax = () => {
    setQuantity(product.depotQty);
  };

  const handleSetDeficit = () => {
    const deficit = Math.max(0, product.shelfMinQty - product.shelfQty);
    if (deficit > 0) {
      setQuantity(Math.min(deficit, product.depotQty));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border-neutral rounded-3xl p-6 shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-neutral mb-4">
          <div className="flex items-center gap-2.5 text-brand-600 font-bold">
            <ArrowRight className="w-5 h-5" />
            <h3 className="text-base text-text-primary font-extrabold">Reposição Rápida de Gôndola</h3>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Product preview */}
        <div className="p-4 bg-canvas border border-border-neutral rounded-2xl mb-4 space-y-1.5">
          <span className="text-xs font-mono bg-neutral-200/70 text-text-muted px-2.5 py-0.5 rounded-full font-bold">
            {product.barcode}
          </span>
          <h4 className="font-extrabold text-text-primary text-base line-clamp-1">{product.name}</h4>
          {product.category && (
            <p className="text-xs text-text-muted font-medium">{product.category}</p>
          )}
        </div>

        {/* Stock Flow Diagram */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3.5 bg-neutral-100 border border-border-neutral rounded-2xl text-center space-y-1">
            <span className="text-xs text-text-muted font-semibold flex items-center justify-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> Depósito Atual
            </span>
            <p className="text-xl font-mono font-black text-text-primary">
              {product.depotQty}{' '}
              <span className="text-xs font-normal text-text-muted">un</span>
            </p>
            {product.depotLocation && (
              <p className="text-xs text-text-muted truncate">{product.depotLocation}</p>
            )}
          </div>

          <div className="p-3.5 bg-brand-50 border border-brand-100 rounded-2xl text-center space-y-1">
            <span className="text-xs text-brand-800 font-semibold flex items-center justify-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Gôndola Atual
            </span>
            <p className="text-xl font-mono font-black text-brand-600">
              {product.shelfQty}{' '}
              <span className="text-xs font-normal text-text-muted">/ min {product.shelfMinQty}</span>
            </p>
            {product.shelfLocation && (
              <p className="text-xs text-brand-700 truncate">{product.shelfLocation}</p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-status-danger-bg border border-status-danger/30 rounded-xl text-status-danger text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-text-primary">
                Quantidade a Transferir (Depósito &rarr; Gôndola)
              </label>
              {product.depotQty > 0 && (
                <div className="flex gap-2">
                  {product.shelfMinQty > product.shelfQty && (
                    <button
                      type="button"
                      onClick={handleSetDeficit}
                      className="text-xs text-brand-600 hover:underline font-bold"
                    >
                      Completar Mínimo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-xs text-text-muted hover:text-text-primary font-bold"
                  >
                    Tudo ({product.depotQty})
                  </button>
                </div>
              )}
            </div>

            <input
              type="number"
              min="1"
              max={product.depotQty}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full h-12 px-4 bg-canvas border border-border-neutral rounded-xl text-text-primary text-base font-mono font-bold focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Forecast preview */}
          {quantity > 0 && (
            <div className="p-3 bg-canvas border border-border-neutral rounded-xl text-[11px] space-y-1 text-text-muted">
              <div className="flex justify-between font-medium">
                <span>Depósito após reposição:</span>
                <span className="font-mono font-bold text-text-primary">
                  {Math.max(0, product.depotQty - quantity)} un
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Gôndola após reposição:</span>
                <span className="font-mono font-bold text-status-success">
                  {product.shelfQty + quantity} un
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 bg-canvas hover:bg-neutral-100 border border-border-neutral text-text-primary font-bold rounded-xl transition-colors cursor-pointer text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || product.depotQty <= 0}
              className="min-h-[44px] px-6 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Confirmar Reposição</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
