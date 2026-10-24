'use client';

import React, { useState, useMemo } from 'react';
import { AlertTriangle, Eye, Code, ExternalLink, Copy, Check, Clock } from 'lucide-react';

interface TimeoutHtmlViewProps {
  statusCode?: string;
  pageTitle?: string;
  rawHtml: string;
  fullContent?: string;
}

export const TimeoutHtmlView: React.FC<TimeoutHtmlViewProps> = ({
  statusCode = '524',
  pageTitle = '524: A timeout occurred',
  rawHtml,
  fullContent,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'code'>('view');
  const [copied, setCopied] = useState(false);

  // Process the HTML for the sandboxed iframe to resolve Cloudflare assets properly
  const processedHtml = useMemo(() => {
    let html = rawHtml || '';

    // Replace relative Cloudflare stylesheet with absolute CDN URL
    html = html.replace(
      /href=(["'])\/cdn-cgi\/styles\/main\.css\1/gi,
      'href="https://www.cloudflare.com/cdn-cgi/styles/main.css"'
    );

    // If missing <base>, inject base href so relative assets and links point to cloudflare.com
    if (!/<base\b/i.test(html)) {
      if (/<head>/i.test(html)) {
        html = html.replace(/<head>/i, '<head><base href="https://www.cloudflare.com/">');
      } else {
        html = '<base href="https://www.cloudflare.com/">' + html;
      }
    }

    return html;
  }, [rawHtml]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(fullContent || rawHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy raw error:', err);
    }
  };

  const handleOpenInNewTab = () => {
    try {
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(processedHtml);
        win.document.close();
      }
    } catch (err) {
      console.error('Failed to open window:', err);
    }
  };

  return (
    <div className="w-full my-2.5 rounded-xl border border-amber-500/30 bg-[var(--bg-surface)] overflow-hidden shadow-xs">
      {/* Alert Header */}
      <div className="p-3.5 sm:p-4 bg-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Koneksi Timeout (HTTP {statusCode})
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                {pageTitle.replace(/^.*?\|\s*/, '')}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
              Server API target membutuhkan waktu respons lebih lama dari batas waktu Cloudflare (100 detik), sehingga koneksi diputus oleh gateway.
            </p>
          </div>
        </div>

        {/* View / Code Tabs & Actions */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <div className="flex items-center bg-[var(--bg-surface-active)] p-0.5 rounded-lg border border-[var(--border-color)]">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'view'
                  ? 'bg-[var(--accent)] text-white shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Tampilkan tampilan web visual langsung dari Cloudflare"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Tampilan Web</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-[var(--accent)] text-white shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title="Tampilkan kode HTML mentah"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Kode HTML</span>
            </button>
          </div>

          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
            title="Buka tampilan HTML di tab baru browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Buka Tab Baru</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-3">
        {activeTab === 'view' ? (
          <div className="w-full relative rounded-lg overflow-hidden border border-[var(--border-color)] bg-white shadow-inner">
            <iframe
              srcDoc={processedHtml}
              title="Cloudflare Timeout Error View"
              className="w-full h-[520px] sm:h-[580px] border-0 bg-white"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        ) : (
          <div className="relative">
            <div className="absolute top-2.5 right-2.5 z-10">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shadow-2xs"
                title="Salin kode HTML mentah"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Salin</span>
                  </>
                )}
              </button>
            </div>
            <pre className="max-h-[520px] overflow-auto p-4 rounded-lg bg-[#1e1e2e] text-[#f8f8f2] text-xs font-mono leading-relaxed border border-[var(--border-color)] select-text">
              <code>{rawHtml}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Helpful Hint Footer */}
      <div className="px-4 py-2.5 bg-[var(--bg-surface-hover)]/40 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)] flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          <strong>Saran:</strong> Pertanyaan rumit atau model penalaran (thinking model) membutuhkan waktu pemrosesan lama. Jika Anda mengelola server, naikkan nilai timeout di konfigurasi Cloudflare / Nginx, atau coba kirimkan pesan yang lebih spesifik.
        </span>
      </div>
    </div>
  );
};
