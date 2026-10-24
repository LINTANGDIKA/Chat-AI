'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Paperclip, ArrowUp, Square, X, FileText } from 'lucide-react';
import { MessageAttachment, AIModel } from '@/lib/types';

interface ChatInputProps {
  onSendMessage: (text: string, attachments: MessageAttachment[]) => void;
  onStop: () => void;
  isGenerating: boolean;
  models: AIModel[];
  currentModel: string;
  onSelectModel: (modelId: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStop,
  isGenerating,
  models,
  currentModel,
  onSelectModel,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  const handleProcessFile = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name || `image-${Date.now()}.png`,
            type: file.type || 'image/png',
            isImage: true,
            dataUrl,
          },
        ]);
      };
      reader.readAsDataURL(file);
    } else if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
      // Automatic Excel spreadsheet parser into clean structured tabular text for AI
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          let sheetsText = '';
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            if (csv.trim()) {
              sheetsText += `[Lembar Kerja: ${sheetName}]\n${csv.trim()}\n\n`;
            }
          });

          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              isImage: false,
              content: sheetsText.trim() || 'File Excel kosong atau tidak memiliki data.',
            },
          ]);
        } catch (err) {
          console.error('Failed to parse Excel file:', err);
          const fallbackReader = new FileReader();
          fallbackReader.onload = (fe) => {
            setAttachments((prev) => [
              ...prev,
              {
                name: file.name,
                type: file.type || 'text/plain',
                isImage: false,
                content: fe.target?.result as string,
              },
            ]);
          };
          fallbackReader.readAsText(file);
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      // Automatic PDF parser: extract clean text page-by-page for AI
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const { extractText } = await import('unpdf');
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const result = await extractText(data);
          const pages = Array.isArray(result.text) ? result.text : [result.text];
          let docText = `[Dokumen PDF: ${file.name} - Total ${result.totalPages || pages.length} Halaman]\n\n`;
          let pageCountWithText = 0;

          pages.forEach((pageContent, idx) => {
            const cleanPage = (pageContent || '').trim();
            if (cleanPage) {
              pageCountWithText++;
              docText += `--- Halaman ${idx + 1} ---\n${cleanPage}\n\n`;
            }
          });

          if (pageCountWithText === 0) {
            docText += `(Perhatian: Dokumen PDF ini tidak memiliki lapisan teks yang dapat diekstrak. File mungkin merupakan hasil scan gambar tanpa teks OCR).`;
          }

          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              type: 'application/pdf',
              isImage: false,
              content: docText.trim(),
            },
          ]);
        } catch (err) {
          console.error('Failed to parse PDF document:', err);
          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              type: 'application/pdf',
              isImage: false,
              content: `[Dokumen PDF: ${file.name}]\n(Gagal membaca teks dari berkas PDF ini. Dokumen mungkin dikunci kata sandi atau rusak).`,
            },
          ]);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || 'text/plain',
            isImage: false,
            content,
          },
        ]);
      };
      reader.readAsText(file);
    }
  }, []);

  // Handle Clipboard Paste (Ctrl+V) for screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
            const renamed = new File([file], `screenshot-${timeStr}.png`, { type: file.type });
            handleProcessFile(renamed);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleProcessFile]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => handleProcessFile(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGenerating) return;

    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;

    onSendMessage(trimmed, attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((f) => handleProcessFile(f));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 select-none">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col rounded-2xl border transition-all duration-200 shadow-md ${
          isDragging
            ? 'border-[var(--accent)] bg-[var(--bg-surface-hover)]'
            : 'border-[var(--border-color)] bg-[var(--bg-input)] focus-within:border-[var(--accent)]/70'
        }`}
      >
        {/* Top bar inside input: model selector & attachment count */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1 text-xs">
          <div className="flex items-center gap-1.5">
            <select
              value={currentModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="bg-transparent text-[var(--accent-cyan)] font-medium text-xs rounded-md border-0 focus:outline-none cursor-pointer hover:opacity-80 transition-opacity"
            >
              {models.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                  className="bg-[var(--bg-sidebar)] text-[var(--text-primary)]"
                >
                  {m.name || m.id}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] hidden sm:block">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-active)] font-mono text-[10px]">Enter</kbd> untuk kirim, <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-active)] font-mono text-[10px]">Shift+Enter</kbd> baris baru
          </div>
        </div>

        {/* Attachment chips preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 py-1.5 border-t border-[var(--border-subtle)]">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-[var(--bg-surface-active)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] animate-in fade-in"
              >
                {att.isImage && att.dataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-5 h-5 rounded object-cover border border-[var(--border-color)]"
                  />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                )}
                <span className="truncate max-w-[130px] font-mono text-[11px]">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors p-0.5 cursor-pointer"
                  title="Hapus lampiran"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Textarea & Controls */}
        <div className="flex items-end gap-2 px-3 pb-2.5 pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            className="hidden"
            accept="image/*,.pdf,.xlsx,.xls,.csv,.txt,.md,.json,.js,.ts,.tsx,.py,.html,.css,.sql,.go,.rs"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer shrink-0"
            title="Unggah file atau gambar"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan apa saja atau tempel screenshot (Ctrl+V)..."
            rows={1}
            className="flex-1 bg-transparent border-0 focus:outline-none resize-none text-[14px] leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)] max-h-40 py-1.5 custom-scrollbar font-sans select-text"
          />

          <div className="shrink-0 flex items-center">
            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 hover:bg-[var(--accent-red)]/25 text-[var(--accent-red)] rounded-xl text-xs font-medium transition-colors cursor-pointer"
                title="Hentikan balasan"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!text.trim() && attachments.length === 0}
                className="p-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                title="Kirim pesan"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
