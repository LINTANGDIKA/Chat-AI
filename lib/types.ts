export interface MessageAttachment {
  name: string;
  type: string;
  isImage: boolean;
  dataUrl?: string; // base64 data for images
  content?: string; // string content for text/code files
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: MessageAttachment[];
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  messages: ChatMessage[];
}

export interface AIModel {
  id: string;
  name: string;
}

export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  currentModel: string;
  models: AIModel[];
  systemPrompt: string;
  temperature: number;
  stream: boolean;
  useProxy: boolean;
  longTermMemory: string;
  theme: 'dark' | 'light';
}

export const DEFAULT_CONFIG: AppConfig = {
  baseUrl: 'https://hero-ai.zero-hero.biz.id/v1',
  apiKey: '',
  currentModel: 'ai',
  models: [
    { id: 'ai', name: 'Hero AI' }
  ],
  systemPrompt: 'Anda adalah asisten AI yang cerdas, solutif, dan profesional.',
  temperature: 0.7,
  stream: true,
  useProxy: true,
  longTermMemory: 'User menyukai asisten AI berbahasa Indonesia dengan jawaban terstruktur dan to-the-point.',
  theme: 'dark'
};
