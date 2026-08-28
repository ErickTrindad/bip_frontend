import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import {
  Smartphone,
  AlertTriangle,
  RefreshCw,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Barcode,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { posSessionService } from '../services/posSessionService';
import { supabase } from '../lib/supabase';
import { playBeepSound } from '../lib/sound';
import type { SessionValidationResponse, RemoteBarcodeFeedbackPayload } from '../types/posSession';
import type { RealtimeChannel } from '@supabase/supabase-js';


export function RemoteScannerPage() {
  const [searchParams] = useSearchParams();

  const sessionId = searchParams.get('session');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionValidationResponse | null>(null);
  const [channelConnected, setChannelConnected] = useState<boolean>(false);

  // Estados do Scanner Mobile
  const [scannedCount, setScannedCount] = useState<number>(0);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<{
    status: 'FOUND' | 'NOT_FOUND' | 'SENDING';
    message: string;
    productName?: string;
    quantity?: number;
  } | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [scanFlash, setScanFlash] = useState<boolean>(false);
  const [errorFlash, setErrorFlash] = useState<boolean>(false);
  const [debugLogs, setDebugLogs] = useState<{time: string, msg: string}[]>([]);
  
  const addLog = useCallback((msg: string, data?: any) => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
    const fullMsg = data ? `${msg} ${JSON.stringify(data)}` : msg;
    console.log(`[Scanner DEBUG] ${fullMsg}`);
    setDebugLogs(prev => [{ time, msg: fullMsg }, ...prev].slice(0, 15));
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedTimeMapRef = useRef<Map<string, number>>(new Map());

  const validateSession = async () => {
    addLog('1. validateSession iniciado', { sessionId });
    if (!sessionId || !token) {
      addLog('Falha: sessionId ou token ausentes.');
      setError('Link de pareamento incompleto. Leia o QR Code novamente no computador.');
      setLoading(false);
      return;
    }
    try {
      addLog('2. Solicitando validação no backend...');
      const response = await posSessionService.validatePairingSession(sessionId!, token!);
      addLog('3. Resposta da validação', { valid: response.valid, status: response.status });
      
      if (!response.valid || response.status !== 'ACTIVE') {
        addLog('Sessão inválida ou inativa.');
        setError('Esta sessão de pareamento expirou ou já foi encerrada.');
        console.warn('[Scanner DEBUG] Sessão inválida ou inativa.');
        setError('Esta sessão de pareamento expirou ou já foi encerrada.');
        setLoading(false);
        return;
      }
      setSessionData(response);
      
      // Conecta ao canal Supabase Broadcast
      if (channelRef.current) {
        addLog('Removendo canal existente antes de recriar.');
        supabase.removeChannel(channelRef.current);
      }

      const channel = supabase.channel(response.channel, {
        config: {
          broadcast: { self: false, ack: true }, // Ativando ACK para garantir resposta do servidor
        },
      });
      addLog(`4. Inscrevendo no canal: ${response.channel}`);
      channel
        .on('broadcast', { event: 'barcode-feedback' }, (event) => {
          const payload = event.payload as RemoteBarcodeFeedbackPayload;
          addLog('<<< FEEDBACK RECEBIDO', { status: payload?.status, barcode: payload?.barcode });
          if (payload) {
            if (payload.status === 'NOT_FOUND') {
              setErrorFlash(true);
              setTimeout(() => setErrorFlash(false), 500);
              playBeepSound(350, 0.25);
              if (navigator.vibrate) {
                try {
                  navigator.vibrate([100, 50, 100]);
                } catch {}
              }
              setScanStatus({
                status: 'NOT_FOUND',
                message: payload.message || `Código "${payload.barcode}" não cadastrado`,
              });
            } else if (payload.status === 'FOUND') {
              setScanStatus({
                status: 'FOUND',
                productName: payload.productName,
                quantity: payload.quantity,
                message: `Adicionado ao carrinho (Qtd: ${payload.quantity || 1})`,
              });
            }
          }
        })
        .subscribe(async (status) => {
          addLog(`5. Status do canal mudou: ${status}`);
          if (status === 'SUBSCRIBED') {
            setChannelConnected(true);
            addLog('6. Enviando evento device-connected...');
            const sendStatus = await channel.send({
              type: 'broadcast',
              event: 'device-connected',
              payload: {
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
              },
            });
            addLog('7. device-connected enviado', sendStatus);
          }
        });

      channelRef.current = channel;
    } catch (err: unknown) {
      addLog('Erro ao validar sessão de pareamento', err);
      const msg = err instanceof Error ? err.message : 'Não foi possível validar a sessão com o servidor.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateSession();

    return () => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'device-disconnected',
          payload: { timestamp: Date.now() },
        });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, token]);

  // 2. Despacho do Código de Barras Detectado com Debounce Ágil (600ms)
  const handleBarcodeDetected = useCallback(async (barcode: string) => {
    addLog(`📸 LIDO PELA CAMERA: ${barcode}`);
    const trimmed = barcode.trim();
    if (!trimmed || trimmed.length < 3) {
      addLog('Código ignorado (curto)');
      return;
    }

    const now = Date.now();
    const lastSeen = lastScannedTimeMapRef.current.get(trimmed) || 0;

    // Debounce / Throttle ágil de 600ms para permitir bipar repetidas vezes o mesmo item rapidamente
    if (now - lastSeen < 600) {
      addLog('Ignorado por debounce');
      return;
    }

    lastScannedTimeMapRef.current.set(trimmed, now);

    // Feedback tátil imediato no celular
    if (navigator.vibrate) {
      try {
        navigator.vibrate([60]);
      } catch (e) {
        console.warn('Vibration API error:', e);
      }
    }

    // Feedback sonoro
    playBeepSound(1400, 0.08);

    // Flash visual na tela
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 200);
    setLastScannedBarcode(trimmed);
    setScannedCount((prev) => prev + 1);
    setScanStatus({
      status: 'SENDING',
      message: `Enviando ${trimmed}...`,
    });
    if (channelRef.current) {
      addLog(`🚀 Enviando barcode-scanned: ${trimmed}`);
      const sendStatus = await channelRef.current.send({
        type: 'broadcast',
        event: 'barcode-scanned',
        payload: {
          barcode: trimmed,
          scannedAt: now,
        },
      });
      addLog(`📡 Status do envio: ${sendStatus}`);
      
      if (sendStatus !== 'ok') {
        console.warn('[Scanner DEBUG] Falha no Supabase ao despachar a mensagem. Verifique a rede ou RLS.');
        setScanStatus({
          status: 'NOT_FOUND',
          message: 'Falha na rede ao enviar. Tente de novo.',
        });
      }
    } else {
      console.error('[Scanner DEBUG] channelRef.current está nulo! Celular desconectado do canal.');
    }
  }, []);
  // 3. Controle da Câmera & Leitura Contínua
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Detecta se a câmera possui suporte a lanterna (Torch)
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as { torch?: boolean } | undefined;
      setHasTorch(!!capabilities?.torch);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: unknown) {
      console.error('Erro ao acessar câmera do celular:', err);
      setError('Permissão de câmera negada ou câmera indisponível. Permita o acesso nas configurações do navegador.');
    }
  };

  // Alterna lanterna
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !torchEnabled;
      await (track as MediaStreamTrack & {
        applyConstraints: (c: { advanced?: Array<{ torch?: boolean }> }) => Promise<void>;
      }).applyConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setTorchEnabled(nextTorch);
    } catch (err) {
      console.warn('Erro ao alternar lanterna:', err);
    }
  };

  // Alterna câmera
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Inicializa a câmera quando a sessão for válida
  useEffect(() => {
    if (sessionData && !error) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [sessionData, facingMode]);

  // 4. Loop de Leitura de Frames com BarcodeDetector / ZXing
  useEffect(() => {
    if (!isCameraActive || !videoRef.current) return;

    const video = videoRef.current;
    let isProcessing = false;

    // Configura ZXing
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.ITF,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const zxingReader = new BrowserMultiFormatReader(hints);
    zxingReaderRef.current = zxingReader;

    const hasNativeBarcodeDetector = 'BarcodeDetector' in window;
    let nativeDetector: BarcodeDetector | null = null;
    if (hasNativeBarcodeDetector) {
      try {
        nativeDetector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code', 'itf'],
        });
      } catch {
        nativeDetector = null;
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanLoop = async () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && !isProcessing) {
        isProcessing = true;

        try {
          // 1. Tenta BarcodeDetector nativo super-rápido (se suportado no Chrome Mobile)
          if (nativeDetector) {
            const detected = await nativeDetector.detect(video).catch(() => []);
            if (detected && detected.length > 0 && detected[0].rawValue) {
              handleBarcodeDetected(detected[0].rawValue);
              isProcessing = false;
              animationFrameRef.current = requestAnimationFrame(scanLoop);
              return;
            }
          }

          // 2. Fallback com ZXing via frame canvas
          if (ctx) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Leitura na imagem inteira
            try {
              const result = zxingReader.decodeFromCanvas(canvas);
              if (result && result.getText()) {
                handleBarcodeDetected(result.getText());
              }
            } catch {
              // Ignore not found frame error
            }
          }
        } catch {
          // Frame skip
        } finally {
          isProcessing = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(scanLoop);
    };

    animationFrameRef.current = requestAnimationFrame(scanLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isCameraActive, handleBarcodeDetected]);

  return (
    <div className="fixed inset-0 bg-neutral-950 text-white flex flex-col select-none overflow-hidden touch-none font-sans">
      {/* Flash Visual ao Bipar */}
      {scanFlash && (
        <div className="absolute inset-0 bg-emerald-500/40 pointer-events-none z-50 transition-opacity duration-200" />
      )}
      {/* Flash Visual de Erro (Não encontrado) */}
      {errorFlash && (
        <div className="absolute inset-0 bg-red-600/50 pointer-events-none z-50 transition-opacity duration-300" />
      )}
      {/* Header Superior Mobile */}
      <header className="p-3 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-brand-600 rounded-xl text-white">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5 lowercase">
              bip • bipador remoto
            </h1>
            {sessionData && (
              <p className="text-[10px] text-neutral-400 truncate max-w-[200px]">
                {sessionData.tenant.name} • {sessionData.operator.name}
              </p>
            )}
          </div>
        </div>

        {/* Status Realtime */}
        <div className="flex items-center gap-1.5">
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
              channelConnected
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50'
                : 'bg-amber-950/80 text-amber-400 border-amber-700/50'
            }`}
          >
            {channelConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Pareado</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                <span>Conectando</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Área Central / Visor da Câmera */}
      <main className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="text-center space-y-3 p-6 z-20">
            <RefreshCw className="w-10 h-10 animate-spin text-brand-500 mx-auto" />
            <p className="text-sm font-semibold text-neutral-300">Conectando ao checkout do desktop...</p>
          </div>
        ) : error ? (
          <div className="text-center space-y-4 p-6 max-w-xs z-20">
            <div className="w-14 h-14 bg-red-950/80 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-700/50">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sessão Indisponível</h2>
              <p className="text-xs text-neutral-400 mt-1">{error}</p>
            </div>
            <button
              onClick={validateSession}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {/* Tag de Vídeo com o Stream da Câmera */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />
            {/* Máscara de Alinhamento do Código de Barras (Overlay de Mira) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-full max-w-xs h-48 border-2 border-brand-500/80 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* Linha vermelha central de varredura */}
                <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />

                {/* Cantos decorativos */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-white rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-white rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-white rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-white rounded-br-lg" />

                <div className="absolute -bottom-7 left-0 right-0 text-center">
                  <span className="text-[11px] font-semibold text-white/80 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                    Centralize o código de barras
                  </span>
                </div>
              </div>
            </div>

            {/* Botões Flutuantes de Controle da Câmera */}
            <div className="absolute right-4 top-4 flex flex-col gap-2.5 z-20">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-3 rounded-2xl backdrop-blur-md border transition-all cursor-pointer shadow-lg ${
                    torchEnabled
                      ? 'bg-amber-500 text-black border-amber-400'
                      : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                  title={torchEnabled ? 'Desligar Lanterna' : 'Ligar Lanterna'}
                >
                  {torchEnabled ? <FlashlightOff className="w-5 h-5" /> : <Flashlight className="w-5 h-5" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-2xl backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg"
                title="Alternar Câmera"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Footer / Card Inferior com Resumo das Leituras e Feedback em Tempo Real */}
      <footer className="bg-neutral-900 border-t border-neutral-800 z-30 shrink-0 flex flex-col relative">
        {/* Painel de Debug Overlay (iOS Terminal) */}
        {debugLogs.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 bg-black/85 max-h-48 overflow-y-auto p-2 text-[10px] font-mono border-t border-neutral-800 pointer-events-auto shadow-inner flex flex-col gap-1 z-40">
            <div className="text-emerald-500 font-bold mb-1 flex items-center justify-between sticky top-0 bg-black/90 pb-1 backdrop-blur-sm">
              <span>Terminal de Debug (iOS)</span>
              <button 
                onClick={() => setDebugLogs([])} 
                className="text-neutral-400 hover:text-white px-2 py-0.5 bg-neutral-800 rounded border border-neutral-700"
              >
                Limpar
              </button>
            </div>
            <div className="flex flex-col-reverse gap-1">
              {debugLogs.map((log, i) => (
                <div key={i} className="text-emerald-400 leading-tight">
                  <span className="text-neutral-500 mr-1">[{log.time}]</span>
                  {log.msg}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-3.5 space-y-2 z-50 bg-neutral-900">
          {/* Banner de Feedback do Produto Escaneado */}
          {scanStatus && (
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs animate-fade-in ${
                scanStatus.status === 'NOT_FOUND'
                  ? 'bg-red-950/80 border-red-800 text-red-200'
                  : scanStatus.status === 'FOUND'
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                {scanStatus.status === 'NOT_FOUND' ? (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div className="truncate">
                  {scanStatus.productName && (
                    <p className="font-bold text-white text-xs truncate">{scanStatus.productName}</p>
                  )}
                  <p className="text-[11px] opacity-90 truncate">{scanStatus.message}</p>
                </div>
              </div>
              {scanStatus.quantity != null && (
                <span className="px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-[11px] shrink-0">
                  {scanStatus.quantity} un
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-brand-900/60 text-brand-400 rounded-lg">
                <Barcode className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] text-neutral-400 block font-bold uppercase tracking-wider">
                  Total Bipado no PDV
                </span>
                <strong className="text-base text-white font-mono">
                  {scannedCount} <span className="text-xs font-normal text-neutral-400">leituras</span>
                </strong>
              </div>
            </div>

            {lastScannedBarcode && (
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 font-bold uppercase block">
                  Último Código
                </span>
                <span className="text-xs font-mono font-bold text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                  {lastScannedBarcode}
                </span>
              </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default RemoteScannerPage;
