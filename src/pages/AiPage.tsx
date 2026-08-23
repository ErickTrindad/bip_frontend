import { useState, useTransition, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Mic,
  FileAudio,
  MessageSquare,
  Bot,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  ShoppingCart,
  Package,
  Layers,
  HelpCircle,
  Copy,
  Check,
  Zap,
  Tag,
  CheckCircle,
  ListTree,
} from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { aiService } from '../services/aiService';
import { ApiError } from '../services/api';
import { AudioRecorder } from '../components/ai/AudioRecorder';
import { AudioUploader } from '../components/ai/AudioUploader';
import type {
  TranscribeResponse,
  ChatPromptResponse,
  VoiceCommandResponse,
  VoiceIntent,
  GroqModelItem,
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

  // Estados de Chat / Llama 3.3
  const [chatPromptText, setChatPromptText] = useState<string>('');
  const [chatSystemPrompt, setChatSystemPrompt] = useState<string>('Você é o assistente inteligente de gestão e chão de loja da plataforma GO PME.');
  const [chatModel, setChatModel] = useState<string>('llama-3.3-70b-versatile');
  const [chatJsonMode, setChatJsonMode] = useState<boolean>(false);
  const [chatTemperature, setChatTemperature] = useState<number>(0.1);
  const [chatResult, setChatResult] = useState<ChatPromptResponse | null>(null);
  const [availableModels, setAvailableModels] = useState<GroqModelItem[]>([]);

  // Carrega modelos dinâmicos da conta Groq caso autenticado
  useEffect(() => {
    if (isAuthenticated) {
      aiService
        .listModels()
        .then((res) => {
          if (res.models && res.models.length > 0) {
            setAvailableModels(res.models);
          }
        })
        .catch(() => {
          // Fallback silencioso mantendo os modelos padrões
        });
    }
  }, [isAuthenticated]);
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
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Falha ao interpretar comando de voz.');
        }
      }
    });
  };

  // Aplica manualmente a ação identificada pelo comando de voz
  const handleApplyAction = () => {
    if (!voiceResult || !audioBase64) return;

    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await aiService.voiceCommand({
          audioBase64,
          filename: audioFilename,
          systemPrompt: voiceSystemPrompt || undefined,
          autoExecute: true,
        });
        setVoiceResult(res);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Falha ao aplicar a ação identificada.');
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
          systemPrompt: chatSystemPrompt || undefined,
          model: chatModel,
          temperature: chatTemperature,
          jsonMode: chatJsonMode,
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

  const renderIntentBadge = (intent: VoiceIntent) => {
    switch (intent) {
      case 'COMPOUND_ACTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <ListTree className="w-3.5 h-3.5" /> Ações Compostas (Múltiplas Ações)
          </span>
        );
      case 'UPDATE_PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
            <Tag className="w-3.5 h-3.5" /> Atualização de Preço / Produto
          </span>
        );
      case 'STOCK_ENTRY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Package className="w-3.5 h-3.5" /> Entrada / Reposição de Estoque
          </span>
        );
      case 'TRANSFER_STOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transferência de Estoque (Gôndola)
          </span>
        );
      case 'POS_SALE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
            <ShoppingCart className="w-3.5 h-3.5" /> Venda no Caixa (PDV)
          </span>
        );
      case 'CHECK_STOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Package className="w-3.5 h-3.5" /> Consulta de Saldo de Estoque
          </span>
        );
      case 'REGISTER_PRODUCT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Layers className="w-3.5 h-3.5" /> Cadastro de Novo Produto
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
            <HelpCircle className="w-3.5 h-3.5" /> Intenção Não Identificada
          </span>
        );
    }
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
              GO PME AI Studio
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                Groq Llama 3.3 & Whisper v3
              </span>
            </h1>
            <p className="text-xs text-text-muted">
              {tenant ? `${tenant.name} (${tenant.category})` : 'Comandos de Voz e Inteligência Artificial'}
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
                Automação por Voz para o Chão de Loja
              </h2>
              <p className="text-xs text-text-muted mt-0.5 max-w-2xl">
                Grave um comando em áudio (ex: <em>&quot;Transfira 10 caixas de leite da retaguarda para a gôndola&quot;</em> ou <em>&quot;Venda 2 refrigerantes&quot;</em>) para que a IA processe a intenção e sincronize os estoques.
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
            <span>Comando de Voz (Chão de Loja)</span>
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
            <span>Transcrição de Áudio (Whisper v3)</span>
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
            <span>Chat & Inferência (Llama 3.3)</span>
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
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    {/* Transcrição detectada */}
                    <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Transcrição Whisper v3
                        </span>
                        <button
                          onClick={() => copyToClipboard(voiceResult.transcription)}
                          className="text-text-muted hover:text-text-primary p-1 rounded transition-colors"
                          title="Copiar texto"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-status-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-xs font-medium text-text-primary italic">
                        &quot;{voiceResult.transcription}&quot;
                      </p>
                    </div>

                    {/* Intenção e Status de Execução */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-canvas border border-border-neutral rounded-2xl">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Intenção Classificada
                        </span>
                        <div>{renderIntentBadge(voiceResult.intent)}</div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Ação no Banco
                        </span>
                        {voiceResult.executed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-status-success">
                            <CheckCircle2 className="w-4 h-4" /> Executada com Sucesso
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted font-medium">
                            Pendente de Confirmação
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Produto Correspondente Localizado (Fuzzy Match) */}
                    {voiceResult.matchedProduct && (
                      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-600 text-white rounded-xl">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-text-primary">
                              Produto Identificado: {voiceResult.matchedProduct.name}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              Cód: {voiceResult.matchedProduct.barcode} • Depósito: {voiceResult.matchedProduct.depotQty} un • Gôndola: {voiceResult.matchedProduct.shelfQty} un {voiceResult.matchedProduct.price != null && `• Preço: R$ ${Number(voiceResult.matchedProduct.price).toFixed(2)}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Lista de Ações Desmembradas quando Composto */}
                    {voiceResult.actions && voiceResult.actions.length > 0 && (
                      <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Ações Identificadas no Comando ({voiceResult.actions.length}):
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {voiceResult.actions.map((act, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2.5 bg-card border border-border-neutral rounded-xl text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-brand-50 text-brand-700 font-bold text-[10px] flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span className="font-bold text-text-primary">
                                  {act.action === 'UPDATE_PRODUCT' && 'Atualizar Produto/Preço'}
                                  {act.action === 'TRANSFER_STOCK' && 'Transferir Estoque'}
                                  {act.action === 'STOCK_ENTRY' && 'Entrada de Estoque'}
                                  {act.action === 'POS_SALE' && 'Venda no PDV'}
                                  {act.action === 'CHECK_STOCK' && 'Consultar Saldo'}
                                  {act.action === 'REGISTER_PRODUCT' && 'Cadastrar Produto'}
                                </span>
                                {act.productQuery && (
                                  <span className="text-text-muted">({act.productQuery})</span>
                                )}
                              </div>
                              <div className="text-[11px] font-medium text-text-muted">
                                {act.price != null && `Preço: R$ ${Number(act.price).toFixed(2)} `}
                                {act.quantity != null && `Qtd: ${act.quantity} un `}
                                {act.from && act.to && `(${act.from === 'depot' ? 'Depósito' : 'Gôndola'} → ${act.to === 'depot' ? 'Depósito' : 'Gôndola'})`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Botão de Aplicar Ação Identificada caso ainda não tenha sido executada */}
                    {!voiceResult.executed && voiceResult.intent !== 'UNKNOWN' && (
                      <div className="p-4 bg-brand-50/70 border border-brand-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-brand-600 text-white rounded-xl">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-text-primary block">
                              Deseja aplicar a ação identificada agora?
                            </span>
                            <span className="text-[11px] text-text-muted">
                              {voiceResult.intent === 'COMPOUND_ACTION' && 'Irá executar todas as ações combinadas (preço, transferências e estoque) no banco de dados.'}
                              {voiceResult.intent === 'UPDATE_PRODUCT' && 'Irá atualizar os dados/preço do produto no banco de dados.'}
                              {voiceResult.intent === 'STOCK_ENTRY' && 'Irá registrar a entrada / atualizar a quantidade do produto no estoque.'}
                              {voiceResult.intent === 'TRANSFER_STOCK' && 'Irá realizar a transferência física de unidades entre depósito e gôndola.'}
                              {voiceResult.intent === 'CHECK_STOCK' && 'Irá consultar e exibir o saldo dos produtos correspondentes.'}
                              {voiceResult.intent === 'REGISTER_PRODUCT' && 'Irá cadastrar o produto no catálogo da sua loja.'}
                              {voiceResult.intent === 'POS_SALE' && 'Irá registrar a venda no caixa e abater o estoque.'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleApplyAction}
                          disabled={isPending}
                          className="w-full sm:w-auto px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
                        >
                          {isPending ? (
                            <>
                              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                              <span>Aplicando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Aplicar Ações no Estoque</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    <div className="p-3.5 bg-canvas border border-border-neutral rounded-2xl">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                        Explicação do Modelo
                      </span>
                      <p className="text-xs text-text-primary leading-relaxed">
                        {voiceResult.explanation}
                      </p>
                    </div>

                    {/* Dados Extraídos (JSON) */}
                    <div className="p-3.5 bg-neutral-900 text-neutral-100 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-48">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                        Entidades Extraídas (Payload):
                      </span>
                      <pre>{JSON.stringify(voiceResult.extractedData, null, 2)}</pre>
                    </div>

                    {voiceResult.executionResult !== undefined && (
                      <div className="p-3.5 bg-emerald-950/40 border border-emerald-800 text-emerald-200 rounded-2xl font-mono text-[11px] overflow-x-auto">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">
                          Resultado da Execução:
                        </span>
                        <pre>{JSON.stringify(voiceResult.executionResult, null, 2)}</pre>
                      </div>
                    )}
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
                      <span>Transcrevendo Áudio com Whisper Large v3...</span>
                    </>
                  ) : (
                    <>
                      <FileAudio className="w-4 h-4" />
                      <span>Transcrever Áudio</span>
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
                    <div className="text-xs font-bold">Processando transcrição via Groq Whisper...</div>
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

                    <div className="flex items-center justify-between p-3 bg-canvas border border-border-neutral rounded-xl text-xs">
                      <span className="text-text-muted">Modelo Utilizado:</span>
                      <span className="font-bold font-mono text-brand-600">{transcribeResult.model}</span>
                    </div>

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
                  Prompt e Parâmetros da IA
                </h3>

                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1">
                    System Prompt (Instrução do Sistema)
                  </label>
                  <textarea
                    rows={2}
                    value={chatSystemPrompt}
                    onChange={(e) => setChatSystemPrompt(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-canvas border border-border-neutral rounded-xl focus:border-brand-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1">
                    Mensagem / Pergunta / Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={chatPromptText}
                    onChange={(e) => setChatPromptText(e.target.value)}
                    placeholder="Ex: Como posso otimizar o estoque de produtos perecíveis para reduzir perdas no varejo de proximidade?"
                    className="w-full px-3.5 py-2.5 text-xs bg-canvas border border-border-neutral rounded-xl focus:border-brand-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Modelo
                    </label>
                    <select
                      value={chatModel}
                      onChange={(e) => setChatModel(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-canvas border border-border-neutral rounded-xl focus:border-brand-500 focus:outline-none font-mono"
                    >
                      {availableModels.length > 0 ? (
                        availableModels
                          .filter((m) => !m.id.includes('whisper'))
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.id}
                            </option>
                          ))
                      ) : (
                        <>
                          <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                          <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                          <option value="llama3-70b-8192">llama3-70b-8192</option>
                          <option value="llama3-8b-8192">llama3-8b-8192</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-primary block mb-1">
                      Temperatura ({chatTemperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={chatTemperature}
                      onChange={(e) => setChatTemperature(parseFloat(e.target.value))}
                      className="w-full accent-brand-600 mt-2"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-3 bg-canvas border border-border-neutral rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatJsonMode}
                    onChange={(e) => setChatJsonMode(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-border-neutral focus:ring-brand-500 cursor-pointer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-text-primary">
                      Forçar Resposta em JSON (JSON Mode)
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Garante que a saída seja um JSON estruturado e válido.
                    </span>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={handleChatPrompt}
                  disabled={isPending || !chatPromptText.trim()}
                  className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
                >
                  {isPending ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Gerando Resposta com Llama 3.3...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Enviar Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="bg-card border border-border-neutral rounded-3xl p-5 shadow-xs flex flex-col gap-4 min-h-[380px]">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Bot className="w-4 h-4 text-brand-600" />
                  Resposta do Modelo
                </h3>

                {!chatResult && !isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-muted">
                    <Bot className="w-10 h-10 text-neutral-300 mb-2" />
                    <p className="text-xs font-medium">Nenhuma consulta gerada ainda.</p>
                  </div>
                )}

                {isPending && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-brand-600 gap-3">
                    <RotateCcw className="w-8 h-8 animate-spin" />
                    <div className="text-xs font-bold">Processando inferência na Groq Cloud...</div>
                  </div>
                )}

                {chatResult && !isPending && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="p-4 bg-canvas border border-border-neutral rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Conteúdo da Resposta
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

                    {chatResult.parsedJson !== undefined && (
                      <div className="p-3.5 bg-neutral-900 text-neutral-100 rounded-2xl font-mono text-[11px] overflow-x-auto">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                          Parsed JSON:
                        </span>
                        <pre>{JSON.stringify(chatResult.parsedJson, null, 2)}</pre>
                      </div>
                    )}

                    {chatResult.usage && (
                      <div className="grid grid-cols-3 gap-2 p-3 bg-canvas border border-border-neutral rounded-xl text-center">
                        <div>
                          <span className="text-[10px] text-text-muted block">Prompt Tokens</span>
                          <span className="text-xs font-bold">{chatResult.usage.prompt_tokens ?? '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">Completion Tokens</span>
                          <span className="text-xs font-bold">{chatResult.usage.completion_tokens ?? '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">Tempo Total</span>
                          <span className="text-xs font-bold font-mono">
                            {chatResult.usage.total_time ? `${chatResult.usage.total_time.toFixed(2)}s` : '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
