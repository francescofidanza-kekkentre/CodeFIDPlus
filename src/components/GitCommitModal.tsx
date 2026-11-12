import React, { useState } from 'react';
import {
  X,
  GitCommit,
  GitPullRequest,
  FileCode2,
  GitCompare,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { OpenFileTab } from '../types';
import { computeLineDiff } from '../utils/diffEngine';

export interface GitCommitModalProps {
  isOpen: boolean;
  owner: string;
  repo: string;
  branch: string;
  dirtyTabs: OpenFileTab[];
  hasGithubToken: boolean;
  onClose: () => void;
  onInspectDiff: (tab: OpenFileTab) => void;
  onCommitFiles: (message: string, selectedPaths: string[]) => Promise<{ commitSha: string; htmlUrl: string }>;
  onCreatePR: (title: string, body: string, headBranch: string, baseBranch: string) => Promise<{ number: number; html_url: string }>;
  onOpenSettings: () => void;
}

export const GitCommitModal: React.FC<GitCommitModalProps> = ({
  isOpen,
  owner,
  repo,
  branch,
  dirtyTabs,
  hasGithubToken,
  onClose,
  onInspectDiff,
  onCommitFiles,
  onCreatePR,
  onOpenSettings,
}) => {
  const [commitMessage, setCommitMessage] = useState(
    `feat: aggiornamento da CodeFID+ Android Tablet`
  );
  const [selectedPaths, setSelectedPaths] = useState<Record<string, boolean>>({});
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ commitSha: string; htmlUrl: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // PR state
  const [showPrForm, setShowPrForm] = useState(false);
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('Pull Request creata da CodeFID+ con Antigravity AI.');
  const [prBase, setPrBase] = useState('main');
  const [prResult, setPrResult] = useState<{ number: number; html_url: string } | null>(null);

  if (!isOpen) return null;

  const isSelected = (path: string) =>
    selectedPaths[path] === undefined ? true : selectedPaths[path];

  const toggleSelect = (path: string) => {
    setSelectedPaths((prev) => ({ ...prev, [path]: !isSelected(path) }));
  };

  const activeSelectedPaths = dirtyTabs
    .filter((t) => isSelected(t.path))
    .map((t) => t.path);

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSelectedPaths.length === 0 || !commitMessage.trim()) return;
    setIsCommitting(true);
    setErrorMsg('');
    try {
      const res = await onCommitFiles(commitMessage.trim(), activeSelectedPaths);
      setCommitResult(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prTitle.trim()) return;
    setIsCommitting(true);
    setErrorMsg('');
    try {
      const res = await onCreatePR(prTitle.trim(), prBody.trim(), branch, prBase.trim() || 'main');
      setPrResult(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GitCommit className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                GitHub Commit & Pull Request
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {owner}/{repo} • branch: <span className="text-emerald-300">{branch}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!hasGithubToken && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 flex items-center justify-between gap-3">
              <span>
                Per salvare i commit su GitHub devi inserire un Personal Access Token (PAT) con permessi <code>repo</code>.
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold shrink-0"
              >
                Configura Token
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {commitResult && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Commit pubblicato con successo! (<code>{commitResult.commitSha.slice(0, 7)}</code>)
                </span>
              </div>
              <a
                href={commitResult.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-emerald-300 underline font-semibold"
              >
                <span>Apri su GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Modified Files List */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>File modificati nella sessione ({dirtyTabs.length})</span>
            </div>

            {dirtyTabs.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800 text-center text-xs text-slate-400">
                Nessun file con modifiche in sospeso.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {dirtyTabs.map((tab) => {
                  const diff = computeLineDiff(tab.originalContent, tab.content);
                  return (
                    <div
                      key={tab.path}
                      className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected(tab.path)}
                          onChange={() => toggleSelect(tab.path)}
                          className="w-4 h-4 rounded accent-indigo-500"
                        />
                        <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-mono text-slate-200 truncate">{tab.path}</span>
                      </label>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[11px] text-emerald-400">
                          +{diff.addedCount}
                        </span>
                        <span className="font-mono text-[11px] text-rose-400">
                          -{diff.removedCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => onInspectDiff(tab)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1"
                        >
                          <GitCompare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Diff</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Commit Form */}
          <form onSubmit={handleCommit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Messaggio di Commit
              </label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="feat: descrizione delle modifiche..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPrForm((v) => !v)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <GitPullRequest className="w-4 h-4 text-indigo-400" />
                <span>{showPrForm ? 'Nascondi Pull Request' : 'Crea Pull Request'}</span>
              </button>

              <button
                type="submit"
                disabled={isCommitting || activeSelectedPaths.length === 0}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
              >
                <GitCommit className="w-4 h-4" />
                <span>
                  {isCommitting
                    ? 'Salvataggio su GitHub...'
                    : `Commit & Push (${activeSelectedPaths.length} file)`}
                </span>
              </button>
            </div>
          </form>

          {/* Optional Pull Request Form */}
          {showPrForm && (
            <form
              onSubmit={handleCreatePR}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-3"
            >
              <h4 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <GitPullRequest className="w-4 h-4" />
                <span>Apri Pull Request da "{branch}"</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Titolo PR</label>
                  <input
                    type="text"
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    placeholder={`Merge ${branch} in main`}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Branch Base</label>
                  <input
                    type="text"
                    value={prBase}
                    onChange={(e) => setPrBase(e.target.value)}
                    placeholder="main"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                  />
                </div>
              </div>
              <textarea
                rows={2}
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
              />
              {prResult && (
                <div className="text-xs text-emerald-300 flex items-center justify-between">
                  <span>Pull Request #{prResult.number} creata!</span>
                  <a
                    href={prResult.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-semibold"
                  >
                    Visualizza su GitHub
                  </a>
                </div>
              )}
              <button
                type="submit"
                disabled={isCommitting || !prTitle.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold"
              >
                Invia Pull Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
