'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppConfig,
  Conversation,
  ChatMessage,
  MessageAttachment,
  DEFAULT_CONFIG,
} from '@/lib/types';
import {
  getStoredConfig,
  saveStoredConfig,
  getStoredConversations,
  saveStoredConversations,
  getStoredActiveConversationId,
  saveStoredActiveConversationId,
  generateTitleFromMessage,
} from '@/lib/storage';
import { Sidebar } from '@/components/Sidebar';
import { ChatMessageItem } from '@/components/ChatMessageItem';
import { ChatInput } from '@/components/ChatInput';
import { SettingsModal } from '@/components/SettingsModal';
import {
  PanelLeftOpen,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function Home() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize from LocalStorage
  useEffect(() => {
    const loadedConfig = getStoredConfig();
    const loadedConversations = getStoredConversations();
    const loadedActiveId = getStoredActiveConversationId();

    setConfig(loadedConfig);
    setConversations(loadedConversations);

    if (loadedActiveId && loadedConversations.some((c) => c.id === loadedActiveId)) {
      setActiveConversationId(loadedActiveId);
    } else if (loadedConversations.length > 0) {
      setActiveConversationId(loadedConversations[0].id);
      saveStoredActiveConversationId(loadedConversations[0].id);
    }

    // Apply initial theme class to HTML root
    if (loadedConfig.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    setMounted(true);
  }, []);

  // Sync theme changes with DOM
  const handleToggleTheme = () => {
    const newTheme: 'dark' | 'light' = config.theme === 'dark' ? 'light' : 'dark';
    const updatedConfig = { ...config, theme: newTheme };
    setConfig(updatedConfig);
    saveStoredConfig(updatedConfig);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const currentMessages = activeConversation ? activeConversation.messages : [];

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeConversationId, scrollToBottom]);

  useEffect(() => {
    if (isGenerating) {
      scrollToBottom(true);
    }
  }, [currentMessages, isGenerating, scrollToBottom]);

  // Create new conversation
  const handleNewConversation = () => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveConversationId(null);
    saveStoredActiveConversationId(null);
  };

  // Select conversation
  const handleSelectConversation = (id: string) => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setActiveConversationId(id);
    saveStoredActiveConversationId(id);
  };

  // Delete conversation
  const handleDeleteConversation = (id: string) => {
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    saveStoredConversations(updated);

    if (activeConversationId === id) {
      const nextId = updated.length > 0 ? updated[0].id : null;
      setActiveConversationId(nextId);
      saveStoredActiveConversationId(nextId);
    }
  };

  // Rename conversation
  const handleRenameConversation = (id: string, newTitle: string) => {
    const updated = conversations.map((c) =>
      c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c
    );
    setConversations(updated);
    saveStoredConversations(updated);
  };

  // Clear current active conversation messages
  const handleClearCurrentChat = () => {
    if (!activeConversationId) return;
    if (confirm('Hapus semua pesan dalam percakapan ini?')) {
      const updated = conversations.map((c) =>
        c.id === activeConversationId ? { ...c, messages: [], updatedAt: Date.now() } : c
      );
      setConversations(updated);
      saveStoredConversations(updated);
    }
  };

  // Clear all conversations
  const handleClearAllConversations = () => {
    setConversations([]);
    setActiveConversationId(null);
    saveStoredConversations([]);
    saveStoredActiveConversationId(null);
  };

  // Import conversations
  const handleImportConversations = (imported: Conversation[], memory?: string) => {
    const merged = [...imported, ...conversations];
    // Remove duplicates by ID
    const unique = Array.from(new Map(merged.map((c) => [c.id, c])).values());
    unique.sort((a, b) => b.updatedAt - a.updatedAt);

    setConversations(unique);
    saveStoredConversations(unique);

    if (unique.length > 0) {
      setActiveConversationId(unique[0].id);
      saveStoredActiveConversationId(unique[0].id);
    }

    if (memory) {
      const updatedConfig = { ...config, longTermMemory: memory };
      setConfig(updatedConfig);
      saveStoredConfig(updatedConfig);
    }
  };

  // Update Config
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    saveStoredConfig(newConfig);
  };

  // Select Model
  const handleSelectModel = (modelId: string) => {
    const updated = { ...config, currentModel: modelId };
    setConfig(updated);
    saveStoredConfig(updated);
  };

  // Helper for Proxying Target URL
  const getProxiedUrl = (targetUrl: string) => {
    if (!config.useProxy) return targetUrl;
    return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Send Message & Stream AI Response
  const handleSendMessage = async (text: string, attachments: MessageAttachment[]) => {
    if (!config.baseUrl) {
      alert('Silakan tentukan Base URL API terlebih dahulu di menu Pengaturan.');
      setIsSettingsOpen(true);
      return;
    }

    let targetConvId = activeConversationId;
    let currentConvs = [...conversations];

    // If no active conversation, create one automatically
    if (!targetConvId) {
      const newId = `conv_${Date.now()}`;
      const newConv: Conversation = {
        id: newId,
        title: generateTitleFromMessage(text || 'Lampiran Berkas'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: config.currentModel,
        messages: [],
      };
      currentConvs = [newConv, ...currentConvs];
      targetConvId = newId;
      setActiveConversationId(newId);
      saveStoredActiveConversationId(newId);
    }

    // 1. Create User Message
    const userMessage: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      content: text,
      attachments,
      timestamp: Date.now(),
    };

    // 2. Prepare Assistant Message Placeholder
    const assistantMessageId = `msg_asst_${Date.now() + 1}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now() + 1,
    };

    // Append to conversation
    const convIndex = currentConvs.findIndex((c) => c.id === targetConvId);
    if (convIndex !== -1) {
      currentConvs[convIndex] = {
        ...currentConvs[convIndex],
        updatedAt: Date.now(),
        messages: [...currentConvs[convIndex].messages, userMessage, assistantMessage],
      };
      setConversations([...currentConvs]);
      saveStoredConversations([...currentConvs]);
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    // 3. Construct API payload messages
    const apiMessages: Array<{ role: string; content: unknown }> = [];

    // Combine system prompt and long-term memory
    let combinedSystem = config.systemPrompt ? config.systemPrompt.trim() : '';

    // Platform document & project bundling capabilities instruction
    const platformInstructions = `[PANDUAN KEMAMPUAN PLATFORM HERO AI]:
1. FITUR DOKUMEN: Antarmuka sistem ini memiliki fitur bawaan untuk mengonversi dan mengunduh balasan Anda langsung menjadi file dokumen Microsoft Word (.docx) dan PDF melalui tombol unduh dokumen. Jika pengguna meminta untuk membuatkan dokumen, makalah, file Word, PDF, rangkuman, modul, atau tugas diskusi, JANGAN PERNAH mengatakan Anda tidak bisa mengirim file atau tidak bisa membuat dokumen Word/PDF. Cukup langsung tuliskan isi dokumennya secara lengkap, rapi, dan terstruktur menggunakan judul, heading (#, ##), daftar poin, tabel, dan format matematika LaTeX ($...$), karena pengguna akan langsung mengunduh hasil tulisan Anda sebagai file Word/PDF dengan satu klik.
2. FITUR PROYEK APLIKASI & ZIP: Antarmuka sistem ini memiliki fitur bawaan yang otomatis mendeteksi dan membundel seluruh berkas kode proyek aplikasi (Next.js, React, HTML/CSS/JS, Python, dll) menjadi arsip .zip yang siap diunduh dan dijalankan. Ketika pengguna meminta dibuatkan aplikasi/website/proyek atau beberapa berkas kode, SELALU tuliskan path berkas yang jelas tepat sebelum blok kode (misalnya \`### \`path/nama-file.ext\`\` atau \`\`\`language filename="path/nama-file.ext"\`\`\`) agar sistem dapat langsung mengekstrak semua berkas tersebut ke struktur folder proyek .zip yang rapi.`;

    combinedSystem += (combinedSystem ? '\n\n' : '') + platformInstructions;

    if (config.longTermMemory && config.longTermMemory.trim()) {
      combinedSystem +=
        '\n\n' +
        `[MEMORI JANGKA PANJANG & PREFERENSI USER (HARUS SELALU DIINGAT DAN DIIKUTI OLEH AI)]:\n${config.longTermMemory.trim()}`;
    }
    if (combinedSystem) {
      apiMessages.push({ role: 'system', content: combinedSystem });
    }

    // Prior messages from this conversation
    const priorMessages = currentConvs[convIndex]?.messages.slice(0, -1) || [];
    for (const msg of priorMessages) {
      if (msg.role === 'user') {
        const hasImages = msg.attachments?.some((a) => a.isImage && a.dataUrl);
        if (hasImages) {
          const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
          if (msg.content) {
            contentParts.push({ type: 'text', text: msg.content });
          }
          msg.attachments?.forEach((att) => {
            if (att.isImage && att.dataUrl) {
              contentParts.push({
                type: 'image_url',
                image_url: { url: att.dataUrl },
              });
            } else if (att.content) {
              contentParts.push({
                type: 'text',
                text: `\n\n[Lampiran: ${att.name}]\n${att.content}\n`,
              });
            }
          });
          apiMessages.push({ role: 'user', content: contentParts });
        } else {
          let fullContent = msg.content;
          msg.attachments?.forEach((att) => {
            if (att.content) {
              fullContent += `\n\n[Lampiran Dokumen: ${att.name}]\n\`\`\`\n${att.content}\n\`\`\``;
            }
          });
          apiMessages.push({ role: 'user', content: fullContent });
        }
      } else {
        apiMessages.push({ role: 'assistant', content: msg.content });
      }
    }

    try {
      const endpoint = getProxiedUrl(`${config.baseUrl.trim().replace(/\/+$/, '')}/chat/completions`);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (config.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim().replace(/^bearer\s+/i, '')}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          model: config.currentModel,
          messages: apiMessages,
          temperature: config.temperature,
          stream: config.stream,
        }),
      });

      if (!response.ok) {
        let errDetails = await response.text();
        try {
          const parsed = JSON.parse(errDetails);
          if (parsed.error) {
            errDetails = typeof parsed.error === 'object' ? JSON.stringify(parsed.error) : parsed.error;
          }
        } catch {}
        throw new Error(`HTTP ${response.status} (${response.statusText}):\n${errDetails}`);
      }

      let accumulatedReply = '';

      if (config.stream && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed === 'data: [DONE]') {
              break;
            }

            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta?.content || '';
                if (delta) {
                  accumulatedReply += delta;

                  // Update UI message in real time
                  setConversations((prev) =>
                    prev.map((c) => {
                      if (c.id !== targetConvId) return c;
                      return {
                        ...c,
                        messages: c.messages.map((m) =>
                          m.id === assistantMessageId ? { ...m, content: accumulatedReply } : m
                        ),
                      };
                    })
                  );
                }
              } catch {}
            }
          }
        }
      } else {
        // Non-streaming response
        const data = await response.json();
        accumulatedReply = data.choices?.[0]?.message?.content || 'Tidak ada balasan dari model.';
      }

      // Final save to localStorage
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== targetConvId) return c;
          return {
            ...c,
            updatedAt: Date.now(),
            messages: c.messages.map((m) =>
              m.id === assistantMessageId ? { ...m, content: accumulatedReply } : m
            ),
          };
        });
        saveStoredConversations(updated);
        return updated;
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'AbortError') {
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: (m.content || '') + '\n\n*[Balasan dihentikan oleh pengguna]*',
                    }
                  : m
              ),
            };
          });
          saveStoredConversations(updated);
          return updated;
        });
      } else {
        console.error('Chat Error:', error);
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== targetConvId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: `⚠️ **Gagal Menghubungi API**\n\n\`\`\`\n${error.message}\n\`\`\`\n\n*Buka menu Pengaturan untuk memastikan Base URL & API Key aktif.*`,
                    }
                  : m
              ),
            };
          });
          saveStoredConversations(updated);
          return updated;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  if (!mounted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#282a36] text-[#f8f8f2]">
        <div className="flex items-center gap-2 font-mono text-sm">
          <Zap className="w-5 h-5 text-[#bd93f9] animate-pulse" />
          <span>Memuat Hero AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={config.theme}
        onToggleTheme={handleToggleTheme}
        isOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header */}
        <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-surface)] px-4 flex items-center justify-between shrink-0 z-10 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                title="Buka sidebar riwayat"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <div className="min-w-0 flex items-center gap-2">
              <h2 className="text-sm font-semibold truncate text-[var(--text-primary)]">
                {activeConversation?.title || 'Percakapan Baru'}
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-surface-active)] text-[var(--accent-cyan)] border border-[var(--border-subtle)] truncate max-w-[130px]">
                {config.currentModel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {currentMessages.length > 0 && (
              <button
                onClick={handleClearCurrentChat}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--accent-red)] rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer text-xs flex items-center gap-1"
                title="Bersihkan pesan chat ini"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Reset</span>
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer text-xs flex items-center gap-1.5"
              title="Pengaturan"
            >
              <Sliders className="w-4 h-4 text-[var(--accent)]" />
              <span className="hidden sm:inline font-medium text-xs">Pengaturan</span>
            </button>
          </div>
        </header>

        {/* Messages Scrollable Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {currentMessages.length === 0 ? (
            /* Clean Minimalist Welcome Screen (No AI Slop) */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto select-none space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  Selamat Datang di Hero AI
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Klien AI cerdas dengan dukungan multi-model, vision, memori otomatis, dan tema Dracula VS Code.
                </p>
              </div>

              {/* Starter Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-3 text-left">
                <button
                  type="button"
                  onClick={() =>
                    handleSendMessage('Jelaskan cara kerja CORS proxy dan Server-Sent Events (SSE) secara teknis tapi mudah dipahami.', [])
                  }
                  className="p-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] transition-all cursor-pointer text-left group"
                >
                  <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    🌐 Penjelasan CORS Proxy
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                    Cara kerja proxy dan streaming SSE
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendMessage('Bantu saya membuat arsitektur aplikasi Next.js modern yang scalable dan mudah dideploy ke Vercel.', [])
                  }
                  className="p-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] transition-all cursor-pointer text-left group"
                >
                  <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                    ⚡ Arsitektur Next.js & Vercel
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                    Struktur clean code dan routing
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 pb-4">
              {currentMessages.map((msg, index) => {
                const isLast = index === currentMessages.length - 1;
                return (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    modelName={config.models.find((m) => m.id === config.currentModel)?.name || config.currentModel}
                    isStreaming={isLast && isGenerating && msg.role === 'assistant'}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Floating Chat Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onStop={handleStopGeneration}
          isGenerating={isGenerating}
          models={config.models}
          currentModel={config.currentModel}
          onSelectModel={handleSelectModel}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        conversations={conversations}
        onImportConversations={handleImportConversations}
        onClearAllConversations={handleClearAllConversations}
      />
    </div>
  );
}
