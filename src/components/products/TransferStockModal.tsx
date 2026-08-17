import { useState, type FormEvent } from 'react';
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

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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
          <div className="flex items-center gap-2 text-brand-600 font-bold">
            <ArrowRight className="w-5 h-5" />
            <h3 className="text-base text-text-primary font-bold">Reposição Rápida de Gôndola</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product preview */}
        <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl mb-4 space-y-1">
          <span className="text-[10px] font-mono bg-neutral-200/70 text-text-muted px-2 py-0.5 rounded-full font-bold">
            {product.barcode}
          </span>
          <h4 className="font-bold text-text-primary text-sm line-clamp-1">{product.name}</h4>
          {product.category && (
            <p className="text-xs text-text-muted">{product.category}</p>
          )}
        </div>

        {/* Stock Flow Diagram */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-3 bg-neutral-100 border border-border-neutral rounded-xl text-center space-y-1">
            <span className="text-[11px] text-text-muted font-medium flex items-center justify-center gap-1">
              <Package className="w-3 h-3" /> Depósito Atual
            </span>
            <p className="text-lg font-mono font-extrabold text-text-primary">
              {product.depotQty}{' '}
              <span className="text-xs font-normal text-text-muted">un</span>
            </p>
            {product.depotLocation && (
              <p className="text-[10px] text-text-muted truncate">{product.depotLocation}</p>
            )}
          </div>

          <div className="p-3 bg-brand-50 border border-brand-100 rounded-xl text-center space-y-1">
            <span className="text-[11px] text-brand-800 font-medium flex items-center justify-center gap-1">
              <Layers className="w-3 h-3" /> Gôndola Atual
            </span>
            <p className="text-lg font-mono font-extrabold text-brand-600">
              {product.shelfQty}{' '}
              <span className="text-xs font-normal text-text-muted">/ min {product.shelfMinQty}</span>
            </p>
            {product.shelfLocation && (
              <p className="text-[10px] text-brand-700 truncate">{product.shelfLocation}</p>
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-text-muted">
                Quantidade a Transferir do Depósito para a Gôndola
              </label>
              {product.depotQty > 0 && (
                <div className="flex gap-1.5">
                  {product.shelfMinQty > product.shelfQty && (
                    <button
                      type="button"
                      onClick={handleSetDeficit}
                      className="text-[10px] text-brand-600 hover:underline font-bold"
                    >
                      Completar Mínimo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-[10px] text-text-muted hover:text-text-primary font-bold"
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
              required
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2.5 bg-canvas border border-border-neutral rounded-xl text-text-primary text-sm font-mono font-bold text-center focus:outline-none focus:border-brand-500"
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
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-card hover:bg-neutral-100 border border-border-neutral text-text-primary font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || product.depotQty <= 0}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Transferir para Gôndola</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
