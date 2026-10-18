import { AppConfig, Conversation, DEFAULT_CONFIG } from './types';

const STORAGE_KEY_CONFIG = 'hero_ai_config_v3';
const STORAGE_KEY_CONVERSATIONS = 'hero_ai_conversations_v3';
const STORAGE_KEY_ACTIVE_CONV = 'hero_ai_active_conv_id';

export function getStoredConfig(): AppConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      models: Array.isArray(parsed.models) && parsed.models.length > 0
        ? parsed.models
        : DEFAULT_CONFIG.models,
    };
  } catch (err) {
    console.error('Failed to load config from localStorage:', err);
    return DEFAULT_CONFIG;
  }
}

export function saveStoredConfig(config: AppConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save config to localStorage:', err);
  }
}

export function getStoredConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load conversations from localStorage:', err);
    return [];
  }
}

export function saveStoredConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(conversations));
  } catch (err) {
    console.error('Failed to save conversations to localStorage:', err);
  }
}

export function getStoredActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_ACTIVE_CONV);
}

export function saveStoredActiveConversationId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_CONV, id);
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_CONV);
  }
}

export function generateTitleFromMessage(content: string): string {
  const clean = content.trim().replace(/^[\s#*>`-]+/, '');
  const firstLine = clean.split('\n')[0].trim();
  if (!firstLine) return 'Percakapan Baru';
  if (firstLine.length > 38) {
    return firstLine.slice(0, 38).trim() + '...';
  }
  return firstLine;
}
