import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Camera, X, RefreshCw, AlertCircle, Upload, ShieldAlert, RotateCw, Sparkles } from 'lucide-react';

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
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imageCaptureRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    imageCaptureRef.current = null;
  };

  const startCamera = async () => {
    setError(null);
    setIsPermissionError(false);
    setIsStarting(true);
    try {
      stopMediaStream();

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          // @ts-ignore - suporte para foco contínuo em dispositivos móveis
          advanced: [{ focusMode: 'continuous' }],
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && 'ImageCapture' in window) {
        try {
          // @ts-ignore
          imageCaptureRef.current = new window.ImageCapture(videoTrack);
        } catch {
          imageCaptureRef.current = null;
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.error('Erro ao acessar a câmera:', err);
      const isNotAllowed =
        err instanceof Error &&
        (err.name === 'NotAllowedError' ||
          err.name === 'PermissionDeniedError' ||
          err.message.toLowerCase().includes('permission'));
      setIsPermissionError(Boolean(isNotAllowed));
      setError(
        'Não foi possível inicializar a câmera (permissão negada ou dispositivo sem suporte). Você pode tirar foto com a galeria ou digitar o código.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopMediaStream();
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopMediaStream();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      stopMediaStream();
    };
  }, [isOpen, onClose]);

  // Processa uma imagem (ImageBitmap / Blob / File) passando por BarcodeDetector Nativo + ZXing com multi-crops
  const processImageSource = async (source: Blob | File | ImageBitmap) => {
    const imageBitmap =
      source instanceof ImageBitmap ? source : await createImageBitmap(source);
    const variations: (ImageBitmap | HTMLCanvasElement)[] = [imageBitmap];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      // Variação 2: Crop de 50% central (foco no código)
      const crop1Canvas = document.createElement('canvas');
      const crop1Ctx = crop1Canvas.getContext('2d');
      if (crop1Ctx) {
        const cw = imageBitmap.width * 0.6;
        const ch = imageBitmap.height * 0.45;
        const cx = (imageBitmap.width - cw) / 2;
        const cy = (imageBitmap.height - ch) / 2;
        crop1Canvas.width = cw;
        crop1Canvas.height = ch;
        crop1Ctx.drawImage(imageBitmap, cx, cy, cw, ch, 0, 0, cw, ch);
        variations.push(crop1Canvas);
      }

      // Variação 3: Crop central horizontal mais estreito (ideal para código de barras longo)
      const crop2Canvas = document.createElement('canvas');
      const crop2Ctx = crop2Canvas.getContext('2d');
      if (crop2Ctx) {
        const cw2 = imageBitmap.width * 0.8;
        const ch2 = imageBitmap.height * 0.25;
        const cx2 = (imageBitmap.width - cw2) / 2;
        const cy2 = (imageBitmap.height - ch2) / 2;
        crop2Canvas.width = cw2;
        crop2Canvas.height = ch2;
        crop2Ctx.drawImage(imageBitmap, cx2, cy2, cw2, ch2, 0, 0, cw2, ch2);
        variations.push(crop2Canvas);
      }

      // Variação 4: Redimensionado max 1280px para otimização de contraste
      const scaleCanvas = document.createElement('canvas');
      const scaleCtx = scaleCanvas.getContext('2d');
      if (scaleCtx) {
        const scale = Math.min(1280 / imageBitmap.width, 1280 / imageBitmap.height);
        if (scale < 1) {
          scaleCanvas.width = imageBitmap.width * scale;
          scaleCanvas.height = imageBitmap.height * scale;
          scaleCtx.drawImage(imageBitmap, 0, 0, scaleCanvas.width, scaleCanvas.height);
          variations.push(scaleCanvas);
        }
      }
    }

    // Fase 1: BarcodeDetector Nativo (alta performance e precisão com imagem nítida)
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
              return decodedText;
            }
          }
        }
      } catch (detectorErr) {
        console.warn('BarcodeDetector nativo não identificou nas variações', detectorErr);
      }
    }

    // Fase 2: ZXing MultiFormat Reader com TRY_HARDER
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
        BarcodeFormat.QR_CODE,
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
              return text;
            }
          }
        } catch {
          // continua nas próximas variações
        }
      }
    } catch (err) {
      console.warn('Erro no processamento ZXing:', err);
    }

    return null;
  };

  // Disparo do botão "Escanear": captura foto de alta resolução e processa
  const handleCaptureAndScan = async () => {
    if (isCapturing || isStarting) return;

    try {
      setIsCapturing(true);
      setError(null);

      let imageBlobOrBitmap: Blob | ImageBitmap | null = null;

      // Opção A: ImageCapture.takePhoto() (resolução nativa máxima com foco do sensor)
      if (imageCaptureRef.current?.takePhoto) {
        try {
          const blob = await imageCaptureRef.current.takePhoto({
            imageWidth: 1920,
            imageHeight: 1080,
          });
          imageBlobOrBitmap = blob;
        } catch (captureErr) {
          console.warn('ImageCapture.takePhoto falhou, usando frame do vídeo', captureErr);
        }
      }

      // Opção B: Captura do frame atual do elemento <video>
      if (!imageBlobOrBitmap && videoRef.current && videoRef.current.videoWidth > 0) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          imageBlobOrBitmap = await createImageBitmap(canvas);
        }
      }

      if (!imageBlobOrBitmap) {
        throw new Error('Não foi possível capturar a imagem da câmera.');
      }

      const barcode = await processImageSource(imageBlobOrBitmap);
      if (barcode) {
        onScan(barcode);
        stopMediaStream();
        onClose();
      } else {
        setError('Código não identificado. Aproxime mais a câmera, mantenha o código reto e com boa iluminação.');
      }
    } catch (err: unknown) {
      console.error('Erro ao escanear foto capturada:', err);
      setError('Erro ao processar captura. Tente novamente ou faça upload de uma foto.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCapturing(true);
      setError(null);

      const barcode = await processImageSource(file);
      if (barcode) {
        onScan(barcode);
        stopMediaStream();
        onClose();
      } else {
        setError('Código de barras não encontrado na imagem selecionada. Tente aproximar ou recortar a foto.');
      }
    } catch (err: unknown) {
      console.warn('Erro ao processar arquivo:', err);
      setError('Erro ao ler a imagem. Tente outra foto ou digite o código manualmente.');
    } finally {
      setIsCapturing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      stopMediaStream();
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
              stopMediaStream();
              onClose();
            }}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera / Viewfinder Container */}
        <div className="relative w-full aspect-[4/3] bg-neutral-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center border border-border-neutral shadow-inner">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />

          {/* Overlay Mira / Guia de Enquadramento */}
          {!isStarting && !error && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-[85%] h-[38%] border-2 border-brand-500/80 bg-brand-500/5 rounded-xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                {/* Cantoneiras estilizadas */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-brand-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-brand-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-brand-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-brand-400 rounded-br" />
                
                {/* Linha vermelha guia de mira */}
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/75 shadow-[0_0_8px_rgba(239,68,68,0.8)] -translate-y-1/2" />
              </div>
              <span className="mt-3 text-[11px] font-medium text-white/90 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm">
                Posicione o código no retângulo e clique em Escanear
              </span>
            </div>
          )}

          {/* Loading de Inicialização da Câmera */}
          {isStarting && (
            <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center text-white gap-3 p-4 z-10">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-xs text-neutral-300 font-medium">Iniciando câmera...</p>
            </div>
          )}

          {/* Loading de Leitura / Processamento da Foto */}
          {isCapturing && (
            <div className="absolute inset-0 bg-neutral-900/85 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3 p-4 z-20 animate-fade-in">
              <RefreshCw className="w-9 h-9 animate-spin text-brand-500" />
              <div className="text-center">
                <p className="text-sm font-bold text-white">Processando código...</p>
                <p className="text-xs text-neutral-300">Decodificando em alta resolução</p>
              </div>
            </div>
          )}

          {/* Mensagem de Erro com Ação */}
          {error && !isCapturing && (
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
                onClick={() => startCamera()}
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

        {/* Botão de Ação Principal: ESCANEAR (Dispara Foto em Alta Resolução) */}
        <div className="mt-3">
          <button
            type="button"
            onClick={handleCaptureAndScan}
            disabled={isCapturing || isStarting}
            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-600/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isCapturing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Identificando Código...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Escanear Código de Barras</span>
              </>
            )}
          </button>
        </div>

        {/* Opções Alternativas: Foto da Galeria ou Entrada Manual */}
        <div className="mt-3 space-y-2.5">
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
              disabled={isCapturing}
              className="flex-1 py-2 px-3 bg-canvas hover:bg-neutral-100 border border-border-neutral text-text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-brand-600" />
              <span>Carregar Foto / Arquivo</span>
            </button>
          </div>

          {/* Digitação manual do código */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ou digite o código manualmente..."
              className="flex-1 px-3 py-2 bg-canvas border border-border-neutral rounded-xl text-text-primary text-xs font-mono focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || isCapturing}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-40 cursor-pointer shrink-0"
            >
              Inserir
            </button>
          </form>

          <p className="text-[10.5px] text-text-muted text-center leading-tight">
            Compatível com EAN-13, EAN-8, CODE-128, CODE-39, UPC e QR Code.
          </p>
        </div>
      </div>
    </div>
  );
}
