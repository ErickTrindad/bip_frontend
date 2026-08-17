import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Upload } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

const SUPPORTED_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
];

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Escanear Código de Barras',
}: BarcodeScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
        const html5QrCode = new Html5Qrcode(scannerId, {
          formatsToSupport: SUPPORTED_BARCODE_FORMATS,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = html5QrCode;

        // Tentar obter lista de câmeras ou iniciar diretamente com camera traseira
        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        const cameraConfig =
          cameras.length > 0
            ? { facingMode: 'environment' }
            : { facingMode: 'user' };

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Caixa retangular ampla otimizada para códigos de barra 1D (EAN-13, CODE-128)
              const width = Math.min(viewfinderWidth * 0.85, 320);
              const height = Math.min(viewfinderHeight * 0.45, 160);
              return { width: Math.floor(width), height: Math.floor(height) };
            },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            const clean = decodedText.trim();
            if (clean) {
              onScan(clean);
              cleanupScanner();
              onClose();
            }
          },
          () => {
            // Callback silencioso para frames sem código
          }
        );
        isRunningRef.current = true;
      } catch (err: unknown) {
        console.error('Erro ao acessar a câmera:', err);
        setError(
          'Não foi possível inicializar a câmera (permissão negada ou dispositivo sem suporte). Você pode fazer upload de uma foto ou digitar o código.'
        );
      } finally {
        setIsStarting(false);
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 250);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsStarting(true);
      setError(null);
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('barcode-scanner-viewport', {
          formatsToSupport: SUPPORTED_BARCODE_FORMATS,
          verbose: false,
        });
      }
      const decodedResult = await scanner.scanFile(file, true);
      if (decodedResult) {
        onScan(decodedResult.trim());
        cleanupScanner();
        onClose();
      }
    } catch (err: unknown) {
      console.warn('Erro ao ler imagem:', err);
      setError('Código de barras não identificado na imagem enviada. Tente outra foto ou digite manualmente.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      cleanupScanner();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border-neutral rounded-3xl p-5 shadow-2xl flex flex-col relative overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-neutral mb-3">
          <div className="flex items-center gap-2 text-brand-600 font-bold">
            <Camera className="w-5 h-5" />
            <h3 className="text-base text-text-primary font-bold">{title}</h3>
          </div>
          <button
            onClick={() => {
              cleanupScanner();
              onClose();
            }}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="relative w-full aspect-square bg-neutral-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-border-neutral">
          <div id="barcode-scanner-viewport" className="w-full h-full [&_video]:object-cover" />

          {isStarting && (
            <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center text-white gap-3 p-4 z-10">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-xs text-neutral-300 font-medium">Iniciando câmera e decodificador...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-neutral-900/95 flex flex-col items-center justify-center text-white gap-3 p-6 text-center z-10">
              <AlertCircle className="w-10 h-10 text-status-danger" />
              <p className="text-xs font-semibold text-status-danger leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Alternative options: Upload photo or Manual Input */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 bg-canvas hover:bg-neutral-100 border border-border-neutral text-text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-brand-600" />
              <span>Foto / Galeria</span>
            </button>
          </div>

          {/* Manual Input Fallback */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Digitar código manualmente..."
              className="flex-1 px-3 py-2 bg-canvas border border-border-neutral rounded-xl text-text-primary text-xs font-mono focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-40 cursor-pointer shrink-0"
            >
              Inserir
            </button>
          </form>

          <p className="text-[11px] text-text-muted text-center leading-tight">
            Compatível com EAN-13, EAN-8, CODE-128, CODE-39, UPC e QR Code de produtos.
          </p>
        </div>
      </div>
    </div>
  );
}
