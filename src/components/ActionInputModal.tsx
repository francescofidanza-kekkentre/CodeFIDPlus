import React, { useEffect, useRef, useState } from 'react';
import { FilePlus, GitBranch, X, AlertCircle } from 'lucide-react';

export interface ActionInputModalProps {
  isOpen: boolean;
  mode: 'file' | 'branch';
  title: string;
  description: string;
  defaultValue: string;
  placeholder: string;
  confirmLabel: string;
  onConfirm: (value: string) => Promise<void> | void;
  onClose: () => void;
}

export const ActionInputModal: React.FC<ActionInputModalProps> = ({
  isOpen,
  mode,
  title,
  description,
  defaultValue,
  placeholder,
  confirmLabel,
  onConfirm,
  onClose,
}) => {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setError('');
      setIsSubmitting(false);
      // Slight delay so the modal paints cleanly before Android/iPadOS animates the soft keyboard
      const timer = setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true });
        inputRef.current?.select();
      }, 90);
      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Inserisci un valore valido.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-3 sm:p-6 pt-4 sm:pt-8 overflow-y-auto transition-opacity duration-150"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col bg-[#111827] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden will-change-transform"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'branch' ? (
              <GitBranch className="w-4 h-4 text-emerald-400" />
            ) : (
              <FilePlus className="w-4 h-4 text-indigo-400" />
            )}
            <h3 className="text-sm font-bold text-slate-100">{title}</h3>
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
        <div className="p-3.5 sm:p-4 space-y-2.5 text-xs overflow-y-auto">
          <p className="text-slate-300">{description}</p>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono outline-none"
          />
          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
          >
            {isSubmitting ? 'Creazione...' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};
