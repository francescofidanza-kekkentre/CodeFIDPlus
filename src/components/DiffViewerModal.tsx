import React from 'react';
import { X, Check, GitCompare } from 'lucide-react';
import { computeLineDiff } from '../utils/diffEngine';

export interface DiffViewerModalProps {
  isOpen: boolean;
  filePath: string;
  originalCode: string;
  modifiedCode: string;
  title?: string;
  canApply?: boolean;
  onApply?: () => void;
  onClose: () => void;
}

export const DiffViewerModal: React.FC<DiffViewerModalProps> = ({
  isOpen,
  filePath,
  originalCode,
  modifiedCode,
  title = 'Anteprima Modifiche (Diff)',
  canApply = false,
  onApply,
  onClose,
}) => {
  if (!isOpen) return null;

  const diff = computeLineDiff(originalCode, modifiedCode);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <GitCompare className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-100 truncate">{title}</h3>
              <p className="text-xs font-mono text-slate-400 truncate">{filePath}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold">
              +{diff.addedCount}
            </span>
            <span className="px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 font-mono text-xs font-semibold">
              -{diff.removedCount}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diff Lines Body */}
        <div className="flex-1 overflow-auto bg-[#0b0f19] font-mono text-xs divide-y divide-slate-900/60">
          {diff.lines.map((line, idx) => {
            const bgClass =
              line.type === 'added'
                ? 'bg-emerald-950/45 text-emerald-200'
                : line.type === 'removed'
                ? 'bg-rose-950/45 text-rose-200 line-through opacity-80'
                : 'text-slate-300';
            const prefix =
              line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ';

            return (
              <div
                key={idx}
                className={`flex items-stretch px-3 py-0.5 whitespace-pre ${bgClass}`}
              >
                <span className="w-9 text-right pr-2 text-slate-500 select-none shrink-0">
                  {line.oldLineNumber ?? ''}
                </span>
                <span className="w-9 text-right pr-3 text-slate-500 select-none shrink-0">
                  {line.newLineNumber ?? ''}
                </span>
                <span
                  className={`w-5 font-bold select-none shrink-0 ${
                    line.type === 'added'
                      ? 'text-emerald-400'
                      : line.type === 'removed'
                      ? 'text-rose-400'
                      : 'text-slate-500'
                  }`}
                >
                  {prefix}
                </span>
                <span className="flex-1">{line.content || ' '}</span>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Chiudi
          </button>
          {canApply && onApply && (
            <button
              type="button"
              onClick={() => {
                onApply();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
            >
              <Check className="w-4 h-4" />
              <span>Applica Modifica sul File (1-Tap)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
