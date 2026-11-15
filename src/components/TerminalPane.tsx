import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal,
  ChevronUp,
  ChevronDown,
  Trash2,
  CornerDownLeft,
  Cpu,
} from 'lucide-react';
import { FileTreeNode, GitHubBranch, OpenFileTab } from '../types';

export interface TerminalPaneProps {
  repoFullName: string;
  branch: string;
  tree: FileTreeNode[];
  tabs: OpenFileTab[];
  branches: GitHubBranch[];
  bridgeUrl: string;
  bridgeConnected: boolean;
  onCreateFile: (path: string) => void;
  onOpenFile: (path: string) => void;
}

interface TerminalLine {
  id: string;
  type: 'cmd' | 'out' | 'err' | 'info';
  text: string;
}

const QUICK_CMDS = ['help', 'ls', 'git status', 'git branch', 'clear'];

function flattenTreePaths(nodes: FileTreeNode[]): Array<{ path: string; type: 'blob' | 'tree' }> {
  const result: Array<{ path: string; type: 'blob' | 'tree' }> = [];
  for (const node of nodes) {
    result.push({ path: node.path, type: node.type });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTreePaths(node.children));
    }
  }
  return result;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  repoFullName,
  branch,
  tree,
  tabs,
  branches,
  bridgeUrl,
  bridgeConnected,
  onCreateFile,
  onOpenFile,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'info',
      text: 'CodeFID+ Terminal pronto. Digita "help" per i comandi integrati (ls, git status, touch, cat, clear).',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, isExpanded]);

  const appendLines = (newLines: Omit<TerminalLine, 'id'>[]) => {
    setLines((prev) => [
      ...prev.slice(-200),
      ...newLines.map((l, idx) => ({
        ...l,
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    ]);
  };

  const runCommand = async (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    setCmdHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);
    appendLines([{ type: 'cmd', text: `$ ${cmd}` }]);

    const parts = cmd.split(/\s+/);
    const base = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').trim();

    if (base === 'clear' || base === 'cls') {
      setLines([]);
      return;
    }

    if (base === 'help') {
      appendLines([
        {
          type: 'info',
          text: [
            'Comandi integrati CodeFID+:',
            '  help              Mostra questo elenco',
            '  ls [cartella]     Elenca file e cartelle del repository',
            '  pwd               Mostra repository e branch attivi',
            '  cat <file>        Mostra il contenuto di un file aperto',
            '  open <file>       Apre il file nell\'editor',
            '  touch <file>      Crea un nuovo file nell\'editor',
            '  git status        Mostra i file modificati/nuovi pronti per il commit',
            '  git branch        Elenca i branch disponibili',
            '  clear             Pulisce il terminale',
            bridgeConnected
              ? '  <comando shell>   Inoltrato al Bridge locale connesso'
              : '  (Connetti il Bridge Python nelle Impostazioni per eseguire comandi OS reali)',
          ].join('\n'),
        },
      ]);
      return;
    }

    if (base === 'pwd') {
      appendLines([
        {
          type: 'out',
          text: repoFullName !== '/' ? `/${repoFullName} (${branch})` : '/workspace-locale',
        },
      ]);
      return;
    }

    if (base === 'date') {
      appendLines([{ type: 'out', text: new Date().toString() }]);
      return;
    }

    if (base === 'echo') {
      appendLines([{ type: 'out', text: arg }]);
      return;
    }

    if (base === 'ls') {
      const flat = flattenTreePaths(tree);
      const prefix = arg.replace(/^\/+|\/+$/g, '');
      const filtered = flat
        .filter((item) => (!prefix ? true : item.path.startsWith(prefix)))
        .slice(0, 80);

      if (filtered.length === 0 && tabs.length === 0) {
        appendLines([{ type: 'info', text: '(nessun file nel workspace)' }]);
        return;
      }

      const listed =
        filtered.length > 0
          ? filtered.map((f) => (f.type === 'tree' ? `${f.path}/` : f.path))
          : tabs.map((t) => t.path);

      appendLines([{ type: 'out', text: listed.join('\n') }]);
      return;
    }

    if (base === 'cat') {
      if (!arg) {
        appendLines([{ type: 'err', text: 'Uso: cat <percorso-file>' }]);
        return;
      }
      const tab = tabs.find((t) => t.path === arg || t.name === arg);
      if (!tab) {
        appendLines([
          {
            type: 'err',
            text: `File "${arg}" non aperto nelle schede. Usa "open ${arg}" o selezionalo dall'Explorer.`,
          },
        ]);
        return;
      }
      appendLines([{ type: 'out', text: tab.content || '(file vuoto)' }]);
      return;
    }

    if (base === 'open') {
      if (!arg) {
        appendLines([{ type: 'err', text: 'Uso: open <percorso-file>' }]);
        return;
      }
      onOpenFile(arg);
      appendLines([{ type: 'info', text: `Apertura di "${arg}" nell'editor...` }]);
      return;
    }

    if (base === 'touch') {
      if (!arg) {
        appendLines([{ type: 'err', text: 'Uso: touch <percorso-nuovo-file>' }]);
        return;
      }
      onCreateFile(arg);
      appendLines([{ type: 'info', text: `File "${arg}" creato e aperto nell'editor.` }]);
      return;
    }

    if (base === 'git') {
      const sub = (parts[1] || '').toLowerCase();
      if (sub === 'status') {
        const dirty = tabs.filter((t) => t.content !== t.originalContent || t.isNew);
        if (dirty.length === 0) {
          appendLines([
            { type: 'out', text: `On branch ${branch}\nnothing to commit, working tree clean` },
          ]);
        } else {
          const list = dirty
            .map((t) => `  ${t.isNew ? 'new file:' : 'modified:'}   ${t.path}`)
            .join('\n');
          appendLines([
            {
              type: 'out',
              text: `On branch ${branch}\nChanges ready for Commit modal:\n${list}`,
            },
          ]);
        }
        return;
      }
      if (sub === 'branch') {
        const list =
          branches.length > 0
            ? branches
                .map((b) => `${b.name === branch ? '* ' : '  '}${b.name}`)
                .join('\n')
            : `* ${branch}`;
        appendLines([{ type: 'out', text: list }]);
        return;
      }
    }

    // Forward arbitrary shell commands to local Bridge if connected
    if (bridgeConnected) {
      setIsRunning(true);
      try {
        const cleanUrl = bridgeUrl.replace(/\/+$/, '');
        const res = await fetch(`${cleanUrl}/api/terminal/exec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd }),
        });
        const data = await res.json();
        if (!res.ok) {
          appendLines([{ type: 'err', text: data.error || `HTTP ${res.status}` }]);
        } else {
          if (data.stdout) appendLines([{ type: 'out', text: data.stdout.trimEnd() }]);
          if (data.stderr) appendLines([{ type: 'err', text: data.stderr.trimEnd() }]);
          if (!data.stdout && !data.stderr) {
            appendLines([{ type: 'info', text: `(exit code ${data.exit_code ?? 0})` }]);
          }
        }
      } catch (err) {
        appendLines([
          {
            type: 'err',
            text: `Errore Bridge: ${err instanceof Error ? err.message : String(err)}`,
          },
        ]);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    appendLines([
      {
        type: 'err',
        text: `Comando "${base}" non riconosciuto in modalità standalone. Digita "help" o connetti il Bridge locale nelle Impostazioni.`,
      },
    ]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning || !input.trim()) return;
    const cmd = input;
    setInput('');
    runCommand(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(next);
      setInput(cmdHistory[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        const next = historyIdx - 1;
        setHistoryIdx(next);
        setInput(cmdHistory[next]);
      }
    }
  };

  // Collapsed 1-line bar (maximizes Editor area)
  if (!isExpanded) {
    const lastLine = lines[lines.length - 1];
    return (
      <div
        onClick={() => {
          setIsExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 80);
        }}
        className="h-9 bg-[#0f172a] border-t border-slate-800 px-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-900/90 shrink-0 select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200 shrink-0">Terminale</span>
          {bridgeConnected && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-medium flex items-center gap-1 shrink-0">
              <Cpu className="w-2.5 h-2.5" />
              <span>Bridge</span>
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-400 truncate">
            {lastLine ? lastLine.text.split('\n')[0] : 'Tocca per aprire il terminale'}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
            setTimeout(() => inputRef.current?.focus(), 80);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 shrink-0"
          title="Espandi Terminale"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Expanded bottom-half terminal
  return (
    <section className="h-[44%] min-h-[190px] max-h-[380px] bg-[#090d16] border-t border-slate-700/80 flex flex-col shrink-0">
      {/* Terminal Header */}
      <div className="h-9 px-3 bg-[#0f172a] border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200 shrink-0">Terminale</span>
          <span className="hidden sm:inline text-[11px] font-mono text-slate-400 truncate">
            {repoFullName !== '/' ? `${repoFullName} (${branch})` : 'locale'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_CMDS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => runCommand(q)}
              className="px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-300 shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setLines([])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Pulisci terminale"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Riduci a singola riga"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Output Log */}
      <div
        ref={scrollRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1.5 select-text"
      >
        {lines.map((line) => (
          <pre
            key={line.id}
            className={`whitespace-pre-wrap break-words leading-relaxed ${
              line.type === 'cmd'
                ? 'text-indigo-300 font-semibold'
                : line.type === 'err'
                ? 'text-rose-400'
                : line.type === 'info'
                ? 'text-emerald-300/90'
                : 'text-slate-200'
            }`}
          >
            {line.text}
          </pre>
        ))}
      </div>

      {/* Prompt Input */}
      <form
        onSubmit={handleSubmit}
        className="px-3 py-2 bg-[#0f172a] border-t border-slate-800 flex items-center gap-2 shrink-0"
      >
        <span className="font-mono text-xs font-bold text-emerald-400 shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isRunning}
          placeholder="Scrivi un comando (es. help, ls, git status, touch src/test.ts)..."
          className="flex-1 bg-transparent text-xs font-mono text-slate-100 placeholder-slate-500 outline-none"
        />
        <button
          type="submit"
          disabled={isRunning || !input.trim()}
          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Esegui</span>
        </button>
      </form>
    </section>
  );
};
