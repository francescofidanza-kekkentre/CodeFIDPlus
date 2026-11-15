import React, { useState } from 'react';
import {
  X,
  Settings,
  Github,
  Cpu,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Tablet,
} from 'lucide-react';
import { AppSettings } from '../types';
import { checkAntigravityBridgeHealth } from '../services/aiService';

export interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [bridgeStatus, setBridgeStatus] = useState<{
    checked: boolean;
    ok: boolean;
    message: string;
  }>({ checked: false, ok: false, message: '' });
  const [testingBridge, setTestingBridge] = useState(false);

  if (!isOpen) return null;

  const handleTestBridge = async () => {
    setTestingBridge(true);
    const res = await checkAntigravityBridgeHealth(draft.bridgeUrl);
    setTestingBridge(false);
    if (res.ok) {
      setBridgeStatus({
        checked: true,
        ok: true,
        message: `Bridge attivo! SDK google-antigravity: ${
          res.sdkAvailable ? 'Installato e pronto' : 'Modalità fallback attiva'
        }`,
      });
    } else {
      setBridgeStatus({
        checked: true,
        ok: false,
        message: `Non raggiungibile (${res.error}). Avvia "python backend/antigravity_bridge.py" sul PC.`,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <form
        onSubmit={handleSubmit}
        className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Impostazioni CodeFID+ (Git &amp; Assistente AI Ibrido)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* 1. GitHub Configuration */}
          <section className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-100">
              <Github className="w-4 h-4 text-indigo-400" />
              <span>1. Connessione GitHub API</span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                GitHub Personal Access Token (PAT)
              </label>
              <input
                type="password"
                value={draft.githubToken}
                onChange={(e) => setDraft({ ...draft, githubToken: e.target.value })}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Salvato solo localmente sul tuo tablet (localStorage). Permette di leggere/scrivere repository privati ed eseguire commit multi-file.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-400 mb-1">Owner / Utente</label>
                <input
                  type="text"
                  value={draft.activeOwner}
                  onChange={(e) => setDraft({ ...draft, activeOwner: e.target.value })}
                  placeholder="es. username"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Repository</label>
                <input
                  type="text"
                  value={draft.activeRepo}
                  onChange={(e) => setDraft({ ...draft, activeRepo: e.target.value })}
                  placeholder="es. mio-repository"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Branch predefinito</label>
                <input
                  type="text"
                  value={draft.activeBranch}
                  onChange={(e) => setDraft({ ...draft, activeBranch: e.target.value })}
                  placeholder="main"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>
          </section>

          {/* 2. Hybrid Antigravity AI Configuration */}
          <section className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-100">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>2. Architettura Ibrida Antigravity AI</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, aiMode: 'gemini-direct' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  draft.aiMode === 'gemini-direct'
                    ? 'bg-indigo-600/20 border-indigo-500 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Cloud className="w-4 h-4 text-indigo-400" />
                  <span>PWA Autonoma (Gemini)</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Chiama Google Gemini direttamente dal browser del tablet senza PC acceso.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDraft({ ...draft, aiMode: 'claude-direct' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  draft.aiMode === 'claude-direct'
                    ? 'bg-amber-600/20 border-amber-500 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Cloud className="w-4 h-4 text-amber-400" />
                  <span>PWA Autonoma (Claude)</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Chiama Anthropic Claude direttamente dal tablet tramite API key personale.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setDraft({ ...draft, aiMode: 'antigravity-bridge' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  draft.aiMode === 'antigravity-bridge'
                    ? 'bg-emerald-600/20 border-emerald-500 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>Antigravity Python SDK Bridge</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Si collega al server Python locale (<code>google-antigravity</code>) sulla tua rete LAN / Tailscale.
                </p>
              </button>
            </div>

            {draft.aiMode === 'gemini-direct' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Gemini API Key (Google AI Studio)
                  </label>
                  <input
                    type="password"
                    value={draft.geminiApiKey}
                    onChange={(e) => setDraft({ ...draft, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Modello</label>
                  <select
                    value={draft.geminiModel}
                    onChange={(e) => setDraft({ ...draft, geminiModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none"
                  >
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  </select>
                </div>
              </div>
            ) : draft.aiMode === 'claude-direct' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Claude API Key (Anthropic Console)
                  </label>
                  <input
                    type="password"
                    value={draft.claudeApiKey}
                    onChange={(e) => setDraft({ ...draft, claudeApiKey: e.target.value })}
                    placeholder="sk-ant-..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Modello Claude</label>
                  <select
                    value={draft.claudeModel}
                    onChange={(e) => setDraft({ ...draft, claudeModel: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 outline-none"
                  >
                    <option value="claude-sonnet-4-20250514">claude-sonnet-4-20250514</option>
                    <option value="claude-3-7-sonnet-20250219">claude-3-7-sonnet-20250219</option>
                    <option value="claude-3-5-haiku-20241022">claude-3-5-haiku-20241022</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <label className="block text-slate-300 font-medium">
                  URL del Bridge Antigravity SDK (es. PC su LAN o Tailscale)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={draft.bridgeUrl}
                    onChange={(e) => setDraft({ ...draft, bridgeUrl: e.target.value })}
                    placeholder="http://192.168.1.100:8765"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestBridge}
                    disabled={testingBridge}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold shrink-0"
                  >
                    {testingBridge ? 'Verifica...' : 'Test Connessione'}
                  </button>
                </div>
                {bridgeStatus.checked && (
                  <div
                    className={`flex items-center gap-1.5 text-[11px] ${
                      bridgeStatus.ok ? 'text-emerald-300' : 'text-amber-300'
                    }`}
                  >
                    {bridgeStatus.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{bridgeStatus.message}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. Ergonomia Tablet Android */}
          <section className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-100">
              <Tablet className="w-4 h-4 text-indigo-400" />
              <span>3. Ergonomia Editor Tablet Android</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={draft.showTouchBar}
                  onChange={(e) => setDraft({ ...draft, showTouchBar: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span>Mostra Barra Simboli Rapida sopra la tastiera</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={draft.wordWrap}
                  onChange={(e) => setDraft({ ...draft, wordWrap: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span>A capo automatico (Word Wrap)</span>
              </label>
            </div>
          </section>

          {/* Note Legali e Marchi */}
          <div className="pt-2 text-[10px] text-slate-500 leading-relaxed border-t border-slate-800/60">
            CodeFID+ è un software indipendente. GitHub® è un marchio registrato di GitHub, Inc. Google® e Gemini™ sono marchi di Google LLC. Anthropic® e Claude™ sono marchi di Anthropic, PBC. L'applicazione non è affiliata né sponsorizzata da GitHub, Inc., Google LLC o Anthropic, PBC.
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Annulla
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
          >
            Salva e Applica
          </button>
        </div>
      </form>
    </div>
  );
};
