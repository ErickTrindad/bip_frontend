import { useState, useTransition, useMemo, useEffect } from 'react';
import {
  Package,
  ArrowRight,
  TrendingUp,
  Tag,
  Store,
  Layers,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  ShoppingCart,
  Layers3,
  RotateCcw,
} from 'lucide-react';
import type { VoiceCommandResponse, VoiceActionItem } from '../../types/ai';
import { productService } from '../../services/productService';
import { ApiError } from '../../services/api';

interface ActionReviewModalProps {
  voiceResult: VoiceCommandResponse;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedResult: VoiceCommandResponse) => void;
}

export interface EditableProductAction {
  id: string;
  productId?: string;
  action: VoiceActionItem['action'];
  productName: string;
  barcode?: string;
  price?: number | null;
  quantity?: number | null;
  from?: 'depot' | 'shelf';
  to?: 'depot' | 'shelf';
  destination?: 'depot' | 'shelf';
  currentDepotQty: number;
  currentShelfQty: number;
  currentPrice: number | null;
  isExistingProduct: boolean;
  isApplied?: boolean;
}

export function ActionReviewModal({
  voiceResult,
  isOpen,
  onClose,
  onSuccess,
}: ActionReviewModalProps) {
  const [isApplying, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  // Normaliza lista de produtos de forma resiliente a multi-produtos e comandos compostos
  const initialItems = useMemo<EditableProductAction[]>(() => {
    const list: EditableProductAction[] = [];
    const mainProd = voiceResult.matchedProduct;

    if (voiceResult.actions && voiceResult.actions.length > 0) {
      voiceResult.actions.forEach((act, idx) => {
        const itemMatched = act.matchedProduct;
        const prodName = act.productQuery || itemMatched?.name || (idx === 0 && mainProd?.name) || 'Produto';
        const isMatched = !!itemMatched || (idx === 0 && !!mainProd && (prodName.toLowerCase() === mainProd.name.toLowerCase() || act.productQuery === mainProd.barcode));
        
        const effectiveProd = itemMatched || (isMatched ? mainProd : null);
        const curDepot = effectiveProd ? effectiveProd.depotQty : 0;
        const curShelf = effectiveProd ? effectiveProd.shelfQty : 0;
        const curPrice = effectiveProd?.price != null ? Number(effectiveProd.price) : null;

        list.push({
          id: `act-${idx}`,
          productId: effectiveProd?.id,
          action: act.action,
          productName: effectiveProd?.name || prodName,
          barcode: effectiveProd?.barcode,
          price: act.price != null ? Number(act.price) : curPrice,
          quantity: act.quantity != null ? Number(act.quantity) : (act.depotQty || act.shelfQty ? (act.depotQty || 0) + (act.shelfQty || 0) : undefined),
          from: act.from || 'shelf',
          to: act.to || 'depot',
          destination: act.destination || (act.shelfQty && !act.depotQty ? 'shelf' : 'depot'),
          currentDepotQty: curDepot,
          currentShelfQty: curShelf,
          currentPrice: curPrice,
          isExistingProduct: !!effectiveProd,
          isApplied: act.executed || voiceResult.executed,
        });
      });
    } else {
      const prodName = voiceResult.extractedData.productQuery || mainProd?.name || 'Produto';
      list.push({
        id: 'act-0',
        productId: mainProd?.id,
        action: voiceResult.intent !== 'UNKNOWN' && voiceResult.intent !== 'COMPOUND_ACTION' ? voiceResult.intent : 'STOCK_ENTRY',
        productName: mainProd?.name || prodName,
        barcode: mainProd?.barcode || voiceResult.extractedData.barcode,
        price: voiceResult.extractedData.newPrice ?? voiceResult.extractedData.price ?? (mainProd?.price != null ? Number(mainProd.price) : null),
        quantity: voiceResult.extractedData.quantity,
        from: voiceResult.extractedData.from || 'shelf',
        to: voiceResult.extractedData.to || 'depot',
        destination: voiceResult.extractedData.destination || 'depot',
        currentDepotQty: mainProd ? mainProd.depotQty : 0,
        currentShelfQty: mainProd ? mainProd.shelfQty : 0,
        currentPrice: mainProd?.price != null ? Number(mainProd.price) : null,
        isExistingProduct: !!mainProd,
        isApplied: voiceResult.executed,
      });
    }
    return list;
  }, [voiceResult]);

  const [editableItems, setEditableItems] = useState<EditableProductAction[]>(initialItems);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // Sincroniza editableItems quando o modal abre ou novo voiceResult chega
  useEffect(() => {
    setEditableItems(initialItems);
    setActiveItemIndex(0);
  }, [initialItems, isOpen]);

  // Busca em segundo plano o produto caso não tenha sido identificado pelo id
  useEffect(() => {
    if (!isOpen) return;
    editableItems.forEach((item, idx) => {
      if (!item.productId && item.productName) {
        productService.list({ search: item.productName, limit: 10 }).then((res) => {
          const found = res.products?.find((p) =>
            p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
            item.productName.toLowerCase().includes(p.name.toLowerCase()) ||
            p.barcode === item.barcode
          ) || res.products?.[0];

          if (found) {
            setEditableItems((prev) =>
              prev.map((it, i) =>
                i === idx
                  ? {
                      ...it,
                      productId: found.id,
                      productName: found.name,
                      barcode: found.barcode,
                      currentDepotQty: found.depotQty,
                      currentShelfQty: found.shelfQty,
                      currentPrice: found.price != null ? Number(found.price) : null,
                      isExistingProduct: true,
                    }
                  : it
              )
            );
          }
        }).catch(() => {});
      }
    });
  }, [isOpen, editableItems]);
  if (!isOpen) return null;

  const currentItem = editableItems[activeItemIndex] || editableItems[0];
  const totalCount = editableItems.length;

  const updateCurrentItem = (fields: Partial<EditableProductAction>) => {
    setEditableItems((prev) =>
      prev.map((item, idx) => (idx === activeItemIndex ? { ...item, ...fields } : item))
    );
  };

  // Cálculo pré e pós do item ativo
  const hasPriceChange =
    currentItem.price !== undefined &&
    currentItem.price !== null &&
    currentItem.price !== currentItem.currentPrice;

  let projectedDepot = currentItem.currentDepotQty;
  let projectedShelf = currentItem.currentShelfQty;
  const qty = Number(currentItem.quantity || 0);

  if (currentItem.action === 'STOCK_ENTRY' || currentItem.action === 'REGISTER_PRODUCT') {
    if (currentItem.destination === 'shelf') projectedShelf += qty;
    else projectedDepot += qty;
  } else if (currentItem.action === 'TRANSFER_STOCK') {
    if (currentItem.from === 'shelf' && currentItem.to === 'depot') {
      projectedShelf = Math.max(0, projectedShelf - qty);
      projectedDepot += qty;
    } else {
      projectedDepot = Math.max(0, projectedDepot - qty);
      projectedShelf += qty;
    }
  } else if (currentItem.action === 'POS_SALE') {
    projectedShelf = Math.max(0, projectedShelf - qty);
  }

  const hasDepotChange = projectedDepot !== currentItem.currentDepotQty;
  const hasShelfChange = projectedShelf !== currentItem.currentShelfQty;

  // Aplicação de todas as ações no banco
  const handleConfirmAndApplyAll = () => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        for (const item of editableItems) {
          // Procura produto existente por id, barcode ou nome
          let targetId = item.productId;
          let foundProduct = null;

          if (targetId) {
            foundProduct = await productService.getById(targetId).then((r) => r.product).catch(() => null);
          }

          if (!foundProduct && item.barcode) {
            foundProduct = await productService.getByBarcode(item.barcode).then((r) => r.product).catch(() => null);
            if (foundProduct) targetId = foundProduct.id;
          }

          if (!foundProduct && item.productName) {
            const searchRes = await productService.list({ search: item.productName, limit: 10 }).catch(() => null);
            foundProduct = searchRes?.products?.find((p) =>
              p.name.toLowerCase() === item.productName.toLowerCase() ||
              p.name.toLowerCase().includes(item.productName.toLowerCase()) ||
              item.productName.toLowerCase().includes(p.name.toLowerCase())
            ) || searchRes?.products?.[0] || null;
            if (foundProduct) targetId = foundProduct.id;
          }

          if (item.action === 'REGISTER_PRODUCT' || (!foundProduct && !item.isExistingProduct)) {
            // Criação de produto
            const barcode = item.barcode || `AUTO-${Date.now().toString().slice(-8)}`;
            await productService.create({
              name: item.productName,
              barcode,
              depotQty: item.destination === 'depot' ? Number(item.quantity || 0) : 0,
              shelfQty: item.destination === 'shelf' ? Number(item.quantity || 0) : 0,
              shelfMinQty: 5,
              price: item.price != null ? Number(item.price) : undefined,
            });
          } else if (foundProduct && targetId) {
            // Atualização de Preço e/ou Dados
            const updatePayload: { price?: number; depotQty?: number; shelfQty?: number } = {};

            if (item.price !== undefined && item.price !== null) {
              updatePayload.price = Number(item.price);
            }

            // Entrada de estoque
            if (item.action === 'STOCK_ENTRY' && item.quantity) {
              const addQty = Number(item.quantity);
              if (item.destination === 'shelf') {
                updatePayload.shelfQty = foundProduct.shelfQty + addQty;
              } else {
                updatePayload.depotQty = foundProduct.depotQty + addQty;
              }
            }

            // Aplica update de preço ou quantidades
            if (Object.keys(updatePayload).length > 0) {
              await productService.update(targetId, updatePayload);
            }

            // Transferência
            if (item.action === 'TRANSFER_STOCK' && item.quantity) {
              const transferQty = Number(item.quantity);
              if (item.from === 'shelf' && item.to === 'depot') {
                await productService.update(targetId, {
                  shelfQty: Math.max(0, foundProduct.shelfQty - transferQty),
                  depotQty: foundProduct.depotQty + transferQty,
                });
              } else {
                await productService.transferStock(targetId, { quantity: transferQty });
              }
            }
          }
        }

        // Marca todos como aplicados
        setEditableItems((prev) => prev.map((item) => ({ ...item, isApplied: true })));
        onSuccess({
          ...voiceResult,
          executed: true,
          explanation: `Todas as alterações nos ${editableItems.length} produto(s) foram aplicadas e sincronizadas com sucesso no seu estoque!`,
        });
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Erro ao aplicar as alterações no banco de dados.');
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-card border border-border-neutral rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header do Modal com Contador de Produtos no Canto Superior Direito */}
        <div className="p-5 md:p-6 border-b border-border-neutral flex items-center justify-between bg-canvas sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100">
              <Layers3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-extrabold text-text-primary">
                Resumo das Alterações
              </h3>
              <p className="text-xs text-text-muted">
                Revise, ajuste e confirme o que foi entendido
              </p>
            </div>
          </div>

          {/* Badge Contador Superior Direito */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-extrabold shadow-xs">
              <Package className="w-4 h-4 text-brand-600" />
              <span>
                {totalCount} {totalCount === 1 ? 'produto identificado' : 'produtos identificados'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scroll Carrossel / Navegador de Produtos caso haja múltiplos */}
        {totalCount > 1 && (
          <div className="px-5 md:px-6 py-3 bg-brand-50/40 border-b border-brand-100 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                Navegar nos produtos:
              </span>
              <div className="flex items-center gap-1.5">
                {editableItems.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveItemIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeItemIndex === idx
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-card border border-border-neutral text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <span>{idx + 1}.</span>
                    <span className="truncate max-w-[140px]">{item.productName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setActiveItemIndex((prev) => Math.max(0, prev - 1))}
                disabled={activeItemIndex === 0}
                className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-text-muted font-mono">
                {activeItemIndex + 1}/{totalCount}
              </span>
              <button
                onClick={() => setActiveItemIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                disabled={activeItemIndex === totalCount - 1}
                className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Corpo do Modal - Conteúdo do Item Ativo */}
        <div className="p-5 md:p-6 flex-1 overflow-y-auto space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 bg-status-danger-bg text-status-danger border border-red-200 rounded-2xl text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* O que o usuário disse */}
          <div className="bg-canvas border border-border-neutral rounded-2xl p-3.5 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Comando Identificado:
              </span>
              <p className="text-xs font-medium text-text-primary italic mt-0.5">
                &quot;{voiceResult.transcription}&quot;
              </p>
            </div>
          </div>

          {/* Card de Edição Direta do Nome do Produto e Tipo de Ação */}
          <div className="p-4 bg-card border border-border-neutral rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Package className="w-5 h-5 text-brand-600 shrink-0" />
                {editingFieldId === 'name' ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={currentItem.productName}
                      onChange={(e) => updateCurrentItem({ productName: e.target.value })}
                      className="px-2.5 py-1 text-sm font-bold bg-canvas border border-brand-500 rounded-xl focus:outline-none flex-1"
                      autoFocus
                    />
                    <button
                      onClick={() => setEditingFieldId(null)}
                      className="p-1 bg-brand-600 text-white rounded-lg cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-base font-extrabold text-text-primary">
                      {currentItem.productName}
                    </span>
                    <button
                      onClick={() => setEditingFieldId('name')}
                      className="p-1 text-text-muted hover:text-brand-600 transition-colors cursor-pointer"
                      title="Editar nome"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Tag de Tipo de Ação */}
              <div>
                {currentItem.action === 'STOCK_ENTRY' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" /> Entrada de Estoque
                  </span>
                )}
                {currentItem.action === 'REGISTER_PRODUCT' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" /> Novo Cadastro
                  </span>
                )}
                {currentItem.action === 'TRANSFER_STOCK' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Store className="w-3.5 h-3.5" /> Transferência
                  </span>
                )}
                {currentItem.action === 'UPDATE_PRODUCT' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" /> Alterar Preço
                  </span>
                )}
                {currentItem.action === 'POS_SALE' && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                    <ShoppingCart className="w-3.5 h-3.5" /> Venda no Caixa
                  </span>
                )}
              </div>
            </div>

            {/* Ajuste de Quantidade e Preço em Inputs amigáveis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">
                  Quantidade:
                </label>
                <input
                  type="number"
                  min="1"
                  value={currentItem.quantity || ''}
                  onChange={(e) => updateCurrentItem({ quantity: Number(e.target.value) })}
                  placeholder="Ex: 10"
                  className="w-full px-3 py-2 text-xs bg-canvas border border-border-neutral rounded-xl font-bold focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-text-muted block mb-1">
                  Preço de Venda (R$):
                </label>
                <input
                  type="number"
                  step="0.10"
                  value={currentItem.price || ''}
                  onChange={(e) => updateCurrentItem({ price: Number(e.target.value) })}
                  placeholder="Ex: 8.50"
                  className="w-full px-3 py-2 text-xs bg-canvas border border-border-neutral rounded-xl font-bold focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Comparativo Visual Pré x Pós do Produto Selecionado (Mostra apenas o que muda) */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-text-primary">
              Impacto no Estoque deste Produto (Antes &rarr; Depois):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Card Comparativo Preço */}
              {hasPriceChange && (
                <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-violet-600" /> Preço
                    </span>
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                      Novo Preço
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Atual</span>
                      <span className="text-xs font-bold text-neutral-500 line-through">
                        {currentItem.currentPrice != null ? `R$ ${currentItem.currentPrice.toFixed(2)}` : 'Sem Preço'}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-brand-600" />

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted font-bold">Novo</span>
                      <span className="text-sm font-extrabold text-brand-600">
                        R$ {currentItem.price?.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Comparativo Depósito */}
              {hasDepotChange && (
                <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                    <span className="flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-blue-600" /> Depósito
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      {projectedDepot > currentItem.currentDepotQty
                        ? `+${projectedDepot - currentItem.currentDepotQty}`
                        : `${projectedDepot - currentItem.currentDepotQty}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Atual</span>
                      <span className="text-xs font-bold text-neutral-500">
                        {currentItem.currentDepotQty} un
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-brand-600" />

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted font-bold">Após Ação</span>
                      <span className="text-sm font-extrabold text-blue-600">
                        {projectedDepot} un
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Comparativo Gôndola */}
              {hasShelfChange && (
                <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" /> Gôndola
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                      {projectedShelf > currentItem.currentShelfQty
                        ? `+${projectedShelf - currentItem.currentShelfQty}`
                        : `${projectedShelf - currentItem.currentShelfQty}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-text-muted">Atual</span>
                      <span className="text-xs font-bold text-neutral-500">
                        {currentItem.currentShelfQty} un
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-brand-600" />

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] text-text-muted font-bold">Após Ação</span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        {projectedShelf} un
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="p-5 md:p-6 border-t border-border-neutral bg-canvas flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-text-muted hover:text-text-primary bg-card border border-border-neutral rounded-xl transition-colors cursor-pointer"
          >
            Fechar sem aplicar
          </button>

          <button
            type="button"
            onClick={handleConfirmAndApplyAll}
            disabled={isApplying || editableItems.every((i) => i.isApplied)}
            className="w-full sm:w-auto px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            {isApplying ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Aplicando {totalCount} produto(s) no estoque...</span>
              </>
            ) : editableItems.every((i) => i.isApplied) ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Alterações já Aplicadas</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Aplicar Todos ({totalCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
