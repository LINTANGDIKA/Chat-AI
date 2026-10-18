'use client';

import React, { useState, useEffect } from 'react';
import { Check, Copy } from 'lucide-react';
import hljs from 'highlight.js';

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', value }) => {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<string>('');

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

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[var(--code-border)] bg-[var(--code-bg)] text-xs shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--code-header)] border-b border-[var(--code-border)] select-none">
        <span className="font-mono text-[11px] font-medium text-[var(--text-muted)] lowercase">
          {language || 'code'}
        </span>
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
