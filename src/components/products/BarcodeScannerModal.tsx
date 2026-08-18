import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, X, RefreshCw, AlertCircle, Upload, ShieldAlert, RotateCw } from 'lucide-react';

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
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRunningRef = useRef(false);

  const cleanupScanner = async () => {
    if (scannerRef.current) {
      if (isRunningRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err) {
          console.warn('Erro ao parar scanner:', err);
        }
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

  const startScanner = async () => {
    setError(null);
    setIsPermissionError(false);
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

      // Configuração de câmera traseira (html5-qrcode aceita exatamente 1 chave: facingMode ou deviceId)
      const cameraConfig = { facingMode: 'environment' };

      await html5QrCode.start(
        cameraConfig,
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const width = Math.min(Math.floor(viewfinderWidth * 0.9), 360);
            const height = Math.min(Math.floor(viewfinderHeight * 0.35), 150);
            return { width, height };
          },
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
      const isNotAllowed =
        err instanceof Error &&
        (err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.message.toLowerCase().includes('permission'));
      setIsPermissionError(Boolean(isNotAllowed));
      setError(
        'Não foi possível inicializar a câmera (permissão negada ou dispositivo sem suporte). Você pode fazer upload de uma foto ou digitar o código.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupScanner();
      return;
    }

    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen, onClose, onScan]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsStarting(true);
      setError(null);

      const imageBitmap = await createImageBitmap(file);
      const variations: (ImageBitmap | HTMLCanvasElement)[] = [imageBitmap];

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (ctx) {
        // Variação 2: Crop de 50% no centro (Simula o qrbox da câmera)
        const crop1Canvas = document.createElement('canvas');
        const crop1Ctx = crop1Canvas.getContext('2d');
        if (crop1Ctx) {
          const cw = imageBitmap.width * 0.5;
          const ch = imageBitmap.height * 0.5;
          const cx = (imageBitmap.width - cw) / 2;
          const cy = (imageBitmap.height - ch) / 2;
          crop1Canvas.width = cw;
          crop1Canvas.height = ch;
          crop1Ctx.drawImage(imageBitmap, cx, cy, cw, ch, 0, 0, cw, ch);
          variations.push(crop1Canvas);
        }

        // Variação 3: Crop mais fechado (30% do centro)
        const crop2Canvas = document.createElement('canvas');
        const crop2Ctx = crop2Canvas.getContext('2d');
        if (crop2Ctx) {
          const cw2 = imageBitmap.width * 0.3;
          const ch2 = imageBitmap.height * 0.3;
          const cx2 = (imageBitmap.width - cw2) / 2;
          const cy2 = (imageBitmap.height - ch2) / 2;
          crop2Canvas.width = cw2;
          crop2Canvas.height = ch2;
          crop2Ctx.drawImage(imageBitmap, cx2, cy2, cw2, ch2, 0, 0, cw2, ch2);
          variations.push(crop2Canvas);
        }

        // Variação 4: Redimensionado max 1024px (evita esmagamento de barras finas no ZXing)
        const scaleCanvas = document.createElement('canvas');
        const scaleCtx = scaleCanvas.getContext('2d');
        if (scaleCtx) {
          const scale = Math.min(1024 / imageBitmap.width, 1024 / imageBitmap.height);
          if (scale < 1) {
            scaleCanvas.width = imageBitmap.width * scale;
            scaleCanvas.height = imageBitmap.height * scale;
            scaleCtx.drawImage(imageBitmap, 0, 0, scaleCanvas.width, scaleCanvas.height);
            variations.push(scaleCanvas);
          }
        }
      }

      // Fase 1: Testar todas as variações no BarcodeDetector Nativo (super rápido)
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const barcodeDetector = new window.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'code_93', 'upc_a', 'upc_e', 'itf', 'qr_code'],
          });

          for (const variation of variations) {
            const barcodes = await barcodeDetector.detect(variation);
            if (barcodes && barcodes.length > 0) {
              const decodedText = barcodes[0].rawValue.trim();
              if (decodedText) {
                onScan(decodedText);
                cleanupScanner();
                onClose();
                return;
              }
            }
          }
        } catch (detectorErr) {
          console.warn('BarcodeDetector nativo falhou em alguma variação', detectorErr);
        }
      }

      // Fase 2: Fallback para o @zxing/browser
      try {
        const hints = new Map<DecodeHintType, any>();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.CODE_93,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.ITF,
          BarcodeFormat.QR_CODE
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const zxingReader = new BrowserMultiFormatReader(hints);

        for (const variation of variations) {
          try {
            let result;
            if (variation instanceof HTMLCanvasElement) {
              result = zxingReader.decodeFromCanvas(variation);
            } else {
              const tmpCanvas = document.createElement('canvas');
              const tmpCtx = tmpCanvas.getContext('2d');
              if (tmpCtx) {
                tmpCanvas.width = variation.width;
                tmpCanvas.height = variation.height;
                tmpCtx.drawImage(variation, 0, 0);
                result = zxingReader.decodeFromCanvas(tmpCanvas);
              }
            }
            
            if (result) {
              const text = result.getText().trim();
              if (text) {
                onScan(text);
                cleanupScanner();
                onClose();
                return;
              }
            }
          } catch (e) {
            // ignora e vai pra próxima variação
          }
        }
      } catch (err) {
        console.warn('Erro fatal no ZXing Fallback:', err);
      }

      // Se rodou todas as variações e não achou
      setError('Código de barras perdido no fundo. Tente recortar a imagem antes de enviar ou use a câmera.');
    } catch (err: unknown) {
      console.warn('Erro ao processar arquivo:', err);
      setError('Erro ao ler o arquivo. Tente outra foto ou digite manualmente.');
    } finally {
      setIsStarting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
        <div className="relative w-full aspect-[4/3] bg-neutral-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-border-neutral">
          <div id="barcode-scanner-viewport" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-contain" />
          {isStarting && (
            <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center text-white gap-3 p-4 z-10">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-xs text-neutral-300 font-medium">Iniciando câmera e decodificador...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-neutral-900/95 flex flex-col items-center justify-center text-white gap-3 p-6 text-center z-10">
              {isPermissionError ? (
                <ShieldAlert className="w-10 h-10 text-status-warning" />
              ) : (
                <AlertCircle className="w-10 h-10 text-status-danger" />
              )}
              <p className="text-xs font-semibold text-neutral-200 leading-relaxed max-w-[280px]">
                {error}
              </p>
              <button
                type="button"
                onClick={() => startScanner()}
                className="mt-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                {isPermissionError ? 'Solicitar / Autorizar Câmera' : 'Tentar Novamente'}
              </button>
              {isPermissionError && (
                <span className="text-[10px] text-neutral-400">
                  Dica: Se o navegador não exibir o pop-up, clique no ícone de cadeado/permissões ao lado da URL.
                </span>
              )}
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
