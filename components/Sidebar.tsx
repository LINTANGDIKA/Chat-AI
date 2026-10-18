'use client';

import React, { useState } from 'react';
import { Conversation } from '@/lib/types';
import {
  Plus,
  MessageSquare,
  Search,
  Settings,
  Moon,
  Sun,
  Trash2,
  Edit2,
  Check,
  X,
  PanelLeftClose,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOpen: boolean;
  onToggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  onOpenSettings,
  theme,
  onToggleTheme,
  isOpen,
  onToggleSidebar,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Hapus percakapan ini dari riwayat?')) {
      onDeleteConversation(id);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggleSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-72 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-72 md:w-0 md:border-r-0'
        } overflow-hidden select-none shrink-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center font-bold shadow-xs">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-[var(--text-primary)] leading-tight">
                Hero AI
              </h1>
              <p className="text-[10px] text-[var(--accent-cyan)] font-mono">
                {theme === 'dark' ? 'Dracula Theme' : 'Light Mode'}
              </p>
            </div>
          </div>

          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Tutup sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Chat Button */}
        <div className="p-3">
          <button
            onClick={onNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Percakapan Baru</span>
          </button>
        </div>

        {/* Search Chats */}
        {conversations.length > 3 && (
          <div className="px-3 pb-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari obrolan..."
                className="w-full bg-[var(--bg-surface-hover)] text-[var(--text-primary)] text-xs rounded-lg pl-8 pr-3 py-1.5 border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>
        )}

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 custom-scrollbar">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-[var(--text-muted)] uppercase">
            Riwayat Percakapan ({filteredConversations.length})
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-[var(--text-muted)]">
              {searchQuery ? 'Tidak ada hasil yang cocok' : 'Belum ada obrolan'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = conv.id === editingId;

              return (
                <div
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[var(--bg-surface-active)] text-[var(--text-primary)] font-medium shadow-2xs border border-[var(--border-color)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                      }`}
                    />

                    {isEditing ? (
                      <form
                        onSubmit={(e) => saveRename(conv.id, e)}
                        className="flex items-center gap-1 flex-1 mr-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          autoFocus
                          className="w-full bg-[var(--bg-input)] text-xs px-1.5 py-0.5 rounded border border-[var(--accent)] focus:outline-none text-[var(--text-primary)]"
                        />
                        <button
                          type="submit"
                          className="p-1 text-[var(--accent-green)] hover:opacity-80"
                          title="Simpan"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelRename}
                          className="p-1 text-[var(--accent-red)] hover:opacity-80"
                          title="Batal"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <span className="truncate text-xs">{conv.title}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity ml-1 shrink-0">
                      <button
                        onClick={(e) => startRename(conv, e)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] rounded hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer"
                        title="Ubah judul"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] rounded hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Theme Toggle & Settings */}
        <div className="p-3 border-t border-[var(--border-color)] space-y-1 bg-[var(--bg-sidebar)]">
          {/* Theme switch button */}
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-lg transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-[var(--accent-purple)]" />
              ) : (
                <Sun className="w-4 h-4 text-[var(--accent-orange)]" />
              )}
              <span>Tema: {theme === 'dark' ? 'Dracula (Gelap)' : 'Terang'}</span>
            </div>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface-active)] text-[var(--text-muted)]">
              Ubah
            </span>
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-lg transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[var(--accent-cyan)]" />
            <span>Pengaturan & Memori</span>
          </button>
        </div>
      </aside>
    </>
  );
};
