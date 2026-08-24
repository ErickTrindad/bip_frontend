import { useState, useTransition } from 'react';
import {
  Mic,
  MessageSquare,
  Bot,
  Play,
  RotateCcw,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { aiService } from '../services/aiService';
import { ApiError } from '../services/api';
import { AudioRecorder } from '../components/ai/AudioRecorder';
import { AudioUploader } from '../components/ai/AudioUploader';
import { ActionPreviewCard } from '../components/ai/ActionPreviewCard';
import { ActionReviewModal } from '../components/ai/ActionReviewModal';
import { FormattedAiMessage, cleanAiResponse } from '../components/ai/FormattedAiMessage';
import type {
  ChatPromptResponse,
  VoiceCommandResponse,
} from '../types/ai';

type TabType = 'voice-command' | 'chat';

export function AiPage() {
  const [activeTab, setActiveTab] = useState<TabType>('voice-command');
  const [isPending, startTransition] = useTransition();

  // Estados de Voz / Áudio
  const [audioInputMode, setAudioInputMode] = useState<'record' | 'upload'>('record');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioFilename, setAudioFilename] = useState<string>('audio.webm');

  // Estados de Comando de Voz e Configurações Avançadas
  const [autoExecute, setAutoExecute] = useState<boolean>(false);
  const [voiceSystemPrompt, setVoiceSystemPrompt] = useState<string>('');
  const [showAdvancedVoiceSettings, setShowAdvancedVoiceSettings] = useState<boolean>(false);
  const [voiceResult, setVoiceResult] = useState<VoiceCommandResponse | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Estados do Consultor Virtual
  const [chatPromptText, setChatPromptText] = useState<string>('');
  const [chatResult, setChatResult] = useState<ChatPromptResponse | null>(null);

  // Erros e Copiado
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  // Callbacks de Áudio
  const handleAudioReady = (_blob: Blob, base64: string, filename: string) => {
    setAudioBase64(base64);
    setAudioFilename(filename);
  };

  const handleFileSelect = (file: File) => {
    setAudioFilename(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = (reader.result as string).split(',')[1];
      setAudioBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileClear = () => {
    setAudioBase64(null);
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submissão de Transcrição

  // Submissão de Comando de Voz
  const handleVoiceCommand = () => {
    setErrorMessage(null);
    setVoiceResult(null);

    if (!audioBase64) {
      setErrorMessage('Grave um áudio ou envie um arquivo de comando de voz.');
      return;
    }

    startTransition(async () => {
      try {
        const res = await aiService.voiceCommand({
          audioBase64,
          filename: audioFilename,
          systemPrompt: voiceSystemPrompt || undefined,
          autoExecute,
        });
        setVoiceResult(res);
        if (!autoExecute) {
          setIsReviewModalOpen(true);
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Falha ao interpretar comando de voz.');
        }
      }
    });
  };

  // Submissão de Chat / Prompt
  const handleChatPrompt = () => {
    if (!chatPromptText.trim()) return;

    setErrorMessage(null);
    setChatResult(null);

    startTransition(async () => {
      try {
        const res = await aiService.chatPrompt({
          prompt: chatPromptText,
          systemPrompt:
            'Você é o consultor especialista de gestão de estoque e varejo da plataforma GO PME. Não inclua blocos de raciocínio interno (<think>). Dê respostas diretas, estruturadas, práticas e focadas na operação diária do lojista.',
        });
        setChatResult(res);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Falha ao executar consulta com o modelo de IA.');
        }
      }
    });
  };

  return (
    <div className="w-full flex flex-col gap-6">
        {/* Banner Informativo */}
        <div className="bg-gradient-to-r from-brand-50 to-orange-50/30 border border-brand-100 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-card text-brand-600 rounded-xl shadow-xs border border-brand-100">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Fale o que aconteceu na loja
              </h2>
              <p className="text-xs text-text-muted mt-0.5 max-w-2xl">
                Grave um comando como <em>&quot;Vendi 2 leites&quot;</em> ou <em>&quot;Mudei o preço do refrigerante para 8 reais&quot;</em> e o sistema atualiza o estoque para você.
              </p>
            </div>
          </div>
        </div>

        {/* Mensagem de Erro Global */}
        {errorMessage && (
          <div className="flex items-start gap-2.5 p-3.5 bg-status-danger-bg text-status-danger border border-red-200 rounded-2xl text-xs font-medium animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>Erro:</strong> {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-text-muted hover:text-text-primary cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-border-neutral pb-2">
          <button
            onClick={() => {
              setActiveTab('voice-command');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'voice-command'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-card'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Falar comando</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('chat');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-card'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Tirar dúvida sobre estoque</span>
          </button>
        </div>

        {/* CONTEÚDO TAB 1: COMANDO DE VOZ OPERACIONAL */}
        {activeTab === 'voice-command' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Gravação Direta */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 md:p-6 shadow-xs flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Mic className="w-4 h-4 text-brand-600" />
                    Gravador de Comando
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedVoiceSettings(!showAdvancedVoiceSettings)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-canvas rounded-lg border border-border-neutral transition-colors cursor-pointer"
                    title="Configurações opcionais"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium">Configurações</span>
                    {showAdvancedVoiceSettings ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Seletor de arquivo oculto ou exibido apenas sob configurações */}
                {showAdvancedVoiceSettings && (
                  <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex flex-col gap-3 animate-fadeIn text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-primary">Modo de envio do áudio:</span>
                      <div className="flex bg-card p-0.5 rounded-lg border border-border-neutral text-[11px]">
                        <button
                          type="button"
                          onClick={() => setAudioInputMode('record')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            audioInputMode === 'record'
                              ? 'bg-brand-50 text-brand-700'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          Microfone
                        </button>
                        <button
                          type="button"
                          onClick={() => setAudioInputMode('upload')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                            audioInputMode === 'upload'
                              ? 'bg-brand-50 text-brand-700'
                              : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          Arquivo de áudio
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">
                        Instrução extra de contexto (Opcional)
                      </label>
                      <input
                        type="text"
                        value={voiceSystemPrompt}
                        onChange={(e) => setVoiceSystemPrompt(e.target.value)}
                        placeholder="Ex: Priorizar nomes de bebidas e laticínios"
                        className="w-full px-3 py-2 text-xs bg-card border border-border-neutral rounded-xl focus:border-brand-500 focus:outline-none"
                      />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={autoExecute}
                        onChange={(e) => setAutoExecute(e.target.checked)}
                        className="w-4 h-4 text-brand-600 rounded border-border-neutral focus:ring-brand-500 cursor-pointer"
                      />
                      <span className="text-xs text-text-primary">
                        Atualizar estoque automaticamente sem pedir confirmação prévia
                      </span>
                    </label>
                  </div>
                )}

                {audioInputMode === 'record' ? (
                  <AudioRecorder onAudioReady={handleAudioReady} disabled={isPending} />
                ) : (
                  <AudioUploader
                    onFileSelect={handleFileSelect}
                    onFileClear={handleFileClear}
                    disabled={isPending}
                  />
                )}

                <button
                  type="button"
                  onClick={handleVoiceCommand}
                  disabled={isPending || !audioBase64}
                  className="w-full py-4 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <RotateCcw className="w-5 h-5 animate-spin" />
                      <span>Processando seu comando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Processar comando falado</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Coluna Direita: Resultado do Comando */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 shadow-xs flex flex-col gap-4 min-h-[380px]">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-600" />
                  Confirmação do Comando
                </h3>

                {!voiceResult && !isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-muted">
                    <Mic className="w-10 h-10 text-neutral-300 mb-2" />
                    <p className="text-xs font-medium">Nenhum comando processado ainda.</p>
                    <p className="text-[11px] text-text-muted max-w-xs mt-1">
                      Grave sua voz ao lado e clique em &quot;Processar comando falado&quot;.
                    </p>
                  </div>
                )}

                {isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-brand-600 gap-3">
                    <RotateCcw className="w-8 h-8 animate-spin" />
                    <div className="text-xs font-bold">Identificando produtos e estoque...</div>
                  </div>
                )}

                {voiceResult && !isPending && (
                  <div className="animate-fadeIn">
                    <ActionPreviewCard
                      voiceResult={voiceResult}
                      onApply={() => setIsReviewModalOpen(true)}
                      isApplying={isPending}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* CONTEÚDO TAB 3: CHAT E INFERÊNCIA LLAMA 3.3 */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-brand-600" />
                  Tire Dúvidas sobre seu Estoque e Negócio
                </h3>

                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1">
                    O que você gostaria de perguntar ou consultar?
                  </label>
                  <textarea
                    rows={6}
                    value={chatPromptText}
                    onChange={(e) => setChatPromptText(e.target.value)}
                    placeholder="Ex: Como posso organizar melhor meus produtos perecíveis para não perder validade?"
                    className="w-full px-3.5 py-2.5 text-xs bg-canvas border border-border-neutral rounded-xl focus:border-brand-500 focus:outline-none resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleChatPrompt}
                  disabled={isPending || !chatPromptText.trim()}
                  className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
                >
                  {isPending ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Buscando melhor orientação...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Enviar Pergunta</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 shadow-xs flex flex-col gap-4 min-h-[380px]">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-600" />
                  Orientação do Consultor
                </h3>

                {!chatResult && !isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-muted">
                    <Bot className="w-10 h-10 text-neutral-300 mb-2" />
                    <p className="text-xs font-medium">Faça uma pergunta ao lado para receber orientações práticas.</p>
                  </div>
                )}

                {isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-brand-600 gap-3">
                    <RotateCcw className="w-8 h-8 animate-spin" />
                    <div className="text-xs font-bold">Analisando sua pergunta...</div>
                  </div>
                )}

                {chatResult && !isPending && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="p-4 bg-canvas border border-border-neutral rounded-2xl">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-neutral/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Orientação Prática
                        </span>
                        <button
                          onClick={() => copyToClipboard(cleanAiResponse(chatResult.result))}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-600 font-bold cursor-pointer"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                      <FormattedAiMessage content={chatResult.result} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      {/* Modal Interativo de Revisão de Alterações Multi-Produtos */}
      {voiceResult && (
        <ActionReviewModal
          voiceResult={voiceResult}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={(updatedResult: VoiceCommandResponse) => {
            setVoiceResult(updatedResult);
          }}
        />
      )}
    </div>
  );
}
