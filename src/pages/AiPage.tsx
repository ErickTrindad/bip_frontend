import { useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Mic,
  FileAudio,
  MessageSquare,
  Bot,
  Play,
  RotateCcw,
  AlertTriangle,
  Package,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { aiService } from '../services/aiService';
import { ApiError } from '../services/api';
import { AudioRecorder } from '../components/ai/AudioRecorder';
import { AudioUploader } from '../components/ai/AudioUploader';
import { ActionPreviewCard } from '../components/ai/ActionPreviewCard';
import { ActionReviewModal } from '../components/ai/ActionReviewModal';
import type {
  TranscribeResponse,
  ChatPromptResponse,
  VoiceCommandResponse,
} from '../types/ai';

type TabType = 'voice-command' | 'transcribe' | 'chat';

export function AiPage() {
  const { tenant, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('voice-command');
  const [isPending, startTransition] = useTransition();

  // Estados de Voz / Áudio
  const [audioInputMode, setAudioInputMode] = useState<'record' | 'upload'>('record');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFilename, setAudioFilename] = useState<string>('audio.webm');

  // Estados de Transcrição
  const [transcribeLanguage, setTranscribeLanguage] = useState<string>('pt');
  const [transcribePrompt, setTranscribePrompt] = useState<string>('');
  const [transcribeResult, setTranscribeResult] = useState<TranscribeResponse | null>(null);

  // Estados de Comando de Voz
  const [autoExecute, setAutoExecute] = useState<boolean>(false);
  const [voiceSystemPrompt, setVoiceSystemPrompt] = useState<string>('');
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
    setAudioFile(null);
  };

  const handleFileSelect = (file: File) => {
    setAudioFile(file);
    setAudioFilename(file.name);
    // Converte para base64 para caso use o modo JSON
    const reader = new FileReader();
    reader.onloadend = () => {
      const b64 = (reader.result as string).split(',')[1];
      setAudioBase64(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileClear = () => {
    setAudioFile(null);
    setAudioBase64(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Submissão de Transcrição
  const handleTranscribe = () => {
    setErrorMessage(null);
    setTranscribeResult(null);

    startTransition(async () => {
      try {
        if (audioInputMode === 'upload' && audioFile) {
          const res = await aiService.transcribeUpload(audioFile, {
            language: transcribeLanguage,
            prompt: transcribePrompt || undefined,
            filename: audioFilename,
          });
          setTranscribeResult(res);
        } else if (audioBase64) {
          const res = await aiService.transcribeBase64({
            audioBase64,
            filename: audioFilename,
            language: transcribeLanguage,
            prompt: transcribePrompt || undefined,
          });
          setTranscribeResult(res);
        } else {
          setErrorMessage('Grave um áudio ou selecione um arquivo antes de transcrever.');
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Falha ao processar a transcrição.');
        }
      }
    });
  };

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
          systemPrompt: 'Você é o consultor especialista de gestão de estoque e varejo da plataforma GO PME. Dê respostas claras, práticas e focadas na operação do lojista.',
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
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col antialiased">
      {/* Header Superior */}
      <header className="w-full bg-card border-b border-border-neutral px-4 md:px-8 py-4 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-brand-600 tracking-tight flex items-center gap-2">
              Assistente Inteligente GO PME
            </h1>
            <p className="text-xs text-text-muted">
              {tenant ? `${tenant.name} (${tenant.category})` : 'Comandos de Voz e Gestão Automática'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/products')}
            className="px-3.5 py-2 text-xs font-bold text-text-primary bg-card hover:bg-neutral-100 border border-border-neutral rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Painel de Produtos</span>
          </button>
          {!isAuthenticated && (
            <button
              onClick={() => navigate('/auth')}
              className="px-3.5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors cursor-pointer"
            >
              Fazer Login
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-6 flex flex-col gap-6">
        {/* Banner Informativo */}
        <div className="bg-gradient-to-r from-brand-50 to-orange-50/30 border border-brand-100 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-card text-brand-600 rounded-xl shadow-xs border border-brand-100">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Controle sua Loja Falando
              </h2>
              <p className="text-xs text-text-muted mt-0.5 max-w-2xl">
                Diga o que você quer fazer (ex: <em>&quot;Transfira 10 caixas de leite para a gôndola&quot;</em> ou <em>&quot;Muda o preço do refrigerante para 8 reais&quot;</em>) e o sistema entende e atualiza seu estoque automaticamente.
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

        {/* Abas de Navegação */}
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
            <span>Comando de Voz</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('transcribe');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'transcribe'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-card'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>Transformar Áudio em Texto</span>
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
            <span>Consultor Virtual</span>
          </button>
        </div>

        {/* CONTEÚDO TAB 1: COMANDO DE VOZ CHÃO DE LOJA */}
        {activeTab === 'voice-command' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Entrada de Áudio e Configurações */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Mic className="w-4 h-4 text-brand-600" />
                    Entrada de Áudio
                  </h3>
                  <div className="flex bg-canvas p-1 rounded-xl border border-border-neutral text-xs">
                    <button
                      type="button"
                      onClick={() => setAudioInputMode('record')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        audioInputMode === 'record'
                          ? 'bg-card text-brand-600 shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      Gravar Microfone
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioInputMode('upload')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        audioInputMode === 'upload'
                          ? 'bg-card text-brand-600 shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      Subir Arquivo
                    </button>
                  </div>
                </div>

                {audioInputMode === 'record' ? (
                  <AudioRecorder onAudioReady={handleAudioReady} disabled={isPending} />
                ) : (
                  <AudioUploader
                    onFileSelect={handleFileSelect}
                    onFileClear={handleFileClear}
                    disabled={isPending}
                  />
                )}

                <div className="flex flex-col gap-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Instrução de Contexto (Opcional)
                    </label>
                    <input
                      type="text"
                      value={voiceSystemPrompt}
                      onChange={(e) => setVoiceSystemPrompt(e.target.value)}
                      placeholder="Ex: Priorize correspondência com produtos de bebidas e laticínios"
                      className="w-full px-3.5 py-2.5 text-xs bg-canvas border border-border-neutral rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 p-3 bg-canvas border border-border-neutral rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoExecute}
                      onChange={(e) => setAutoExecute(e.target.checked)}
                      className="w-4 h-4 text-brand-600 rounded border-border-neutral focus:ring-brand-500 cursor-pointer"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-text-primary">
                        Auto-executar Ação no Banco
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Executa a transferência ou venda automaticamente caso a intenção e o produto sejam identificados com precisão.
                      </span>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={handleVoiceCommand}
                    disabled={isPending || !audioBase64}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
                  >
                    {isPending ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" />
                        <span>Processando Áudio com Whisper & Llama 3.3...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Interpretar Comando de Voz</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Resultado do Comando de Voz */}
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 shadow-xs flex flex-col gap-4 min-h-[380px]">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-600" />
                  Resultado da Interpretação
                </h3>

                {!voiceResult && !isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-muted">
                    <Mic className="w-10 h-10 text-neutral-300 mb-2" />
                    <p className="text-xs font-medium">Nenhum comando processado ainda.</p>
                    <p className="text-[11px] text-text-muted max-w-xs mt-1">
                      Grave sua voz ao lado e clique em &quot;Interpretar Comando de Voz&quot;.
                    </p>
                  </div>
                )}

                {isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-brand-600 gap-3">
                    <RotateCcw className="w-8 h-8 animate-spin" />
                    <div className="text-xs font-bold">Transcrevendo e analisando contexto...</div>
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

        {/* CONTEÚDO TAB 2: TRANSCRIÇÃO DE ÁUDIO DEDICADA */}
        {activeTab === 'transcribe' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <FileAudio className="w-4 h-4 text-brand-600" />
                    Áudio para Transcrever
                  </h3>
                  <div className="flex bg-canvas p-1 rounded-xl border border-border-neutral text-xs">
                    <button
                      type="button"
                      onClick={() => setAudioInputMode('record')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        audioInputMode === 'record'
                          ? 'bg-card text-brand-600 shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      Gravar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioInputMode('upload')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        audioInputMode === 'upload'
                          ? 'bg-card text-brand-600 shadow-xs'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      Upload de Arquivo
                    </button>
                  </div>
                </div>

                {audioInputMode === 'record' ? (
                  <AudioRecorder onAudioReady={handleAudioReady} disabled={isPending} />
                ) : (
                  <AudioUploader
                    onFileSelect={handleFileSelect}
                    onFileClear={handleFileClear}
                    disabled={isPending}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Idioma
                    </label>
                    <select
                      value={transcribeLanguage}
                      onChange={(e) => setTranscribeLanguage(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-canvas border border-border-neutral rounded-xl focus:border-brand-500 focus:outline-none"
                    >
                      <option value="pt">Português (pt)</option>
                      <option value="en">Inglês (en)</option>
                      <option value="es">Espanhol (es)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Prompt de Contexto / Dicionário
                    </label>
                    <input
                      type="text"
                      value={transcribePrompt}
                      onChange={(e) => setTranscribePrompt(e.target.value)}
                      placeholder="Ex: Nomes de marcas, SKUs, termos de estoque"
                      className="w-full px-3.5 py-2.5 text-xs bg-canvas border border-border-neutral rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={isPending || (!audioBase64 && !audioFile)}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
                >
                  {isPending ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Transcrevendo áudio...</span>
                    </>
                  ) : (
                    <>
                      <FileAudio className="w-4 h-4" />
                      <span>Converter em Texto</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 shadow-xs flex flex-col gap-4 min-h-[380px]">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-600" />
                  Texto Transcrito
                </h3>

                {!transcribeResult && !isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-muted">
                    <FileAudio className="w-10 h-10 text-neutral-300 mb-2" />
                    <p className="text-xs font-medium">Nenhum áudio transcrito ainda.</p>
                  </div>
                )}

                {isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-brand-600 gap-3">
                    <RotateCcw className="w-8 h-8 animate-spin" />
                    <div className="text-xs font-bold">Transcrevendo áudio...</div>
                  </div>
                )}

                {transcribeResult && !isPending && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="p-4 bg-canvas border border-border-neutral rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Texto Reconhecido
                        </span>
                        <button
                          onClick={() => copyToClipboard(transcribeResult.text)}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-600 font-bold cursor-pointer"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                        {transcribeResult.text}
                      </p>
                    </div>

                    {/* Modelo oculto para o usuário final */}

                    {transcribeResult.duration && (
                      <div className="flex items-center justify-between p-3 bg-canvas border border-border-neutral rounded-xl text-xs">
                        <span className="text-text-muted">Duração do Áudio:</span>
                        <span className="font-bold">{transcribeResult.duration.toFixed(2)}s</span>
                      </div>
                    )}
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
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Resposta Prática
                        </span>
                        <button
                          onClick={() => copyToClipboard(chatResult.result)}
                          className="flex items-center gap-1 text-xs text-text-muted hover:text-brand-600 font-bold cursor-pointer"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copied ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                        {chatResult.result}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Interativo de Revisão de Alterações Multi-Produtos */}
      {voiceResult && (
        <ActionReviewModal
          voiceResult={voiceResult}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={(updatedResult) => {
            setVoiceResult(updatedResult);
          }}
        />
      )}
    </div>
  );
}
