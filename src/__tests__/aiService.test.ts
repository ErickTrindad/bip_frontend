import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aiService } from '../services/aiService';

describe('aiService Integration Unit Tests', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
      configurable: true,
    });
    mockLocalStorage.clear();
  });

  it('listModels calls GET /ai/models and returns models list', async () => {
    const mockResponse = {
      models: [
        { id: 'llama-3.3-70b-versatile', object: 'model', owned_by: 'meta', active: true },
        { id: 'whisper-large-v3', object: 'model', owned_by: 'openai', active: true },
      ],
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });
    globalThis.fetch = fetchMock;

    localStorage.setItem('@bip:token', 'test-token');

    const result = await aiService.listModels();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ai/models'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );

    expect(result).toEqual(mockResponse);
    expect(result.models.length).toBe(2);
  });

  it('transcribeBase64 sends correct payload to /ai/transcribe', async () => {
    const mockResponse = {
      text: 'Transfira 10 caixas de leite para a gôndola',
      model: 'whisper-large-v3',
      duration: 3.42,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });
    globalThis.fetch = fetchMock;

    localStorage.setItem('@bip:token', 'fake-jwt-token');

    const result = await aiService.transcribeBase64({
      audioBase64: 'UklGRiQAAABXQVZFZ...',
      filename: 'test.m4a',
      language: 'pt',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ai/transcribe'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer fake-jwt-token',
        }),
        body: JSON.stringify({
          audioBase64: 'UklGRiQAAABXQVZFZ...',
          filename: 'test.m4a',
          language: 'pt',
        }),
      })
    );

    expect(result).toEqual(mockResponse);
  });

  it('transcribeUpload sends FormData to /ai/transcribe/upload', async () => {
    const mockResponse = {
      text: 'Venda dois refrigerantes no caixa 1',
      model: 'whisper-large-v3',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });
    globalThis.fetch = fetchMock;

    localStorage.setItem('@bip:token', 'fake-jwt-token');

    const dummyBlob = new Blob(['audio data'], { type: 'audio/webm' });
    const result = await aiService.transcribeUpload(dummyBlob, {
      language: 'pt',
      prompt: 'Coca-Cola, Guaraná',
      filename: 'sample.webm',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ai/transcribe/upload'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-jwt-token',
        }),
        body: expect.any(FormData),
      })
    );

    expect(result).toEqual(mockResponse);
  });

  it('chatPrompt sends prompt payload to /ai/chat', async () => {
    const mockResponse = {
      result: 'Para otimizar o estoque, utilize o modelo FIFO e monitore o ponto de reposição.',
      model: 'llama-3.3-70b-versatile',
      usage: { prompt_tokens: 15, completion_tokens: 22, total_time: 0.45 },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });
    globalThis.fetch = fetchMock;

    const result = await aiService.chatPrompt({
      prompt: 'Como reduzir perdas no estoque?',
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ai/chat'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Como reduzir perdas no estoque?',
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
        }),
      })
    );

    expect(result).toEqual(mockResponse);
  });

  it('voiceCommand sends floor command payload with COMPOUND_ACTION and actions array to /ai/voice-command', async () => {
    const mockResponse = {
      transcription: 'Muda o preço da Pepsi Twist para 12 reais e transfere 12 unidades da gôndola para o depósito',
      intent: 'COMPOUND_ACTION',
      extractedData: {
        productQuery: 'Pepsi Twist',
        price: 12,
        quantity: 12,
        from: 'shelf',
        to: 'depot',
      },
      actions: [
        { action: 'UPDATE_PRODUCT', productQuery: 'Pepsi Twist', price: 12, executed: true },
        { action: 'TRANSFER_STOCK', productQuery: 'Pepsi Twist', quantity: 12, from: 'shelf', to: 'depot', executed: true },
      ],
      matchedProduct: {
        id: 'prod-456',
        name: 'Pepsi Twist 2L',
        barcode: '7891991001234',
        price: 9.5,
        depotQty: 10,
        shelfQty: 15,
      },
      explanation: 'Preço da Pepsi Twist atualizado para R$ 12,00 e transferidas 12 unidades da gôndola para o depósito.',
      executed: true,
      executionResult: { success: true },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });
    globalThis.fetch = fetchMock;

    localStorage.setItem('@bip:token', 'auth-token');

    const result = await aiService.voiceCommand({
      audioBase64: 'base64audio==',
      filename: 'voice.webm',
      autoExecute: true,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ai/voice-command'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer auth-token',
        }),
        body: JSON.stringify({
          audioBase64: 'base64audio==',
          filename: 'voice.webm',
          autoExecute: true,
        }),
      })
    );

    expect(result.intent).toBe('COMPOUND_ACTION');
    expect(result.executed).toBe(true);
    expect(result.actions?.length).toBe(2);
    expect(result.matchedProduct?.name).toBe('Pepsi Twist 2L');
  });

  it('voiceCommand sends text prompt payload when mic is not used', async () => {
    const mockResponse = {
      transcription: 'Vendi 2 coca cola no pix',
      intent: 'POS_SALE',
      extractedData: {
        productQuery: 'coca cola',
        quantity: 2,
        paymentMethod: 'PIX',
      },
      actions: [
        { action: 'POS_SALE', productQuery: 'coca cola', quantity: 2, executed: false },
      ],
      explanation: 'Venda de 2 unidades de coca cola via PIX registrada.',
      executed: false,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });
    globalThis.fetch = fetchMock;

    const result = await aiService.voiceCommand({
      prompt: 'Vendi 2 coca cola no pix',
      autoExecute: false,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/ai/voice-command'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Vendi 2 coca cola no pix',
          autoExecute: false,
        }),
      })
    );

    expect(result.transcription).toBe('Vendi 2 coca cola no pix');
    expect(result.intent).toBe('POS_SALE');
  });
});
