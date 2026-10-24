'use client';

import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage } from '@/lib/types';
import { CodeBlock } from './CodeBlock';
import { exportToWord, exportToPdf } from '@/lib/exportDoc';
import { Bot, User, Copy, Check, FileText, Printer, FileDown } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  modelName?: string;
  isStreaming?: boolean;
}

// Custom plugin to disable 4-space indented code blocks so indented paragraphs and equations don't accidentally turn into raw code boxes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function remarkDisableIndentedCode(this: any) {
  const data = this.data();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function add(field: string, value: any) {
    const list = data[field] ? data[field] : (data[field] = []);
    list.push(value);
  }
  add('micromarkExtensions', {
    disable: {
      null: ['codeIndented'],
    },
  });
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  modelName,
  isStreaming,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const markdownRef = useRef<HTMLDivElement>(null);

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleExportWord = () => {
    if (!markdownRef.current) return;
    const firstLine = cleanContent.split('\n')[0].replace(/^#+\s*/, '').trim();
    const docTitle = firstLine ? firstLine.slice(0, 45) : 'Dokumen Hero AI';
    exportToWord(markdownRef.current, docTitle);
  };

  const handleExportPdf = () => {
    if (!markdownRef.current) return;
    const firstLine = cleanContent.split('\n')[0].replace(/^#+\s*/, '').trim();
    const docTitle = firstLine ? firstLine.slice(0, 45) : 'Dokumen Hero AI';
    exportToPdf(markdownRef.current, docTitle);
  };

  // Clean and sanitize AI text to remove unsightly raw separator artifacts
  const cleanContent = React.useMemo(() => {
    if (isUser) return message.content;

    let text = message.content || '';

    // Remove trailing raw separator dashes (common LLM artifacts like ---- at the end)
    text = text.replace(/(\r?\n|^)\s*[-=_]{3,}\s*$/g, '');

    // Ensure horizontal lines have blank lines around them so they don't accidentally turn preceding text into H2 headers
    text = text.replace(/([^\n])\n\s*[-]{3,}\s*\n/g, '$1\n\n---\n\n');

    // Collapse multiple consecutive horizontal dividers into one
    text = text.replace(/(?:\r?\n\s*[-=_]{3,}\s*){2,}/g, '\n\n---\n\n');

    // 1. Normalize \[ ... \] to display math $$ ... $$ using replacer function
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => {
      return `\n\n$$\n${eq.trim()}\n$$\n\n`;
    });

    // 2. Normalize \( ... \) to inline math $ ... $ using replacer function
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => {
      return `$${eq.trim()}$`;
    });

    // 3. Fix broken inline math that actually contains multi-line aligned equations (e.g. $ ... \end{aligned}$$ or $ ... \end{aligned}$)
    text = text.replace(/\$([^\$\n]*?\\end\{aligned\})\s*\$*/g, (_, inner) => {
      let clean = inner.trim();
      if (!clean.includes('\\begin{aligned}')) {
        clean = '\\begin{aligned}\n' + clean;
      }
      return `\n\n$$\n${clean}\n$$\n\n`;
    });

    // 4. Ensure standalone LaTeX environments not wrapped in $$ are wrapped in $$
    const envPattern = /\\begin\{(aligned|align\*?|cases|[pbBvV]?matrix|gather\*?)\}[\s\S]*?\\end\{\1\}/g;
    text = text.replace(envPattern, (match, env, offset, fullStr) => {
      const before = fullStr.slice(Math.max(0, offset - 10), offset);
      if (before.includes('$$') || before.includes('$')) {
        return match;
      }
      return `\n\n$$\n${match}\n$$\n\n`;
    });

    // 5. In any $$ ... $$ block, fix alignment or environment issues
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => {
      let fixed = inner.trim();

      // If it has \end{aligned} but missing \begin{aligned}
      if (fixed.includes('\\end{aligned}') && !fixed.includes('\\begin{aligned}')) {
        fixed = '\\begin{aligned}\n' + fixed;
      }
      // If it has \begin{aligned} but missing \end{aligned}
      if (fixed.includes('\\begin{aligned}') && !fixed.includes('\\end{aligned}')) {
        fixed = fixed + '\n\\end{aligned}';
      }
      // If it has & alignment points or \\ linebreaks without any \begin{...} environment, wrap in aligned!
      if (fixed.includes('&') && !fixed.includes('\\begin{')) {
        fixed = '\\begin{aligned}\n' + fixed + '\n\\end{aligned}';
      }

      return `\n\n$$\n${fixed}\n$$\n\n`;
    });

    return text;
  }, [message.content, isUser]);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  /* ========================================================
     1. USER MESSAGE (ALIGNED TO THE RIGHT)
     ======================================================== */
  if (isUser) {
    return (
      <div className="w-full py-2.5 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex justify-end items-start gap-2.5 sm:gap-3">
          <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] space-y-1.5">
            {/* Header info */}
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] select-none">
              <span className="text-[11px]">{formattedTime}</span>
              <span className="font-semibold text-[var(--text-primary)]">Anda</span>
            </div>

            {/* Attachments if any */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2 pb-0.5">
                {message.attachments.map((att, idx) => (
                  <div key={idx} className="relative">
                    {att.isImage && att.dataUrl ? (
                      <div className="rounded-lg overflow-hidden border border-[var(--border-color)] max-w-xs shadow-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.dataUrl}
                          alt={att.name}
                          className="max-h-60 w-auto object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--user-bubble-bg)] border border-[var(--user-bubble-border)] text-xs text-[var(--user-bubble-text)]">
                        <FileText className="w-4 h-4 text-[var(--accent-cyan)] shrink-0" />
                        <span className="truncate max-w-[180px] font-mono text-[11px]">{att.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bubble */}
            {message.content && (
              <div className="rounded-2xl rounded-tr-xs px-4 py-2.5 bg-[var(--user-bubble-bg)] border border-[var(--user-bubble-border)] text-[var(--user-bubble-text)] text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap font-sans shadow-2xs select-text">
                {message.content}
              </div>
            )}
          </div>

          {/* User Avatar on Right */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs border bg-[var(--bg-surface-active)] border-[var(--border-color)] text-[var(--text-primary)] mt-0.5 select-none">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  /* ========================================================
     2. AI ASSISTANT MESSAGE (ALIGNED TO THE LEFT)
     ======================================================== */
  return (
    <div className="group w-full py-3.5 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto flex justify-start items-start gap-3 sm:gap-4">
        {/* Assistant Avatar on Left */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs border bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)] mt-0.5 select-none">
          <Bot className="w-4 h-4" />
        </div>

        {/* Message Body */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header info */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] select-none">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                {modelName || 'Hero AI'}
              </span>
              <span className="text-[11px]">{formattedTime}</span>
            </div>

            {!isStreaming && (
              <div className="opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1.5 text-[11px]">
                <button
                  onClick={handleExportWord}
                  className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-[var(--bg-surface-hover)]"
                  title="Unduh sebagai dokumen Word (.doc)"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                  <span className="hidden sm:inline">Word</span>
                </button>

                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-[var(--bg-surface-hover)]"
                  title="Cetak atau simpan sebagai PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-[var(--accent-red)]" />
                  <span className="hidden sm:inline">PDF</span>
                </button>

                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-[var(--bg-surface-hover)]"
                  title="Salin balasan"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                      <span className="text-[var(--accent-green)]">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Salin</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Markdown Content */}
          <div ref={markdownRef} className="markdown-body">
            {cleanContent ? (
              <ReactMarkdown
                remarkPlugins={[remarkDisableIndentedCode, remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  hr: () => (
                    <hr className="my-5 border-t border-[var(--border-color)] opacity-40" />
                  ),
                  code: ({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeContent = String(children).replace(/\n$/, '');

                    if (!inline && (match || codeContent.includes('\n'))) {
                      return (
                        <CodeBlock
                          language={match ? match[1] : ''}
                          value={codeContent}
                        />
                      );
                    }

                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {cleanContent}
              </ReactMarkdown>
            ) : isStreaming ? (
              <div className="flex items-center gap-1.5 py-2 text-[var(--text-muted)]">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
                <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-[var(--accent-pink)] animate-pulse [animation-delay:0.4s]"></span>
              </div>
            ) : (
              <p className="text-[var(--text-muted)] italic text-xs">Tidak ada balasan teks.</p>
            )}
          </div>

          {/* Dedicated Bottom Toolbar for Document Download & Copy */}
          {!isStreaming && cleanContent && (
            <div className="pt-2.5 mt-2 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] text-xs select-none">
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 font-medium">
                <FileDown className="w-3.5 h-3.5 text-[var(--accent)]" /> Unduh Dokumen:
              </span>
              <button
                onClick={handleExportWord}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-[var(--accent-cyan)] transition-colors cursor-pointer text-[11px] font-medium shadow-2xs"
                title="Unduh sebagai dokumen Word (.doc)"
              >
                <FileText className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                <span>Word (.doc)</span>
              </button>
              <button
                onClick={handleExportPdf}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] hover:text-[var(--accent-red)] transition-colors cursor-pointer text-[11px] font-medium shadow-2xs"
                title="Cetak atau simpan sebagai PDF"
              >
                <Printer className="w-3.5 h-3.5 text-[var(--accent-red)]" />
                <span>PDF</span>
              </button>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-primary)] transition-colors cursor-pointer text-[11px] font-medium ml-auto shadow-2xs"
                title="Salin semua teks"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                    <span className="text-[var(--accent-green)]">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
