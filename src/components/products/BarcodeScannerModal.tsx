import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras',
}: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      return;
    }

    const startScanner = async () => {
      setError(null);
      setIsStarting(true);
      try {
        const scannerId = 'barcode-scanner-viewport';
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 160 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScan(decodedText.trim());
            cleanupScanner();
            onClose();
          },
          () => {
            // scan failure callback (ignore frames without codes)
          }
        );
        isRunningRef.current = true;
      } catch (err: unknown) {
        console.error('Erro ao acessar a câmera:', err);
        setError('Não foi possível inicializar a câmera. Verifique as permissões do navegador.');
      } finally {
        setIsStarting(false);
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen, onClose, onScan]);

  const cleanupScanner = async () => {
    if (scannerRef.current && isRunningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.warn('Erro ao parar scanner:', err);
      }
      try {
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      isRunningRef.current = false;
      scannerRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border-neutral rounded-2xl p-5 shadow-2xl flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-neutral mb-4">
          <div className="flex items-center gap-2 text-brand-600 font-bold">
            <Camera className="w-5 h-5" />
            <h3 className="text-base text-text-primary font-bold">{title}</h3>
          </div>
          <button
            onClick={() => {
              cleanupScanner();
              onClose();
            }}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="relative w-full aspect-square bg-neutral-900 rounded-xl overflow-hidden flex flex-col items-center justify-center border border-border-neutral">
          <div id="barcode-scanner-viewport" className="w-full h-full" />

          {isStarting && (
            <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center text-white gap-3 p-4">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-xs text-neutral-300 font-medium">Iniciando câmera traseira...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-neutral-900/95 flex flex-col items-center justify-center text-white gap-3 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-status-danger" />
              <p className="text-sm font-semibold text-status-danger">{error}</p>
              <p className="text-xs text-neutral-400">
                Você também pode digitar o código de barras diretamente nos campos de texto.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-text-muted">
            Aponte a câmera para o código EAN/GTIN do produto na gôndola ou caixa.
          </p>
        </div>
      </div>
    </div>
  );
}
