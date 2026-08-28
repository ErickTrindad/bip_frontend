import { useState, useTransition, useEffect } from 'react';
import { Mic, PenTool, X, RotateCcw, AlertTriangle, Sparkles, Zap } from 'lucide-react';
import { AudioRecorder } from './ai/AudioRecorder';
import { ActionReviewModal } from './ai/ActionReviewModal';
import { aiService } from '../services/aiService';
import { ApiError } from '../services/api';
import type { VoiceCommandResponse } from '../types/ai';

interface GlobalVoiceFabProps {
  onSuccess?: () => void;
}

export function GlobalVoiceFab({ onSuccess }: GlobalVoiceFabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [textPrompt, setTextPrompt] = useState<string>('');
  const [voiceResult, setVoiceResult] = useState<VoiceCommandResponse | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioFilename, setAudioFilename] = useState<string>('audio.webm');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const handleAudioReady = (_blob: Blob, base64: string, filename: string) => {
    setAudioBase64(base64);
    setAudioFilename(filename);
  };

  const handleProcessVoice = () => {
    const isText = mode === 'text';
    if (isText && !textPrompt.trim()) {
      setErrorMessage('Por favor, digite seu comando antes de processar.');
      return;
    }
    if (!isText && !audioBase64) {
      setErrorMessage('Por favor, grave sua voz antes de processar.');
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const payload: {
          audioBase64?: string;
          prompt?: string;
          filename?: string;
          autoExecute?: boolean;
        } = {
          autoExecute: false,
        };

        if (isText) {
          payload.prompt = textPrompt.trim();
        } else {
          payload.audioBase64 = audioBase64!;
          payload.filename = audioFilename;
        }

        const res = await aiService.voiceCommand(payload);

        setVoiceResult(res);
        setIsModalOpen(false);
        setIsReviewOpen(true);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Falha ao processar o comando.');
        }
      }
    });
  };

  const handleCloseVoiceModal = () => {
    setIsModalOpen(false);
    setAudioBase64(null);
    setTextPrompt('');
    setErrorMessage(null);
  };

  // Trava scroll quando o modal rápido estiver aberto
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  return (
    <>
      {/* Botão Flutuante (FAB) Fixo */}
      <button
        type="button"
        onClick={() => {
          setErrorMessage(null);
          setAudioBase64(null);
          setTextPrompt('');
          setIsModalOpen(true);
        }}
        className="fixed bottom-20 md:bottom-8 right-5 z-40 p-4 bg-brand-600 hover:bg-brand-700 text-white rounded-full shadow-2xl hover:shadow-brand-500/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-2 border-white/80 dark:border-neutral-900 group"
        title="Comando por voz ou texto"
        aria-label="Comando por voz ou texto"
      >
        <Mic className="w-6 h-6 animate-pulse" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs group-hover:ml-2 text-xs font-bold transition-all duration-300">
          Comando IA
        </span>
      </button>

      {/* Modal Rápido de Comando de IA (Voz ou Texto) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-card border border-border-neutral rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-text-primary">
                    Comando IA de Estoque
                  </h3>
                  <p className="text-xs text-text-muted">
                    Fale ou digite o que deseja movimentar ou alterar
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseVoiceModal}
                className="p-1.5 text-text-muted hover:text-text-primary rounded-xl hover:bg-canvas transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Seletor de Modo: Falar vs Escrever */}
            <div className="flex bg-canvas p-1 rounded-2xl border border-border-neutral gap-1">
              <button
                type="button"
                onClick={() => {
                  setMode('voice');
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'voice'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-card'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Falar (Microfone)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('text');
                  setErrorMessage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  mode === 'text'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-card'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Escrever Prompt</span>
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-status-danger-bg text-status-danger border border-red-200 rounded-2xl text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            <div className="bg-canvas/60 p-3 rounded-2xl border border-border-neutral text-xs text-text-muted">
              <span className="font-bold text-text-primary">Exemplos de comandos:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                <li>&quot;Vendi 3 caixas de leite&quot;</li>
                <li>&quot;Transferir 10 refrigerantes para a gôndola&quot;</li>
                <li>&quot;Muda o preço do arroz para 25 reais&quot;</li>
              </ul>
            </div>

            {mode === 'voice' ? (
              <AudioRecorder onAudioReady={handleAudioReady} disabled={isPending} />
            ) : (
              <div className="flex flex-col gap-1.5">
                <textarea
                  rows={3}
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleProcessVoice();
                    }
                  }}
                  placeholder="Digite o que aconteceu (ex: Vendi 2 águas no pix)..."
                  disabled={isPending}
                  className="w-full p-3 bg-canvas border border-border-neutral rounded-2xl text-xs text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none resize-none"
                  autoFocus
                />
                <span className="text-[10px] text-text-muted text-right">
                  Pressione Ctrl+Enter para confirmar
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCloseVoiceModal}
                disabled={isPending}
                className="flex-1 py-3 bg-canvas hover:bg-neutral-100 text-text-primary font-bold rounded-xl text-xs border border-border-neutral transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessVoice}
                disabled={isPending || (mode === 'text' ? !textPrompt.trim() : !audioBase64)}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                {isPending ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>{mode === 'text' ? 'Processar Prompt' : 'Confirmar Comando'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Revisão e Aplicação no Banco */}
      {voiceResult && (
        <ActionReviewModal
          voiceResult={voiceResult}
          isOpen={isReviewOpen}
          onClose={() => {
            setIsReviewOpen(false);
            setVoiceResult(null);
          }}
          onSuccess={(updatedResult) => {
            setVoiceResult(updatedResult);
            if (onSuccess) onSuccess();
          }}
        />
      )}
    </>
  );
}
