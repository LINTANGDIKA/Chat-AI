'use client';

import React, { useState } from 'react';
import { AppConfig, AIModel, Conversation } from '@/lib/types';
import {
  X,
  Sliders,
  Brain,
  Database,
  CloudDownload,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Activity,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSaveConfig: (newConfig: AppConfig) => void;
  conversations: Conversation[];
  onImportConversations: (imported: Conversation[], memory?: string) => void;
  onClearAllConversations: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  conversations,
  onImportConversations,
  onClearAllConversations,
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'params' | 'memory' | 'data'>('api');

  // Form State
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [showApiKey, setShowApiKey] = useState(false);
  const [useProxy, setUseProxy] = useState(config.useProxy);
  const [models, setModels] = useState<AIModel[]>(config.models);
  const [currentModel, setCurrentModel] = useState(config.currentModel);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  const [temperature, setTemperature] = useState(config.temperature);
  const [stream, setStream] = useState(config.stream);
  const [longTermMemory, setLongTermMemory] = useState(config.longTermMemory);

  // Testing & Model Fetching State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  if (!isOpen) return null;

  const handleAddModel = () => {
    setModels((prev) => [...prev, { id: '', name: '' }]);
  };

  const handleUpdateModel = (index: number, field: 'id' | 'name', value: string) => {
    setModels((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteModel = (index: number) => {
    if (models.length <= 1) {
      alert('Minimal harus ada 1 model terdaftar!');
      return;
    }
    setModels((prev) => prev.filter((_, i) => i !== index));
  };

  const getTargetUrl = (target: string) => {
    const clean = target.trim().replace(/\/+$/, '');
    if (!useProxy) return clean;
    return `/api/proxy?url=${encodeURIComponent(clean)}`;
  };

  // Test API Connection
  const handleTestConnection = async () => {
    const target = baseUrl.trim().replace(/\/+$/, '');
    if (!target) {
      setTestResult({ success: false, message: 'Base URL belum diisi.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim().replace(/^bearer\s+/i, '')}`;
    }

    try {
      const startTime = performance.now();
      const res = await fetch(getTargetUrl(`${target}/models`), {
        method: 'GET',
        headers,
      });

      const latency = Math.round(performance.now() - startTime);

      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data.data) ? data.data.length : (Array.isArray(data) ? data.length : 0);
        setTestResult({
          success: true,
          message: `Koneksi Berhasil! (HTTP ${res.status} OK)\nLatency: ${latency}ms\nModel terdeteksi: ${count} model.`,
        });
      } else {
        const errText = await res.text();
        setTestResult({
          success: false,
          message: `HTTP ${res.status} (${res.statusText})\n${errText.slice(0, 250)}`,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setTestResult({
        success: false,
        message: `Gagal menghubungi endpoint:\n${error.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Auto-fetch models from API
  const handleFetchModels = async () => {
    const target = baseUrl.trim().replace(/\/+$/, '');
    if (!target) {
      alert('Masukkan Base URL terlebih dahulu.');
      return;
    }

    setIsFetchingModels(true);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim().replace(/^bearer\s+/i, '')}`;
    }

    try {
      const res = await fetch(getTargetUrl(`${target}/models`), {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      let list: Array<{ id: string; name?: string }> = [];
      if (Array.isArray(data.data)) list = data.data;
      else if (Array.isArray(data)) list = data;

      if (list.length === 0) {
        alert('Tidak ada model yang dikembalikan dari endpoint.');
      } else {
        const mapped = list.map((item) => ({
          id: item.id,
          name: item.name || item.id,
        }));
        setModels(mapped);
        if (!mapped.some((m) => m.id === currentModel)) {
          setCurrentModel(mapped[0].id);
        }
        alert(`Berhasil memuat ${mapped.length} model dari API!`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Gagal mengambil model:\n${error.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Save Config
  const handleSave = () => {
    const validModels = models.filter((m) => m.id.trim());
    const finalModels = validModels.length > 0 ? validModels : [{ id: 'ai', name: 'Hero AI' }];

    const newConfig: AppConfig = {
      ...config,
      baseUrl: baseUrl.trim().replace(/\/+$/, ''),
      apiKey: apiKey.trim().replace(/^bearer\s+/i, ''),
      useProxy,
      models: finalModels,
      currentModel: finalModels.some((m) => m.id === currentModel)
        ? currentModel
        : finalModels[0].id,
      systemPrompt: systemPrompt.trim(),
      temperature,
      stream,
      longTermMemory: longTermMemory.trim(),
    };

    onSaveConfig(newConfig);
    onClose();
  };

  // Export JSON
  const handleExportJson = () => {
    const exportData = {
      app: 'Hero AI',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      config: {
        baseUrl,
        currentModel,
        systemPrompt,
        temperature,
        longTermMemory,
      },
      conversations,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hero-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const incomingConvs = parsed.conversations || [];
        const incomingMemory = parsed.config?.longTermMemory || parsed.longTermMemory;

        if (Array.isArray(incomingConvs) && incomingConvs.length > 0) {
          onImportConversations(incomingConvs, incomingMemory);
          if (incomingMemory) setLongTermMemory(incomingMemory);
          alert(`Berhasil mengimpor ${incomingConvs.length} percakapan!`);
        } else {
          alert('Tidak ditemukan data percakapan yang valid dalam file JSON.');
        }
      } catch (err: unknown) {
        const error = err as Error;
        alert(`Format file JSON tidak valid:\n${error.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Pengaturan & Kredensial</h2>
              <p className="text-[11px] text-[var(--text-muted)]">Konfigurasi API, Model, dan Memori AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-hover)] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--border-color)] px-5 pt-2 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('api')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'api'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Koneksi & Model</span>
          </button>

          <button
            onClick={() => setActiveTab('params')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'params'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parameter AI</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'memory'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Memori Jangka Panjang</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`pb-2.5 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'data'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Data & Backup</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar">
          {/* TAB 1: API & MODELS */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* Connection Test Box */}
              <div className="p-3 rounded-xl bg-[var(--bg-surface-hover)] border border-[var(--border-color)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] block">Uji Koneksi Server</span>
                    <span className="text-[11px] text-[var(--text-muted)]">Verifikasi Base URL dan API Key</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Menguji...' : 'Test Connection'}</span>
                  </button>
                </div>

                {testResult && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] font-mono whitespace-pre-wrap flex items-start gap-2 ${
                      testResult.success
                        ? 'bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)]'
                        : 'bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)]'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Base URL */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-primary)] flex justify-between">
                  <span>Base URL</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-normal">
                    Contoh: https://hero-ai.zero-hero.biz.id/v1
                  </span>
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent)] rounded-lg px-3 py-2 text-[var(--text-primary)] outline-none text-xs"
                />
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-primary)] flex justify-between">
                  <span>API Key</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-normal">
                    Tersimpan aman di browser Anda
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent)] rounded-lg px-3 py-2 pr-9 text-[var(--text-primary)] outline-none font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Proxy Setting */}
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg-surface-hover)] border border-[var(--border-color)] cursor-pointer">
                <div>
                  <span className="font-semibold text-[var(--text-primary)] block">
                    Gunakan Next.js Server Proxy (/api/proxy)
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Mencegah pemblokiran CORS saat mengakses API dari browser
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => setUseProxy(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
              </label>

              {/* Models Manager */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-semibold text-[var(--text-primary)] block">Daftar Model</label>
                    <span className="text-[11px] text-[var(--text-muted)]">Model yang dapat dipilih di chat</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleFetchModels}
                      disabled={isFetchingModels}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-active)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-[11px] transition-colors cursor-pointer"
                    >
                      <CloudDownload className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                      <span>{isFetchingModels ? 'Mengambil...' : 'Ambil dari API'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddModel}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--accent)] text-[var(--accent-text)] font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar p-1">
                  {models.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border-color)]"
                    >
                      <input
                        type="text"
                        value={m.id}
                        onChange={(e) => handleUpdateModel(idx, 'id', e.target.value)}
                        placeholder="Model ID (cth: ai)"
                        className="flex-1 bg-transparent px-2 py-1 text-xs text-[var(--text-primary)] outline-none border-b border-transparent focus:border-[var(--accent)] font-mono"
                      />
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => handleUpdateModel(idx, 'name', e.target.value)}
                        placeholder="Nama Tampilan"
                        className="flex-1 bg-transparent px-2 py-1 text-xs text-[var(--text-primary)] outline-none border-b border-transparent focus:border-[var(--accent)]"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteModel(idx)}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors cursor-pointer"
                        title="Hapus model"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETERS */}
          {activeTab === 'params' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-primary)] block">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  placeholder="Instruksi sistem untuk AI..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent)] rounded-lg p-2.5 text-[var(--text-primary)] outline-none resize-none text-xs leading-relaxed"
                />
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-surface-hover)] border border-[var(--border-color)]">
                <div className="flex justify-between font-semibold text-[var(--text-primary)]">
                  <span>Temperature: {temperature}</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-normal">
                    {temperature < 0.4 ? 'Presisi & Kritis' : temperature > 0.8 ? 'Sangat Kreatif' : 'Seimbang'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface-hover)] border border-[var(--border-color)] cursor-pointer">
                <div>
                  <span className="font-semibold text-[var(--text-primary)] block">Streaming Response</span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Tampilkan teks balasan AI secara real-time saat diproses
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={stream}
                  onChange={(e) => setStream(e.target.checked)}
                  className="w-4 h-4 accent-[var(--accent)]"
                />
              </label>
            </div>
          )}

          {/* TAB 3: LONG-TERM MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[11px] text-[var(--text-primary)] leading-relaxed">
                <span className="font-semibold text-[var(--accent)] block mb-1">
                  💡 Apa itu Memori Jangka Panjang?
                </span>
                Catatan di bawah akan selalu otomatis diinjeksi ke dalam instruksi AI di setiap obrolan. Tuliskan preferensi Anda, gaya jawaban favorit, nama, atau detail penting agar AI selalu mengingatnya.
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--text-primary)] block">Catatan Memori AI</label>
                <textarea
                  value={longTermMemory}
                  onChange={(e) => setLongTermMemory(e.target.value)}
                  rows={6}
                  placeholder="Contoh: Nama saya Lintang. Saya menyukai jawaban langsung ke intinya, rapi, dan terstruktur. Jangan bertele-tele..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] focus:border-[var(--accent)] rounded-lg p-3 text-[var(--text-primary)] outline-none text-xs leading-relaxed custom-scrollbar"
                />
              </div>
            </div>
          )}

          {/* TAB 4: DATA & BACKUP */}
          {activeTab === 'data' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--bg-surface-hover)] hover:bg-[var(--bg-surface-active)] border border-[var(--border-color)] transition-colors cursor-pointer text-center"
                >
                  <Download className="w-5 h-5 text-[var(--accent-cyan)]" />
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] block text-xs">
                      Export ke JSON
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Unduh riwayat & memori ke file
                    </span>
                  </div>
                </button>

                <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[var(--bg-surface-hover)] hover:bg-[var(--bg-surface-active)] border border-[var(--border-color)] transition-colors cursor-pointer text-center">
                  <Upload className="w-5 h-5 text-[var(--accent-green)]" />
                  <div>
                    <span className="font-semibold text-[var(--text-primary)] block text-xs">
                      Import dari JSON
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      Muat riwayat obrolan lama
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA riwayat percakapan? Tindakan ini tidak dapat dibatalkan.')) {
                      onClearAllConversations();
                      onClose();
                    }
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 hover:bg-[var(--accent-red)]/20 text-[var(--accent-red)] font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua Riwayat Percakapan</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-xs transition-colors cursor-pointer"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
};
