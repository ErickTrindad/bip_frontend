import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Copy,
  Check,
} from 'lucide-react';
import { posSessionService } from '../../services/posSessionService';
import type { PosPairingSession } from '../../types/posSession';

interface RemoteScannerPairModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: PosPairingSession | null;
  onSessionCreated: (session: PosPairingSession) => void;
  isPhoneConnected: boolean;
}

export function RemoteScannerPairModal({
  isOpen,
  onClose,
  session,
  onSessionCreated,
  isPhoneConnected,
}: RemoteScannerPairModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showConnectedRedirect, setShowConnectedRedirect] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // Gera o QR Code para uma sessão existente ou nova
  const generateQrForSession = async (currentSession: PosPairingSession) => {
    try {
      const clientPairUrl = `${window.location.origin}/scanner-remote?session=${encodeURIComponent(
        currentSession.sessionId
      )}&token=${encodeURIComponent(currentSession.token)}`;

      const qrData = await QRCode.toDataURL(clientPairUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#171717',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(qrData);
      setRemainingSeconds(currentSession.expiresInSeconds || 1800);
    } catch (err: unknown) {
      console.error('Erro ao gerar imagem do QR Code:', err);
      setError('Erro ao renderizar imagem do QR Code.');
    }
  };

  // Cria uma nova sessão no backend
  const initNewSession = async () => {
    setLoading(true);
    setError(null);
    setShowConnectedRedirect(false);

    try {
      const newSession = await posSessionService.createPairingSession();
      onSessionCreated(newSession);
      await generateQrForSession(newSession);
    } catch (err: unknown) {
      console.error('Erro ao gerar pareamento remoto:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao inicializar pareamento.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Ao abrir o modal, se não houver sessão ativa ou se estiver expirada, gera uma nova
  useEffect(() => {
    if (isOpen) {
      setShowConnectedRedirect(false);
      if (session) {
        generateQrForSession(session);
      } else {
        initNewSession();
      }
    } else {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, session]);

  // Se o celular conectar enquanto o modal estiver aberto, dá feedback visual e fecha automaticamente
  useEffect(() => {
    if (isOpen && isPhoneConnected) {
      setShowConnectedRedirect(true);
      const timer = window.setTimeout(() => {
        onClose();
      }, 900);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen, isPhoneConnected, onClose]);

  // Temporizador de expiração regressivo
  useEffect(() => {
    if (!isOpen || !session) return;

    timerRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isOpen, session]);

  const handleCopyLink = () => {
    if (!session) return;
    const clientPairUrl = `${window.location.origin}/scanner-remote?session=${encodeURIComponent(
      session.sessionId
    )}&token=${encodeURIComponent(session.token)}`;
    navigator.clipboard.writeText(clientPairUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border-neutral rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-neutral mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Bipador via Celular
              </h3>
              <p className="text-tiny text-text-muted">
                Use a câmera do smartphone como scanner no PDV
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback de Redirecionamento Automático ao Conectar */}
        {showConnectedRedirect ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-fadeIn">
            <div className="w-16 h-16 bg-status-success-bg text-status-success rounded-full flex items-center justify-center border border-status-success/30 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-base font-bold text-text-primary">Celular Conectado com Sucesso!</h4>
              <p className="text-xs text-text-muted mt-1">
                Voltando para o checkout. Qualquer bipe no celular entrará direto na venda.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Status de Conexão */}
            <div className="mb-4">
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                  isPhoneConnected
                    ? 'bg-status-success-bg border-status-success/40 text-status-success'
                    : 'bg-canvas border-border-neutral text-text-muted'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Radio
                    className={`w-4 h-4 ${isPhoneConnected ? 'animate-pulse text-status-success' : 'text-text-muted'}`}
                  />
                  <span>
                    {isPhoneConnected ? '🟢 Celular Conectado e Pronto' : 'Aguardando leitura do QR Code...'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-tiny font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatCountdown(remainingSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Conteúdo Central */}
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-brand-600" />
                <p className="font-semibold text-text-muted">Gerando QR Code de pareamento seguro...</p>
              </div>
            ) : error ? (
              <div className="py-8 space-y-4 text-center">
                <div className="p-3 bg-status-danger-bg border border-red-200 rounded-2xl text-status-danger flex items-center justify-center gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span className="font-semibold">{error}</span>
                </div>
                <button
                  onClick={initNewSession}
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : remainingSeconds === 0 ? (
              <div className="py-8 space-y-4 text-center">
                <div className="p-3 bg-status-warning-bg border border-yellow-200 rounded-2xl text-status-warning font-semibold">
                  Esta sessão expirou por segurança.
                </div>
                <button
                  onClick={initNewSession}
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors cursor-pointer"
                >
                  Gerar Novo QR Code
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                {/* Imagem do QR Code */}
                {qrCodeDataUrl && (
                  <div className="p-3 bg-white border border-border-neutral rounded-2xl shadow-sm">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code de Pareamento do Celular"
                      className="w-56 h-56 rounded-lg object-contain"
                    />
                  </div>
                )}

                {/* Instruções */}
                <div className="text-center space-y-1 max-w-xs">
                  <p className="font-bold text-text-primary text-xs">
                    Aponte a câmera do seu smartphone para o QR Code
                  </p>
                  <p className="text-tiny text-text-muted">
                    Não precisa instalar nada. O smartphone se conecta automaticamente via Realtime.
                  </p>
                </div>

                {/* Link Manual / Copiar Link */}
                <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-border-neutral text-tiny text-text-muted">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link Direto'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={initNewSession}
                    className="flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
                    title="Regerar sessão"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Atualizar QR Code</span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-border-neutral flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-text-primary font-bold rounded-xl transition-colors cursor-pointer text-xs"
              >
                Fechar Janela
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
