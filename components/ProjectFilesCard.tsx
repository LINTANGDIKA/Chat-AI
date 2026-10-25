'use client';

import React, { useState } from 'react';
import { ProjectFile, exportProjectToZip, downloadSingleFile } from '@/lib/exportZip';
import {
  FolderArchive,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileCode,
  FileText,
  FileJson,
} from 'lucide-react';

interface ProjectFilesCardProps {
  files: ProjectFile[];
  projectTitle?: string;
}

function getFileIcon(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) {
    return <FileJson className="w-3.5 h-3.5 text-amber-400" />;
  }
  if (/\.(tsx|ts|jsx|js|py|go|rs|html|css)$/i.test(lower)) {
    return <FileCode className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />;
  }
  return <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
}

export const ProjectFilesCard: React.FC<ProjectFilesCardProps> = ({
  files,
  projectTitle = 'proyek-hero-ai',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  if (!files || files.length === 0) return null;

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await exportProjectToZip(files, projectTitle);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Failed to export zip:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyFile = async (file: ProjectFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedPath(file.path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error('Failed to copy file:', err);
    }
  };

  return (
    <div className="my-3.5 rounded-xl border border-[var(--accent)]/30 bg-[var(--bg-surface)] overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-3.5 sm:p-4 bg-[var(--accent)]/10 border-b border-[var(--accent)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0">
            <FolderArchive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Paket Proyek Aplikasi
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] font-medium">
                {files.length} berkas
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Struktur proyek lengkap terdeteksi. Siap diunduh dan dijalankan secara lokal.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs font-medium transition-colors cursor-pointer"
            title={isExpanded ? 'Sembunyikan daftar berkas' : 'Lihat daftar berkas'}
          >
            <span>Berkas</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Unduh seluruh struktur file proyek dalam satu arsip .zip"
          >
            {downloaded ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Terunduh!</span>
              </>
            ) : (
              <>
                <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                <span>{isDownloading ? 'Membuat ZIP...' : 'Unduh Project (.zip)'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible File List */}
      {isExpanded && (
        <div className="divide-y divide-[var(--border-subtle)] max-h-72 overflow-y-auto">
          {files.map((file, idx) => {
            const isCopied = copiedPath === file.path;
            const lineCount = file.content.split('\n').length;

            return (
              <div
                key={idx}
                className="flex items-center justify-between px-3.5 py-2 hover:bg-[var(--bg-surface-hover)] transition-colors text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  {getFileIcon(file.name)}
                  <span className="font-mono text-[12px] text-[var(--text-primary)] truncate font-medium">
                    {file.path}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] shrink-0 hidden sm:inline">
                    ({lineCount} baris)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--bg-surface-active)] text-[var(--text-muted)] border border-[var(--border-color)]">
                    {file.language || 'code'}
                  </span>

                  <button
                    onClick={() => handleCopyFile(file)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer"
                    title={`Salin isi berkas ${file.path}`}
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => downloadSingleFile(file)}
                    className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-cyan)] rounded hover:bg-[var(--bg-surface-active)] transition-colors cursor-pointer"
                    title={`Unduh berkas ${file.name} saja`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
