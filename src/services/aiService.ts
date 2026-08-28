import { request, ApiError } from './api';
import type {
  TranscribeBase64Payload,
  TranscribeResponse,
  ChatPromptPayload,
  ChatPromptResponse,
  VoiceCommandPayload,
  VoiceCommandResponse,
  GroqModelsResponse,
} from '../types/ai';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export const aiService = {
  /**
   * Lista todos os modelos ativos e disponíveis na conta Groq (/ai/models)
   */
  async listModels(): Promise<GroqModelsResponse> {
    return request<GroqModelsResponse>('/ai/models', {
      method: 'GET',
    });
  },

  /**
   * Transcreve áudio via base64 (/ai/transcribe) usando Whisper Large v3
   */
  async transcribeBase64(payload: TranscribeBase64Payload): Promise<TranscribeResponse> {
    return request<TranscribeResponse>('/ai/transcribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Transcreve arquivo de áudio via multipart/form-data (/ai/transcribe/upload)
   */
  async transcribeUpload(
    file: File | Blob,
    options?: { language?: string; prompt?: string; filename?: string }
  ): Promise<TranscribeResponse> {
    const formData = new FormData();
    const filename = options?.filename || (file instanceof File ? file.name : 'audio.webm');
    formData.append('file', file, filename);

    if (options?.language) {
      formData.append('language', options.language);
    }
    if (options?.prompt) {
      formData.append('prompt', options.prompt);
    }

    const token = localStorage.getItem('@bip:token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/ai/transcribe/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data.error || data.message || 'Erro ao transcrever arquivo de áudio';
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { message } }));
        }
        throw new ApiError(message, response.status, data.issues);
      }

      return data as TranscribeResponse;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Erro ao conectar com o serviço de transcrição', 500);
    }
  },

  /**
   * Consulta/Inferência de IA rápida (/ai/chat) com Llama
   */
  async chatPrompt(payload: ChatPromptPayload): Promise<ChatPromptResponse> {
    return request<ChatPromptResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Comando de voz completo de Chão de Loja (/ai/voice-command)
   * Pipeline: Whisper Large v3 -> Llama -> Intenção (Venda/Transferência/Estoque/Cadastro) + Ação Automática
   */
  async voiceCommand(payload: VoiceCommandPayload): Promise<VoiceCommandResponse> {
    return request<VoiceCommandResponse>('/ai/voice-command', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
