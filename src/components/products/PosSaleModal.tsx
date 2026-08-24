import { useState, useEffect, useRef, type SyntheticEvent } from 'react';
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
  Keyboard,
  Maximize2,
  Minimize2,
  Smartphone,
} from 'lucide-react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { playBeepSound } from '../../lib/sound';
import { RemoteScannerPairModal } from './RemoteScannerPairModal';
import type { Product, PosSaleItem, PaymentMethod, PosSaleResponse } from '../../types/product';
import type { PosPairingSession, RemoteBarcodePayload } from '../../types/posSession';
import { saleService } from '../../services/saleService';
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
  const [selectedMethods, setSelectedMethods] = useState<Array<'PIX' | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO'>>(['PIX']);
  const [splitAmounts, setSplitAmounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<PosSaleResponse | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isRemotePairModalOpen, setIsRemotePairModalOpen] = useState(false);
  const [remoteSession, setRemoteSession] = useState<PosPairingSession | null>(null);
  const [isPhoneConnected, setIsPhoneConnected] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const activeChannelRef = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    if (isOpen && scannedBarcode) {
      handleAddItemByBarcode(scannedBarcode, 1);
      if (onBarcodeConsumed) {
        onBarcodeConsumed();
      }
    }
  }, [isOpen, scannedBarcode, onBarcodeConsumed]);

  // Foco automático no campo de código ao abrir o modal
  useEffect(() => {
    if (isOpen && !successResult) {
      const timer = setTimeout(() => barcodeInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, successResult]);

  // Atalhos de Teclado Nativos:
  // - F2: Foca na busca/código de barras
  // - F4: Finaliza a venda
  // - Esc: Fecha/Cancela o modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleResetAndClose();
      } else if (e.key === 'F2') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        barcodeInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (!isLoading && items.length > 0 && !successResult) {
          triggerSubmitSale();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, paymentMethod, isLoading, successResult]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Conexão ao Canal Realtime Supabase Broadcast para o Scanner Remoto
  const connectRemoteScanner = (session: PosPairingSession) => {
    setRemoteSession(session);

    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current);
    }

    const channel = supabase.channel(session.channel, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'device-connected' }, () => {
        setIsPhoneConnected(true);
        playBeepSound(1600, 0.12);
        // Fecha o modal do QR Code automaticamente após 1 segundo
        setTimeout(() => setIsRemotePairModalOpen(false), 1000);
      })
      .on('broadcast', { event: 'device-disconnected' }, () => {
        setIsPhoneConnected(false);
      })
      .on('broadcast', { event: 'barcode-scanned' }, (event) => {
        const payload = event.payload as RemoteBarcodePayload;
        if (payload?.barcode) {
          setIsPhoneConnected(true);
          playBeepSound(1400, 0.08);
          // Incrementa quantidade ou insere o produto
          handleAddItemByBarcode(payload.barcode, 1);
        }
      })
      .subscribe();

    activeChannelRef.current = channel;
  };

  // Desconecta o canal Realtime quando o PDV for fechado
  useEffect(() => {
    if (!isOpen) {
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      }
      setIsPhoneConnected(false);
      setRemoteSession(null);
    }

    return () => {
      if (activeChannelRef.current) {
        supabase.removeChannel(activeChannelRef.current);
        activeChannelRef.current = null;
      }
    };
  }, [isOpen]);

  // Filtra produtos em tempo real por nome ou código de barras
  const filteredSuggestions = barcodeInput.trim().length > 0
    ? catalogProducts
        .filter((p) => {
          const term = barcodeInput.trim().toLowerCase();
          return (
            p.name.toLowerCase().includes(term) ||
            p.barcode.toLowerCase().includes(term) ||
            (p.category && p.category.toLowerCase().includes(term))
          );
        })
        .slice(0, 6)
    : [];

  const handleAddProductItem = (product: Product, qty: number = 1) => {
    setErrorMessage(null);
    const existingIndex = items.findIndex((item) => item.barcode === product.barcode);
    const price = product.price ? Number(product.price) : 0;

    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += qty;
      setItems(updated);
    } else {
      setItems([
        ...items,
        {
          barcode: product.barcode,
          quantity: qty,
          unitPrice: price,
          name: product.name,
        },
      ]);
    }
    setBarcodeInput('');
    setQuantityInput(1);
    setShowSuggestions(false);
  };

  const handleAddItemByBarcode = (code: string, qty: number = 1) => {
    setErrorMessage(null);
    const trimmed = code.trim();
    if (!trimmed) return;

    // Se houver uma sugestão exata ou primeiro resultado correspondente
    const found = catalogProducts.find(
      (p) => p.barcode === trimmed || p.name.toLowerCase() === trimmed.toLowerCase()
    ) || filteredSuggestions[0];

    if (found) {
      handleAddProductItem(found, qty);
      return;
    }

    const existingIndex = items.findIndex((item) => item.barcode === trimmed);
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
          unitPrice: 0,
          name: `Produto (${trimmed})`,
        },
      ]);
    }
    setBarcodeInput('');
    setQuantityInput(1);
    setShowSuggestions(false);
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

  const executeSale = async () => {
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage('Adicione pelo menos um item à cesta para finalizar a venda.');
      return;
    }

    // Validação de divisão caso múltiplos métodos estejam selecionados
    if (selectedMethods.length > 1) {
      const sumSplit = selectedMethods.reduce((acc, m) => acc + (Number(splitAmounts[m]) || 0), 0);
      if (Math.abs(sumSplit - totalAmount) > 0.05) {
        setErrorMessage(
          `A soma dos pagamentos (R$ ${sumSplit.toFixed(2)}) deve ser igual ao total da venda (R$ ${totalAmount.toFixed(2)}).`
        );
        return;
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        items: items.map((i) => ({
          barcode: i.barcode,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        paymentMethod: selectedMethods.length > 1 ? ('MULTIPLOS' as PaymentMethod) : selectedMethods[0] || paymentMethod,
        payments:
          selectedMethods.length > 1
            ? selectedMethods.map((m) => ({
                method: m,
                amount: Number((splitAmounts[m] || 0).toFixed(2)),
              }))
            : undefined,
      };
      const res = await saleService.create(payload);
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

  const togglePaymentMethod = (method: 'PIX' | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO') => {
    setSelectedMethods((prev) => {
      let next: Array<'PIX' | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO'>;
      if (prev.includes(method)) {
        if (prev.length === 1) return prev; // Mantém pelo menos um
        next = prev.filter((m) => m !== method);
      } else {
        next = [...prev, method];
      }

      // Distribui o valor total proporcionalmente entre os métodos selecionados
      if (next.length > 1) {
        const splitVal = Number((totalAmount / next.length).toFixed(2));
        const newSplits: Record<string, number> = {};
        next.forEach((m, idx) => {
          if (idx === next.length - 1) {
            const allocated = splitVal * (next.length - 1);
            newSplits[m] = Number((totalAmount - allocated).toFixed(2));
          } else {
            newSplits[m] = splitVal;
          }
        });
        setSplitAmounts(newSplits);
      } else {
        setPaymentMethod(next[0]);
        setSplitAmounts({});
      }
      return next;
    });
  };

  const handleSplitAmountChange = (method: string, val: number) => {
    setSplitAmounts((prev) => ({
      ...prev,
      [method]: val,
    }));
  };

  const triggerSubmitSale = () => {
    executeSale();
  };

  const handleSubmitSale = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    executeSale();
  };
  const handleResetAndClose = () => {
    if (activeChannelRef.current) {
      supabase.removeChannel(activeChannelRef.current);
      activeChannelRef.current = null;
    }
    setIsPhoneConnected(false);
    setRemoteSession(null);
    setItems([]);
    setSelectedMethods(['PIX']);
    setSplitAmounts({});
    setSuccessResult(null);
    setErrorMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs animate-fade-in ${
      isMaximized ? 'p-0' : 'p-2 sm:p-4'
    }`}>
      <div className={`w-full bg-card border border-border-neutral shadow-2xl relative flex flex-col overflow-hidden transition-all duration-200 ${
        isMaximized
          ? 'max-w-none h-full rounded-none p-3 sm:p-6'
          : 'max-w-2xl rounded-3xl p-3.5 sm:p-6 my-auto max-h-[96vh] sm:max-h-[90vh]'
      }`}>
        {/* Header Fixo */}
        <div className="flex items-center justify-between pb-2 border-b border-border-neutral mb-2.5 shrink-0">
          <div className="flex items-center gap-2 text-brand-600 font-bold">
            <ShoppingCart className="w-5 h-5" />
            <div>
              <h3 className="text-sm sm:text-base text-text-primary font-bold">
                Frente de Caixa (PDV)
              </h3>
              <p className="text-tiny text-text-muted hidden sm:block">
                Baixa automática de estoque da gôndola
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMaximized((prev) => !prev)}
              className="p-1.5 sm:p-2 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              title={isMaximized ? 'Restaurar tamanho' : 'Expandir tela cheia'}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="p-1.5 sm:p-2 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
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
          <form onSubmit={handleSubmitSale} className="flex flex-col flex-1 min-h-0 gap-3 text-xs">
            {errorMessage && (
              <div className="p-2.5 bg-status-danger-bg border border-status-danger/30 rounded-xl text-status-danger text-xs font-semibold flex items-center gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick barcode add input com busca por nome e dropdown */}
            <div ref={searchContainerRef} className="p-3 bg-canvas border border-border-neutral rounded-2xl space-y-1.5 shrink-0 relative">
              <div className="flex items-center justify-between">
                <label className="text-tiny font-bold text-text-muted">
                  Bipar ou Digitar Código de Barras
                </label>
                <span className="text-tiny text-text-muted hidden sm:inline-flex items-center gap-1 font-mono">
                  <kbd className="px-1 py-0.2 bg-card border border-border-neutral rounded text-tiny font-bold">F2</kbd> focar
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => {
                      setBarcodeInput(e.target.value);
                      setShowSuggestions(true);
                      setSelectedSuggestionIndex(0);
                    }}
                    onFocus={() => {
                      if (barcodeInput.trim().length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (showSuggestions && filteredSuggestions.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedSuggestionIndex((prev) =>
                            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
                          );
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedSuggestionIndex((prev) =>
                            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
                          );
                          return;
                        }
                        if (e.key === 'Enter' && filteredSuggestions[selectedSuggestionIndex]) {
                          e.preventDefault();
                          handleAddProductItem(
                            filteredSuggestions[selectedSuggestionIndex],
                            quantityInput
                          );
                          return;
                        }
                      }

                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItemByBarcode(barcodeInput, quantityInput);
                      }
                    }}
                    placeholder="Bipar ou digitar nome/código... (Enter confirma)"
                    className="w-full h-10 px-3 bg-card border border-border-neutral rounded-xl text-text-primary text-xs focus:outline-none focus:border-brand-500 font-medium"
                  />

                  {/* Lista de sugestões / busca em tempo real */}
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border-neutral rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-border-neutral max-h-60 overflow-y-auto animate-fadeIn">
                      {filteredSuggestions.map((prod, idx) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleAddProductItem(prod, quantityInput)}
                          className={`w-full p-2.5 text-left flex items-start sm:items-center justify-between gap-2.5 transition-colors cursor-pointer text-xs ${
                            selectedSuggestionIndex === idx
                              ? 'bg-brand-50/90 text-brand-900'
                              : 'hover:bg-canvas text-text-primary'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-text-primary break-words leading-tight">
                              {prod.name}
                            </p>
                            <p className="text-tiny font-mono text-text-muted mt-0.5">
                              {prod.barcode} {prod.category ? `• ${prod.category}` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-xs text-brand-600 block">
                              {prod.price !== undefined && prod.price !== null
                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(prod.price))
                                : 'R$ 0,00'}
                            </span>
                            <span className="text-tiny text-text-muted">
                              Gôndola: {prod.shelfQty} un
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    min="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(parseInt(e.target.value) || 1)}
                    className="w-14 sm:w-16 h-10 px-1.5 bg-card border border-border-neutral rounded-xl text-text-primary text-xs text-center font-mono font-bold"
                    title="Quantidade"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddItemByBarcode(barcodeInput, quantityInput)}
                    className="flex-1 sm:flex-initial h-10 px-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenScanner}
                    title="Abrir Câmera do Computador"
                    className="h-10 px-2.5 bg-card hover:bg-neutral-100 border border-border-neutral text-text-primary rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <Barcode className="w-4 h-4 text-brand-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRemotePairModalOpen(true)}
                    title={isPhoneConnected ? 'Celular Pareado (Pronto para Bipar)' : 'Conectar Câmera do Celular via QR Code'}
                    className={`h-10 px-2.5 sm:px-3 border rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isPhoneConnected
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 shadow-2xs'
                        : 'bg-brand-50 hover:bg-brand-100 border-brand-200 text-brand-700'
                    }`}
                  >
                    <Smartphone className={`w-4 h-4 ${isPhoneConnected ? 'text-emerald-600' : 'text-brand-600'}`} />
                    <span className="hidden sm:inline text-tiny font-bold flex items-center gap-1">
                      {isPhoneConnected ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Celular Pareado</span>
                        </>
                      ) : (
                        'Bipador Celular'
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col flex-1 min-h-[140px] max-h-[30vh] sm:max-h-[36vh] border border-border-neutral rounded-2xl bg-canvas overflow-hidden">
              <div className="flex items-center justify-between text-tiny font-bold text-text-muted px-3 py-2 border-b border-border-neutral bg-card shrink-0">
                <span>Cesta de Produtos ({items.length})</span>
                <span>Subtotal</span>
              </div>

              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-text-muted space-y-1">
                  <ShoppingCart className="w-7 h-7 text-neutral-300" />
                  <p className="font-semibold text-xs text-text-primary">Cesta de compras vazia</p>
                  <p className="text-tiny text-text-muted">Bipe ou digite o código de barras acima e pressione Enter.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-border-neutral/40">
                  {items.map((item, idx) => (
                    <div
                      key={`${item.barcode}-${idx}`}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-text-primary text-xs truncate">{item.name}</p>
                        <p className="text-tiny font-mono text-text-muted">{item.barcode}</p>
                      </div>

                      {/* Controles compactos de Qtd e Preço */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-border-neutral rounded-lg bg-card overflow-hidden h-8">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity - 1)}
                            className="w-7 h-full flex items-center justify-center hover:bg-neutral-100 text-text-primary font-bold text-xs"
                            aria-label="Diminuir"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono font-bold text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(idx, item.quantity + 1)}
                            className="w-7 h-full flex items-center justify-center hover:bg-neutral-100 text-text-primary font-bold text-xs"
                            aria-label="Aumentar"
                          >
                            +
                          </button>
                        </div>

                        <div className="w-18">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdatePrice(idx, parseFloat(e.target.value) || 0)}
                            className="w-full h-8 px-1.5 bg-card border border-border-neutral rounded-lg text-text-primary text-xs font-mono font-semibold text-right"
                            title="Preço Unitário"
                          />
                        </div>

                        <span className="w-16 font-mono font-bold text-right text-text-primary text-xs">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(item.quantity * item.unitPrice)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-status-danger hover:bg-status-danger-bg rounded-lg transition-colors cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Formas de Pagamento e Finalização (Fixos no rodapé) */}
            <div className="space-y-2 pt-1 shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-tiny font-bold text-text-muted">
                    Forma de Pagamento {selectedMethods.length > 1 ? '(Múltiplos Selecionados)' : ''}
                  </label>
                  <span className="text-tiny text-brand-600 font-bold">
                    {selectedMethods.length > 1 ? `${selectedMethods.length} métodos ativos` : 'Clique para combinar mais de um'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'PIX' as const, label: 'PIX', icon: QrCode },
                    { id: 'DINHEIRO' as const, label: 'Dinheiro', icon: Banknote },
                    { id: 'CARTAO_DEBITO' as const, label: 'Débito', icon: CreditCard },
                    { id: 'CARTAO_CREDITO' as const, label: 'Crédito', icon: CreditCard },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = selectedMethods.includes(pm.id);
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => togglePaymentMethod(pm.id)}
                        className={`h-9 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                            : 'bg-card hover:bg-neutral-100 border-border-neutral text-text-primary'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Divisão de Valores caso haja múltiplos métodos selecionados */}
                {selectedMethods.length > 1 && (
                  <div className="p-2.5 bg-brand-50/70 border border-brand-200/80 rounded-2xl space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-tiny font-bold text-brand-800">
                      <span>Dividir valor por forma de pagamento:</span>
                      <span>
                        Soma:{' '}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          selectedMethods.reduce((acc, m) => acc + (Number(splitAmounts[m]) || 0), 0)
                        )}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {selectedMethods.map((m) => (
                        <div key={m} className="space-y-0.5">
                          <span className="text-tiny font-bold text-text-muted block truncate">
                            {m === 'CARTAO_DEBITO' ? 'Débito' : m === 'CARTAO_CREDITO' ? 'Crédito' : m} (R$)
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={splitAmounts[m] !== undefined ? splitAmounts[m] : ''}
                            onChange={(e) => handleSplitAmountChange(m, parseFloat(e.target.value) || 0)}
                            className="w-full h-8 px-2 bg-card border border-border-neutral rounded-lg text-xs font-mono font-bold text-text-primary focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Total summary & Submit */}
              <div className="p-3 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-tiny text-brand-800 font-bold">Total a Pagar</span>
                  <p className="text-tiny text-text-muted">{totalItemsCount} item(s) selecionado(s)</p>
                </div>
                <p className="text-xl font-black text-brand-600 font-mono">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalAmount
                  )}
                </p>
              </div>

              {/* Atalhos e Botões de Ação */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div className="hidden sm:flex items-center gap-2 text-tiny text-text-muted">
                  <span className="flex items-center gap-1">
                    <Keyboard className="w-3 h-3" />
                  </span>
                  <span><kbd className="px-1 py-0.2 bg-card border rounded font-mono text-tiny">Enter</kbd> Adiciona</span>
                  <span><kbd className="px-1 py-0.2 bg-card border rounded font-mono text-tiny">F4</kbd> Finaliza</span>
                  <span><kbd className="px-1 py-0.2 bg-card border rounded font-mono text-tiny">Esc</kbd> Fecha</span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleResetAndClose}
                    className="h-10 px-4 bg-card hover:bg-neutral-100 border border-border-neutral text-text-primary font-bold rounded-xl transition-colors cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || items.length === 0}
                    className="h-10 px-5 bg-status-success hover:bg-green-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Finalizar Venda (F4)</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>

    {/* Modal de Pareamento Remoto via QR Code */}
    <RemoteScannerPairModal
      isOpen={isRemotePairModalOpen}
      onClose={() => setIsRemotePairModalOpen(false)}
      session={remoteSession}
      onSessionCreated={connectRemoteScanner}
      isPhoneConnected={isPhoneConnected}
    />
    </>
  );
}
