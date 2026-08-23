import {
  Package,
  ArrowRight,
  TrendingUp,
  Tag,
  Store,
  Layers,
  CheckCircle2,
  AlertCircle,
  Layers3,
} from 'lucide-react';
import type { VoiceCommandResponse } from '../../types/ai';

interface ActionPreviewCardProps {
  voiceResult: VoiceCommandResponse;
  onApply: () => void;
  isApplying?: boolean;
}

export function ActionPreviewCard({ voiceResult, onApply, isApplying }: ActionPreviewCardProps) {
  const { intent, extractedData, actions, matchedProduct, explanation, executed, executionResult } =
    voiceResult;

  const totalProductsCount = actions && actions.length > 0 ? actions.length : 1;

  // Se houver múltiplos produtos identificados (ex: Guaraná Antarctica Zero E Guaraná Antarctica 2L)
  const isMultiProduct = totalProductsCount > 1;

  // Calcula Previsão de Estoque e Preço Pré vs Pós do produto principal ou primeiro produto
  const currentDepot = matchedProduct ? matchedProduct.depotQty : 0;
  const currentShelf = matchedProduct ? matchedProduct.shelfQty : 0;
  const currentPrice = matchedProduct?.price != null ? Number(matchedProduct.price) : null;

  let newDepot = currentDepot;
  let newShelf = currentShelf;
  let newPrice = currentPrice;

  const actionList =
    actions && actions.length > 0
      ? actions
      : [
          {
            action: intent,
            price: extractedData.newPrice ?? extractedData.price,
            quantity: extractedData.quantity,
            from: extractedData.from,
            to: extractedData.to,
            destination: extractedData.destination,
            productQuery: extractedData.productQuery,
          },
        ];

  actionList.forEach((act) => {
    if (act.action === 'UPDATE_PRODUCT' && act.price != null) {
      newPrice = Number(act.price);
    }
    if (act.action === 'STOCK_ENTRY' && act.quantity != null) {
      const dest = act.destination || 'depot';
      if (dest === 'depot') newDepot += Number(act.quantity);
      else newShelf += Number(act.quantity);
    }
    if (act.action === 'TRANSFER_STOCK' && act.quantity != null) {
      const qty = Number(act.quantity);
      if (act.from === 'shelf' && act.to === 'depot') {
        newShelf = Math.max(0, newShelf - qty);
        newDepot += qty;
      } else {
        newDepot = Math.max(0, newDepot - qty);
        newShelf += qty;
      }
    }
    if (act.action === 'POS_SALE' && act.quantity != null) {
      newShelf = Math.max(0, newShelf - Number(act.quantity));
    }
  });

  const hasPriceChange = currentPrice !== null && newPrice !== null && currentPrice !== newPrice;
  const hasDepotChange = currentDepot !== newDepot;
  const hasShelfChange = currentShelf !== newShelf;
  const hasAnyChange = hasPriceChange || hasDepotChange || hasShelfChange;

  return (
    <div className="flex flex-col gap-4 bg-card border border-border-neutral rounded-3xl p-5 md:p-6 shadow-sm">
      {/* Cabeçalho do Card com Contador Superior */}
      <div className="flex items-start justify-between gap-3 border-b border-border-neutral/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100">
            {isMultiProduct ? <Layers3 className="w-5 h-5" /> : <Package className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {isMultiProduct ? 'Múltiplos Produtos Identificados' : 'Produto Identificado'}
            </span>
            <h4 className="text-base font-extrabold text-text-primary">
              {isMultiProduct
                ? `${totalProductsCount} Produtos na sua fala`
                : matchedProduct
                ? matchedProduct.name
                : extractedData.productQuery || 'Produto'}
            </h4>
            {!isMultiProduct && matchedProduct && (
              <span className="text-[11px] text-text-muted font-mono">
                Cód: {matchedProduct.barcode}
              </span>
            )}
          </div>
        </div>

        {/* Status / Contador Badge */}
        {executed ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" /> Aplicado ({totalProductsCount})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 border border-brand-200 text-brand-700">
            <AlertCircle className="w-4 h-4 text-brand-600" />
            <span>{totalProductsCount} {totalProductsCount === 1 ? 'produto' : 'produtos'}</span>
          </span>
        )}
      </div>

      {/* Resumo da Fala */}
      <div className="bg-canvas border border-border-neutral/70 rounded-2xl p-3.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
          O que você disse:
        </span>
        <p className="text-xs font-medium text-text-primary italic">
          &quot;{voiceResult.transcription}&quot;
        </p>
      </div>

      {/* Explicação do Assistente em Linguagem Simples */}
      <div className="bg-brand-50/40 border border-brand-100 rounded-2xl p-4">
        <div className="flex items-start gap-2.5">
          <TrendingUp className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <div className="text-xs text-text-primary leading-relaxed font-medium">
            {explanation}
          </div>
        </div>
      </div>

      {/* Lista Visual dos Produtos e Ações Identificadas */}
      {isMultiProduct ? (
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-bold text-text-primary">
            Produtos identificados na sua fala ({actions?.length}):
          </span>

          <div className="space-y-2">
            {actions?.map((act, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary">
                      {act.productQuery || `Produto ${idx + 1}`}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {act.action === 'STOCK_ENTRY' && `Entrada de ${act.quantity || (act.depotQty || 0) + (act.shelfQty || 0)} un`}
                      {act.action === 'REGISTER_PRODUCT' && `Novo Cadastro (${act.quantity || (act.depotQty || 0) + (act.shelfQty || 0)} un)`}
                      {act.action === 'TRANSFER_STOCK' && `Transferir ${act.quantity} un (${act.from === 'shelf' ? 'Gôndola → Depósito' : 'Depósito → Gôndola'})`}
                      {act.action === 'UPDATE_PRODUCT' && `Alterar Preço para R$ ${act.price?.toFixed(2)}`}
                      {act.action === 'POS_SALE' && `Venda de ${act.quantity} un`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onApply}
                  className="px-3 py-1.5 bg-card hover:bg-brand-50 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Ver / Editar
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Quando for apenas 1 produto: Mostra o comparativo Antes x Depois direto */
        hasAnyChange && (
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <span>O que será alterado no sistema (Antes &rarr; Depois):</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {hasPriceChange && (
                <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-violet-600" /> Preço de Venda
                    </span>
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                      Novo Preço
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Preço Atual</span>
                      <span className="text-xs font-bold text-neutral-500 line-through">
                        {currentPrice != null ? `R$ ${currentPrice.toFixed(2)}` : 'Sem Preço'}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-brand-600" />

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted font-bold">Novo Preço</span>
                      <span className="text-sm font-extrabold text-brand-600">
                        R$ {newPrice?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {hasDepotChange && (
                <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-blue-600" /> Saldo no Depósito
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      {newDepot > currentDepot ? `+${newDepot - currentDepot}` : `${newDepot - currentDepot}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Quantidade Atual</span>
                      <span className="text-xs font-bold text-neutral-500">
                        {currentDepot} un
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-brand-600" />

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted font-bold">Após Ação</span>
                      <span className="text-sm font-extrabold text-blue-600">
                        {newDepot} un
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {hasShelfChange && (
                <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" /> Saldo na Gôndola
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      {newShelf > currentShelf ? `+${newShelf - currentShelf}` : `${newShelf - currentShelf}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Quantidade Atual</span>
                      <span className="text-xs font-bold text-neutral-500">
                        {currentShelf} un
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-brand-600" />

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted font-bold">Após Ação</span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        {newShelf} un
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Resultado da Execução (se já executado) */}
      {executed && executionResult !== undefined && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2.5 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Alterações gravadas no estoque e sincronizadas no sistema com sucesso!</span>
        </div>
      )}

      {/* Botão de Abrir Revisão / Aplicar */}
      {!executed && intent !== 'UNKNOWN' && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onApply}
            disabled={isApplying}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isMultiProduct
                ? `Revisar e Aplicar Todos os ${totalProductsCount} Produtos`
                : 'Revisar e Confirmar Alterações'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
