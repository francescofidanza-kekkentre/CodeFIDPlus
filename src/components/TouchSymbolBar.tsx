import React from 'react';
import {
  Undo2,
  Redo2,
  Sparkles,
  Search,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from 'lucide-react';

export interface TouchSymbolBarProps {
  onInsertSymbol: (text: string, cursorOffset?: number) => void;
  onIndent: () => void;
  onOutdent: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onMoveCursor: (dir: 'left' | 'right' | 'up' | 'down') => void;
  onOpenSearch: () => void;
  onAskAgentSelection: () => void;
}

interface QuickKey {
  label: string;
  insert: string;
  offset?: number;
  accent?: boolean;
}

const SYMBOL_KEYS: QuickKey[] = [
  { label: '{ }', insert: '{}', offset: -1, accent: true },
  { label: '( )', insert: '()', offset: -1, accent: true },
  { label: '[ ]', insert: '[]', offset: -1, accent: true },
  { label: '=>', insert: ' => ', accent: true },
  { label: ';', insert: ';' },
  { label: '=', insert: ' = ' },
  { label: '===', insert: ' === ' },
  { label: "' '", insert: "''", offset: -1 },
  { label: '" "', insert: '""', offset: -1 },
  { label: '` `', insert: '``', offset: -1 },
  { label: '< >', insert: '<>', offset: -1 },
  { label: '/', insert: '/' },
  { label: ':', insert: ': ' },
  { label: '.', insert: '.' },
  { label: '$', insert: '${}', offset: -1 },
  { label: '!', insert: '!' },
  { label: '&', insert: ' && ' },
  { label: '|', insert: ' || ' },
  { label: '_', insert: '_' },
];

export const TouchSymbolBar: React.FC<TouchSymbolBarProps> = ({
  onInsertSymbol,
  onIndent,
  onOutdent,
  onUndo,
  onRedo,
  onMoveCursor,
  onOpenSearch,
  onAskAgentSelection,
}) => {
  // Using onPointerDown with preventDefault keeps the Android virtual keyboard open while tapping toolbar keys
  const handleTouchAction = (e: React.PointerEvent, action: () => void) => {
    e.preventDefault();
    action();
  };

  return (
    <div className="bg-[#0f172a] border-t border-slate-800 px-2 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar select-none shrink-0 z-20">
      {/* AI Quick Action */}
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, onAskAgentSelection)}
        className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-indigo-600/25 border border-indigo-500/40 text-indigo-300 active:bg-indigo-600/50 text-xs font-semibold shrink-0"
        title="Invia selezione o file ad Antigravity AI"
      >
        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
        <span>AI</span>
      </button>

      {/* Tab / Shift+Tab */}
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, onIndent)}
        className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-200 text-xs font-mono font-semibold shrink-0"
      >
        Tab ⇥
      </button>
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, onOutdent)}
        className="px-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-300 text-xs font-mono shrink-0"
      >
        ⇤
      </button>

      {/* Undo / Redo */}
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, onUndo)}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-200 shrink-0"
        title="Annulla (Undo)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, onRedo)}
        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 text-slate-200 shrink-0"
        title="Ripeti (Redo)"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      <div className="h-5 w-px bg-slate-800 mx-0.5 shrink-0" />

      {/* Cursor D-Pad for accurate touch positioning */}
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, () => onMoveCursor('left'))}
        className="p-2 rounded-lg bg-slate-800/90 active:bg-indigo-600 text-slate-200 shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, () => onMoveCursor('down'))}
        className="p-2 rounded-lg bg-slate-800/90 active:bg-indigo-600 text-slate-200 shrink-0"
      >
        <ArrowDown className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, () => onMoveCursor('up'))}
        className="p-2 rounded-lg bg-slate-800/90 active:bg-indigo-600 text-slate-200 shrink-0"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, () => onMoveCursor('right'))}
        className="p-2 rounded-lg bg-slate-800/90 active:bg-indigo-600 text-slate-200 shrink-0"
      >
        <ArrowRight className="w-4 h-4" />
      </button>

      <div className="h-5 w-px bg-slate-800 mx-0.5 shrink-0" />

      {/* Coding Symbols */}
      {SYMBOL_KEYS.map((key) => (
        <button
          key={key.label}
          type="button"
          onPointerDown={(e) =>
            handleTouchAction(e, () => onInsertSymbol(key.insert, key.offset))
          }
          className={`px-2.5 py-1.5 min-w-[36px] rounded-lg font-mono text-xs font-semibold shrink-0 transition-colors ${
            key.accent
              ? 'bg-slate-800 border border-slate-700 text-indigo-300 active:bg-indigo-600 active:text-white'
              : 'bg-slate-800/75 text-slate-200 active:bg-indigo-600 active:text-white'
          }`}
        >
          {key.label}
        </button>
      ))}

      {/* New line & Search */}
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, () => onInsertSymbol('\n'))}
        className="p-2 rounded-lg bg-slate-800 active:bg-indigo-600 text-slate-200 shrink-0"
        title="Nuova riga"
      >
        <CornerDownLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onPointerDown={(e) => handleTouchAction(e, onOpenSearch)}
        className="p-2 rounded-lg bg-slate-800 active:bg-indigo-600 text-slate-200 shrink-0"
        title="Cerca nel file"
      >
        <Search className="w-4 h-4" />
      </button>
    </div>
  );
};
