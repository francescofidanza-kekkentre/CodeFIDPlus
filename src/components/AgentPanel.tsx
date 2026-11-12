import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Check,
  GitCompare,
  Cpu,
  Cloud,
  ChevronDown,
  ChevronRight,
  Terminal,
  Trash2,
  FileCode,
  RotateCcw,
} from 'lucide-react';
import {
  AIMode,
  ChatMessage,
  CodeProposal,
  OpenFileTab,
} from '../types';

export interface AgentPanelProps {
  messages: ChatMessage[];
  isThinking: boolean;
  aiMode: AIMode;
  hasGeminiKey: boolean;
  bridgeConnected: boolean;
  activeTab?: OpenFileTab;
  selectedSnippet: string;
  onClearSnippet: () => void;
  onSendPrompt: (prompt: string) => void;
  onClearChat: () => void;
  onApplyProposal: (messageId: string, proposal: CodeProposal) => void;
  onRevertProposal: (messageId: string, proposal: CodeProposal) => void;
  onPreviewProposalDiff: (proposal: CodeProposal, messageId: string) => void;
  onOpenSettings: () => void;
}

const QUICK_TABLET_PROMPTS = [
  'Spiega questo file e la sua architettura',
  'Trova possibili bug e proponi il fix',
  'Ottimizza e rifattorizza con TypeScript strict',
  'Aggiungi gestione errori e commenti JSDoc',
  'Genera una funzione helper di test',
];

export const AgentPanel: React.FC<AgentPanelProps> = ({
  messages,
  isThinking,
  aiMode,
  hasGeminiKey,
  bridgeConnected,
  activeTab,
  selectedSnippet,
  onClearSnippet,
  onSendPrompt,
  onClearChat,
  onApplyProposal,
  onRevertProposal,
  onPreviewProposalDiff,
  onOpenSettings,
}) => {
  const [input, setInput] = useState('');
  const [expandedThoughts, setExpandedThoughts] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    onSendPrompt(input.trim());
    setInput('');
  };

  const toggleThoughts = (id: string) => {
    setExpandedThoughts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="w-full sm:w-[360px] lg:w-[400px] bg-[#111827] border-l border-slate-800 flex flex-col h-full shrink-0 select-text">
      {/* Header */}
      <div className="h-11 px-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/25 border border-indigo-500/40 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Antigravity Agent</span>
              <span
                onClick={onOpenSettings}
                className={`cursor-pointer px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                  aiMode === 'antigravity-bridge'
                    ? bridgeConnected
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : hasGeminiKey
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {aiMode === 'antigravity-bridge' ? (
                  <>
                    <Cpu className="w-2.5 h-2.5" />
                    <span>SDK Bridge</span>
                  </>
                ) : (
                  <>
                    <Cloud className="w-2.5 h-2.5" />
                    <span>{hasGeminiKey ? 'Gemini Live' : 'Demo / Setup'}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClearChat}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          title="Pulisci conversazione"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Active Context Banner */}
      <div className="px-3 py-1.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Contesto attivo:</span>
          <span className="font-mono text-slate-200 truncate">
            {activeTab ? activeTab.path : 'Nessun file selezionato'}
          </span>
        </div>
      </div>

      {/* Quick Prompt Chips for Android Tablet */}
      <div className="px-2.5 py-2 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {QUICK_TABLET_PROMPTS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={isThinking}
            onClick={() => onSendPrompt(chip)}
            className="px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-indigo-600/25 border border-slate-700 hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-indigo-200 whitespace-nowrap shrink-0 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 text-xs leading-relaxed"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-xl p-3 ${
              msg.role === 'user'
                ? 'bg-indigo-600/20 border border-indigo-500/30 text-slate-100 ml-4'
                : 'bg-slate-900/90 border border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400">
              <span className="font-semibold uppercase tracking-wider">
                {msg.role === 'user' ? 'Tu (Tablet)' : 'Antigravity AI'}
              </span>
              <span>{msg.timestamp}</span>
            </div>

            {/* Thoughts & Tool Calls Collapsible (Antigravity SDK Style) */}
            {(msg.thoughts && msg.thoughts.length > 0) ||
            (msg.toolCalls && msg.toolCalls.length > 0) ? (
              <div className="mb-2 rounded-lg bg-slate-950/80 border border-slate-800/90 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleThoughts(msg.id)}
                  className="w-full px-2.5 py-1.5 flex items-center justify-between text-[11px] text-indigo-300 hover:bg-slate-900/60"
                >
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-indigo-400" />
                    <span>
                      Ragionamento Agente ({msg.thoughts?.length || 0} step
                      {msg.toolCalls?.length ? `, ${msg.toolCalls.length} tool` : ''})
                    </span>
                  </span>
                  {expandedThoughts[msg.id] ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {expandedThoughts[msg.id] && (
                  <div className="px-2.5 py-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400 font-mono">
                    {msg.thoughts?.map((t, idx) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-indigo-400">•</span>
                        <span>{t}</span>
                      </div>
                    ))}
                    {msg.toolCalls?.map((tc, idx) => (
                      <div
                        key={idx}
                        className="text-emerald-400 bg-emerald-950/30 px-2 py-1 rounded border border-emerald-800/40"
                      >
                        [Tool] {tc.name}({JSON.stringify(tc.args)})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {/* Message text (strip huge code blocks if proposals exist so UI stays clean on tablet) */}
            <div className="whitespace-pre-wrap break-words text-slate-200">
              {msg.proposals && msg.proposals.length > 0
                ? msg.content.replace(/```[\s\S]*?```/g, '').trim() ||
                  'Ho preparato la modifica al codice pronta da applicare:'
                : msg.content}
            </div>

            {/* 1-Tap Code Proposal Cards */}
            {msg.proposals && msg.proposals.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {msg.proposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="rounded-xl bg-[#0b0f19] border border-indigo-500/40 overflow-hidden shadow-md"
                  >
                    <div className="px-3 py-2 bg-indigo-950/40 border-b border-indigo-500/30 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-mono text-xs font-semibold text-indigo-200 truncate">
                          {prop.filePath}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          +{prop.addedLines}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                          -{prop.removedLines}
                        </span>
                      </div>
                    </div>

                    {/* Code snippet preview (first 8 lines) */}
                    <pre className="p-2.5 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-36 bg-slate-950/90">
                      {prop.proposedCode.split('\n').slice(0, 10).join('\n')}
                      {prop.proposedCode.split('\n').length > 10
                        ? `\n... (+${prop.proposedCode.split('\n').length - 10} righe)`
                        : ''}
                    </pre>

                    {/* 1-Tap Action Buttons for Android Tablet */}
                    <div className="p-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onPreviewProposalDiff(prop, msg.id)}
                        className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <GitCompare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Anteprima Diff</span>
                      </button>

                      {prop.status === 'applied' ? (
                        <button
                          type="button"
                          onClick={() => onRevertProposal(msg.id, prop)}
                          className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-950/70 text-emerald-300 hover:text-rose-200 border border-emerald-500/40 font-semibold text-xs flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Applicato (Annulla)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onApplyProposal(msg.id, prop)}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          <span>Applica (1-Tap)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {isThinking && (
          <div className="rounded-xl p-3 bg-slate-900/90 border border-indigo-500/30 text-slate-300 flex items-center gap-2.5">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Antigravity AI sta analizzando il codice e preparando il diff...</span>
          </div>
        )}
      </div>

      {/* Selected Code Snippet Pill */}
      {selectedSnippet && (
        <div className="px-3 py-1.5 bg-indigo-950/50 border-t border-indigo-500/30 flex items-center justify-between text-[11px] text-indigo-200">
          <span className="truncate font-mono">
            Selezione allegata ({selectedSnippet.split('\n').length} righe)
          </span>
          <button
            type="button"
            onClick={onClearSnippet}
            className="text-indigo-300 hover:text-white ml-2 underline shrink-0"
          >
            Rimuovi
          </button>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-end gap-2 shrink-0"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={2}
          placeholder="Chiedi ad Antigravity di modificare il file o creare una feature..."
          className="flex-1 bg-slate-950 border border-slate-700/80 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none resize-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white shrink-0 shadow-md shadow-indigo-600/20"
          title="Invia richiesta"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
};
