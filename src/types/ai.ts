export interface GroqModelItem {
  id: string;
  object: string;
  owned_by: string;
  active: boolean;
}

export interface GroqModelsResponse {
  models: GroqModelItem[];
}

export interface TranscribeResponse {
  text: string;
  model: string;
  duration?: number;
}

export interface TranscribeBase64Payload {
  audioBase64: string;
  filename?: string;
  language?: string;
  prompt?: string;
  temperature?: number;
}

export interface ChatPromptPayload {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
}

export interface ChatPromptResponse {
  result: string;
  parsedJson?: unknown;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    total_time?: number;
  };
}

export type VoiceIntent =
  | 'STOCK_ENTRY'
  | 'UPDATE_PRODUCT'
  | 'TRANSFER_STOCK'
  | 'REPLENISH_ALL_CRITICAL'
  | 'POS_SALE'
  | 'CHECK_STOCK'
  | 'REGISTER_PRODUCT'
  | 'COMPOUND_ACTION'
  | 'UNKNOWN';
export interface MatchedProduct {
  id: string;
  name: string;
  barcode: string;
  price?: number | null;
  depotQty: number;
  shelfQty: number;
}

export interface VoiceActionItem {
  action: 'UPDATE_PRODUCT' | 'STOCK_ENTRY' | 'TRANSFER_STOCK' | 'POS_SALE' | 'CHECK_STOCK' | 'REGISTER_PRODUCT';
  productQuery?: string | null;
  matchedProduct?: MatchedProduct | null;
  price?: number | null;
  quantity?: number | null;
  depotQty?: number | null;
  shelfQty?: number | null;
  from?: 'depot' | 'shelf' | null;
  to?: 'depot' | 'shelf' | null;
  destination?: 'depot' | 'shelf' | null;
  executed?: boolean;
  result?: unknown;
}

export interface VoiceCommandPayload {
  audioBase64?: string;
  prompt?: string;
  filename?: string;
  systemPrompt?: string;
  autoExecute?: boolean;
}

export interface VoiceCommandResponse {
  transcription: string;
  intent: VoiceIntent;
  extractedData: {
    productQuery?: string;
    price?: number;
    newPrice?: number;
    quantity?: number;
    destination?: 'depot' | 'shelf';
    from?: 'depot' | 'shelf';
    to?: 'depot' | 'shelf';
    depotLocation?: string;
    shelfLocation?: string;
    shelfMinQty?: number;
    paymentMethod?: 'MONEY' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX';
    barcode?: string;
    [key: string]: unknown;
  };
  actions: VoiceActionItem[];
  matchedProduct?: MatchedProduct | null;
  matchedProducts?: MatchedProduct[];
  explanation: string;
  executed: boolean;
  executionResult?: unknown;
}
