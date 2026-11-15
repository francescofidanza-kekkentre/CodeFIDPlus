import React, { useEffect, useState } from 'react';
import {
  Wand2,
  X,
  Github,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ClipboardPaste,
  ChevronRight,
  ChevronLeft,
  Cloud,
  Cpu,
  Loader2,
} from 'lucide-react';
import { AppSettings, GitHubRepo } from '../types';
import { fetchUserRepos } from '../services/githubService';
import { checkAntigravityBridgeHealth } from '../services/aiService';

export interface SetupWizardModalProps {
  isOpen: boolean;
  settings: AppSettings;
  onComplete: (newSettings: AppSettings) => void;
  onSkip: () => void;
}

type WizardStep = 1 | 2 | 3;

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  settings,
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState<AppSettings>(settings);

  // GitHub step state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [verifyingGithub, setVerifyingGithub] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // AI step state
  const [testingAI, setTestingAI] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(settings);
      setStep(1);
      setGithubStatus(null);
      setAiStatus(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const pasteFromClipboard = async (onValue: (val: string) => void) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        onValue(text.trim());
      }
    } catch {
      // Clipboard API may require manual paste on some browsers
    }
  };

  const handleVerifyGithub = async (tokenOverride?: string) => {
    const token = (tokenOverride ?? draft.githubToken).trim();
    if (!token) {
      setGithubStatus({
        ok: false,
        message: 'Incolla prima il tuo GitHub Personal Access Token.',
      });
      return;
    }

    setVerifyingGithub(true);
    setGithubStatus(null);
    try {
      const fetched = await fetchUserRepos(token);
      setRepos(fetched);
      if (fetched.length > 0) {
        const first = fetched[0];
        setDraft((prev) => ({
          ...prev,
          githubToken: token,
          activeOwner: prev.activeOwner || first.owner.login,
          activeRepo: prev.activeRepo || first.name,
          activeBranch: prev.activeBranch || first.default_branch || 'main',
        }));
      }
      setGithubStatus({
        ok: true,
        message: `Token valido! Trovati ${fetched.length} repository pronti per il collegamento.`,
      });
    } catch (err) {
      setGithubStatus({
        ok: false,
        message:
          err instanceof Error
            ? `Token non valido o errore rete: ${err.message}`
            : 'Impossibile verificare il token GitHub.',
      });
    } finally {
      setVerifyingGithub(false);
    }
  };

  const handleTestAI = async () => {
    setTestingAI(true);
    setAiStatus(null);
    try {
      if (draft.aiMode === 'antigravity-bridge') {
        const res = await checkAntigravityBridgeHealth(draft.bridgeUrl);
        if (res.ok) {
          setAiStatus({
            ok: true,
            message: `Bridge Antigravity connesso! SDK: ${
              res.sdkAvailable ? 'Pronto' : 'Modalità fallback'
            }`,
          });
        } else {
          setAiStatus({
            ok: false,
            message: `Bridge non raggiungibile (${res.error}). Verifica l'IP e che antigravity_bridge.py sia avviato.`,
          });
        }
      } else if (draft.aiMode === 'claude-direct') {
        const key = draft.claudeApiKey.trim();
        if (!key) {
          setAiStatus({ ok: false, message: 'Inserisci prima la tua Claude API Key (sk-ant-...).' });
          return;
        }
        const res = await fetch('https://api.anthropic.com/v1/models', {
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        setAiStatus({
          ok: true,
          message: 'Chiave Claude (Anthropic) verificata con successo!',
        });
      } else {
        const key = draft.geminiApiKey.trim();
        if (!key) {
          setAiStatus({ ok: false, message: 'Inserisci prima la tua Gemini API Key (AIzaSy...).' });
          return;
        }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        setAiStatus({
          ok: true,
          message: 'Chiave Gemini verificata con successo!',
        });
      }
    } catch (err) {
      setAiStatus({
        ok: false,
        message: `Verifica fallita (${
          err instanceof Error ? err.message : 'controlla la chiave inserita'
        }).`,
      });
    } finally {
      setTestingAI(false);
    }
  };

  const selectedRepoFull =
    draft.activeOwner && draft.activeRepo ? `${draft.activeOwner}/${draft.activeRepo}` : '';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start sm:items-center justify-center p-3 sm:p-6 pt-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Wand2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Configurazione Guidata CodeFID+
              </h3>
              <p className="text-[11px] text-slate-400">
                Passo {step} di 3 — Collega GitHub e scegli il tuo Assistente AI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSkip}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Chiudi procedura guidata"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Bar */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 grid grid-cols-3 gap-2 text-[11px] font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              step === 1
                ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>1. GitHub</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              step === 2
                ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2. Agente AI</span>
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              step === 3
                ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>3. Conferma</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <Github className="w-4 h-4 text-indigo-400" />
                  <span>Collega il tuo account GitHub personale</span>
                </div>
                <ol className="list-decimal ml-4 space-y-1 text-slate-300 text-[11.5px]">
                  <li>
                    Tocca il pulsante qui sotto: si aprirà <strong>la tua pagina GitHub</strong> con il permesso <code>repo</code> già pre-selezionato.
                  </li>
                  <li>
                    Scorri in fondo alla pagina su GitHub, tocca <strong>Generate token</strong> e copialo.
                  </li>
                  <li>
                    Torna nell'app, premi <strong>Incolla</strong> e poi <strong>Verifica Token</strong> per caricare i tuoi repository.
                  </li>
                </ol>
                <a
                  href="https://github.com/settings/tokens/new?description=CodeFID%2B%20Tablet&scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-semibold transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Apri Pagina Creazione Token GitHub (Precompilato)</span>
                </a>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">
                  GitHub Personal Access Token (PAT)
                </label>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    type="password"
                    value={draft.githubToken}
                    onChange={(e) => setDraft({ ...draft, githubToken: e.target.value })}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-100 font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      pasteFromClipboard((val) => {
                        setDraft((prev) => ({ ...prev, githubToken: val }));
                        handleVerifyGithub(val);
                      })
                    }
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 shrink-0"
                    title="Incolla dagli appunti e verifica"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Incolla</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifyGithub()}
                    disabled={verifyingGithub}
                    className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    {verifyingGithub ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Verifica Token</span>
                  </button>
                </div>

                {githubStatus && (
                  <div
                    className={`flex items-start gap-2 p-2.5 rounded-xl border text-[11px] ${
                      githubStatus.ok
                        ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                    }`}
                  >
                    {githubStatus.ok ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <span>{githubStatus.message}</span>
                  </div>
                )}
              </div>

              {repos.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <label className="block text-slate-200 font-semibold">
                    Seleziona il Repository di partenza
                  </label>
                  <select
                    value={selectedRepoFull}
                    onChange={(e) => {
                      const chosen = repos.find((r) => r.full_name === e.target.value);
                      if (chosen) {
                        setDraft({
                          ...draft,
                          activeOwner: chosen.owner.login,
                          activeRepo: chosen.name,
                          activeBranch: chosen.default_branch || 'main',
                        });
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 outline-none"
                  >
                    {repos.map((r) => (
                      <option key={r.id} value={r.full_name}>
                        {r.full_name} {r.private ? '(Privato)' : '(Pubblico)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDraft({ ...draft, aiMode: 'gemini-direct' });
                    setAiStatus(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    draft.aiMode === 'gemini-direct'
                      ? 'bg-indigo-600/20 border-indigo-500 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Cloud className="w-4 h-4 text-indigo-400" />
                    <span>Gemini Cloud</span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    Diretto dal tablet con API key Google AI Studio.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDraft({ ...draft, aiMode: 'claude-direct' });
                    setAiStatus(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    draft.aiMode === 'claude-direct'
                      ? 'bg-amber-600/20 border-amber-500 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Cloud className="w-4 h-4 text-amber-400" />
                    <span>Claude Cloud</span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    Diretto dal tablet con API key Anthropic.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDraft({ ...draft, aiMode: 'antigravity-bridge' });
                    setAiStatus(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    draft.aiMode === 'antigravity-bridge'
                      ? 'bg-emerald-600/20 border-emerald-500 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Bridge Locale (Avanzato)</span>
                  </div>
                  <p className="text-[11px] opacity-80">
                    Opzionale: collegati al tuo PC su rete LAN / Tailscale.
                  </p>
                </button>
              </div>

              {draft.aiMode === 'gemini-direct' && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200">
                      1. Ottieni la Gemini API Key gratuita/personale
                    </span>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-indigo-300 font-semibold text-[11px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Apri Google AI Studio</span>
                    </a>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <input
                      type="password"
                      value={draft.geminiApiKey}
                      onChange={(e) => setDraft({ ...draft, geminiApiKey: e.target.value })}
                      placeholder="AIzaSy..."
                      className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-slate-100 font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        pasteFromClipboard((val) =>
                          setDraft((prev) => ({ ...prev, geminiApiKey: val }))
                        )
                      }
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Incolla</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestAI}
                      disabled={testingAI}
                      className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
                    >
                      {testingAI ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Testa</span>
                    </button>
                  </div>
                </div>
              )}

              {draft.aiMode === 'claude-direct' && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200">
                      1. Ottieni la Claude API Key su Anthropic Console
                    </span>
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 font-semibold text-[11px]"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Apri Anthropic Console</span>
                    </a>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <input
                      type="password"
                      value={draft.claudeApiKey}
                      onChange={(e) => setDraft({ ...draft, claudeApiKey: e.target.value })}
                      placeholder="sk-ant-..."
                      className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2.5 text-slate-100 font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        pasteFromClipboard((val) =>
                          setDraft((prev) => ({ ...prev, claudeApiKey: val }))
                        )
                      }
                      className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center gap-1.5"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
                      <span>Incolla</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestAI}
                      disabled={testingAI}
                      className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1.5"
                    >
                      {testingAI ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Testa</span>
                    </button>
                  </div>
                </div>
              )}

              {draft.aiMode === 'antigravity-bridge' && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <p className="text-slate-300 text-[11.5px]">
                    Modalità avanzata: se esegui un bridge locale compatibile sul tuo PC (es. <code>antigravity_bridge.py</code>), inserisci qui l'indirizzo IP locale o Tailscale del tuo computer:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={draft.bridgeUrl}
                      onChange={(e) => setDraft({ ...draft, bridgeUrl: e.target.value })}
                      placeholder="http://192.168.1.100:8765"
                      className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-slate-100 font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleTestAI}
                      disabled={testingAI}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      {testingAI ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Testa Bridge</span>
                    </button>
                  </div>
                </div>
              )}

              {aiStatus && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-xl border text-[11px] ${
                    aiStatus.ok
                      ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                  }`}
                >
                  {aiStatus.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{aiStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-100 text-sm">Riepilogo Configurazione</h4>

                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">GitHub Token</span>
                  <span
                    className={`font-semibold ${
                      draft.githubToken.trim() ? 'text-emerald-400' : 'text-amber-300'
                    }`}
                  >
                    {draft.githubToken.trim() ? 'Configurato' : 'Non impostato (Modalità locale)'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Repository attivo</span>
                  <span className="font-mono text-slate-200">
                    {selectedRepoFull
                      ? `${selectedRepoFull} (${draft.activeBranch || 'main'})`
                      : 'Nessuno selezionato'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-slate-400">Assistente AI</span>
                  <span className="font-semibold text-indigo-300">
                    {draft.aiMode === 'gemini-direct'
                      ? draft.geminiApiKey.trim()
                        ? `Gemini Cloud (${draft.geminiModel})`
                        : 'Gemini (Modalità Demo)'
                      : draft.aiMode === 'claude-direct'
                      ? draft.claudeApiKey.trim()
                        ? `Claude Cloud (${draft.claudeModel})`
                        : 'Claude (Modalità Demo)'
                      : `Antigravity Bridge (${draft.bridgeUrl})`}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Tutte le chiavi vengono salvate esclusivamente in locale sul tuo tablet (<code>localStorage</code>). Puoi modificarle in qualsiasi momento dalle Impostazioni (⚙️).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onSkip}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Salta per ora
          </button>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Indietro</span>
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 1 ? 2 : 3))}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shadow-lg shadow-indigo-600/30"
              >
                <span>Avanti</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onComplete(draft)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salva e Inizia</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
