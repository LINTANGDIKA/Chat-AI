'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Check, Copy, Download, FileCode } from 'lucide-react';
import hljs from 'highlight.js';

interface CodeBlockProps {
  language?: string;
  value: string;
  filename?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', value, filename }) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>('');

  // Auto-detect filename from first line comment if not provided
  const detectedFilename = useMemo(() => {
    if (filename) return filename;
    const firstLine = value.split('\n')[0].trim();
    const commentMatch = firstLine.match(
      /^(?:\/\/|#|\/\*|<!--)\s*(?:filepath:\s*|filename:\s*|file:\s*)?`?([a-zA-Z0-9_./\\-]+\.[a-zA-Z0-9]+)`?(?:\s*\*\/|\s*-->)?$/i
    );
    if (commentMatch) {
      return commentMatch[1];
    }
    return '';
  }, [value, filename]);

  useEffect(() => {
    try {
      if (language && hljs.getLanguage(language)) {
        const highlighted = hljs.highlight(value, { language }).value;
        setHighlightedCode(highlighted);
      } else {
        const auto = hljs.highlightAuto(value).value;
        setHighlightedCode(auto);
      }
    } catch {
      setHighlightedCode('');
    }
  }, [value, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([value], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = detectedFilename
        ? detectedFilename.split('/').pop()
        : `code-${Date.now()}.${language === 'typescript' || language === 'tsx' ? 'tsx' : language || 'txt'}`;

      a.href = url;
      a.download = safeName || 'code.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error('Failed to download code:', err);
    }
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[var(--code-border)] bg-[var(--code-bg)] text-xs shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--code-header)] border-b border-[var(--code-border)] select-none">
        <div className="flex items-center gap-1.5 min-w-0 pr-2">
          {detectedFilename ? (
            <>
              <FileCode className="w-3.5 h-3.5 text-[var(--accent-cyan)] shrink-0" />
              <span className="font-mono text-[11px] font-medium text-[var(--text-primary)] truncate">
                {detectedFilename}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-mono uppercase px-1 py-0.2 rounded bg-[var(--bg-surface-active)]">
                {language || 'code'}
              </span>
            </>
          ) : (
            <span className="font-mono text-[11px] font-medium text-[var(--text-muted)] lowercase">
              {language || 'code'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors px-1.5 py-0.5 rounded cursor-pointer"
            title="Unduh berkas kode ini"
          >
            {downloaded ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-1.5 py-0.5 rounded cursor-pointer"
            title="Salin kode"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[var(--accent-green)]" />
                <span className="text-[var(--accent-green)] font-medium">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin</span>
              </>
            )}
          </button>
        </div>
      </div>

      <pre className="p-3.5 overflow-x-auto font-mono text-[13px] leading-relaxed">
        {highlightedCode ? (
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        ) : (
          <code>{value}</code>
        )}
      </pre>
    </div>
  );
};
