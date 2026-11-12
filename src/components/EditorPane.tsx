import React, { useRef, useMemo } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import {
  undo,
  redo,
  indentMore,
  indentLess,
  cursorCharLeft,
  cursorCharRight,
  cursorLineUp,
  cursorLineDown,
} from '@codemirror/commands';
import { openSearchPanel } from '@codemirror/search';
import {
  X,
  FileCode2,
  GitCompare,
  Eye,
  RotateCcw,
  Plus,
  ZoomIn,
  ZoomOut,
  WrapText,
} from 'lucide-react';
import { OpenFileTab } from '../types';
import { TouchSymbolBar } from './TouchSymbolBar';

export interface EditorPaneProps {
  tabs: OpenFileTab[];
  activeTabPath: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChangeContent: (path: string, newContent: string) => void;
  onRevertFile: (path: string) => void;
  onOpenDiffModal: (tab: OpenFileTab) => void;
  onNewFilePrompt: () => void;
  onAskAgentWithSelection: (selectedText: string) => void;
  fontSize: number;
  onChangeFontSize: (delta: number) => void;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  showTouchBar: boolean;
  showLivePreview: boolean;
  onToggleLivePreview: () => void;
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  tabs,
  activeTabPath,
  onSelectTab,
  onCloseTab,
  onChangeContent,
  onRevertFile,
  onOpenDiffModal,
  onNewFilePrompt,
  onAskAgentWithSelection,
  fontSize,
  onChangeFontSize,
  wordWrap,
  onToggleWordWrap,
  showTouchBar,
  showLivePreview,
  onToggleLivePreview,
}) => {
  const cmRef = useRef<ReactCodeMirrorRef | null>(null);
  const activeTab = tabs.find((t) => t.path === activeTabPath);

  const extensions = useMemo(() => {
    const exts = [];
    const lang = activeTab?.language || 'typescript';
    switch (lang) {
      case 'typescript':
      case 'javascript':
        exts.push(javascript({ jsx: true, typescript: true }));
        break;
      case 'python':
        exts.push(python());
        break;
      case 'html':
        exts.push(html());
        break;
      case 'css':
        exts.push(css());
        break;
      case 'json':
        exts.push(json());
        break;
      case 'markdown':
        exts.push(markdown());
        break;
      default:
        exts.push(javascript({ jsx: true, typescript: true }));
    }
    if (wordWrap) {
      exts.push(EditorView.lineWrapping);
    }
    exts.push(
      EditorView.theme({
        '&': {
          fontSize: `${fontSize}px`,
          backgroundColor: '#0b0f19',
        },
        '.cm-content': {
          paddingTop: '10px',
          paddingBottom: '120px',
        },
      })
    );
    return exts;
  }, [activeTab?.language, wordWrap, fontSize]);

  const handleInsertSymbol = (text: string, cursorOffset = 0) => {
    const view = cmRef.current?.view;
    if (!view) return;
    const { from, to } = view.state.selection.main;
    const newCursorPos = from + text.length + cursorOffset;
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: newCursorPos },
      scrollIntoView: true,
    });
    view.focus();
  };

  const handleIndent = () => {
    const view = cmRef.current?.view;
    if (view) {
      indentMore(view);
      view.focus();
    }
  };

  const handleOutdent = () => {
    const view = cmRef.current?.view;
    if (view) {
      indentLess(view);
      view.focus();
    }
  };

  const handleUndo = () => {
    const view = cmRef.current?.view;
    if (view) {
      undo(view);
      view.focus();
    }
  };

  const handleRedo = () => {
    const view = cmRef.current?.view;
    if (view) {
      redo(view);
      view.focus();
    }
  };

  const handleMoveCursor = (dir: 'left' | 'right' | 'up' | 'down') => {
    const view = cmRef.current?.view;
    if (!view) return;
    if (dir === 'left') cursorCharLeft(view);
    if (dir === 'right') cursorCharRight(view);
    if (dir === 'up') cursorLineUp(view);
    if (dir === 'down') cursorLineDown(view);
    view.focus();
  };

  const handleOpenSearch = () => {
    const view = cmRef.current?.view;
    if (view) {
      openSearchPanel(view);
    }
  };

  const handleAskAgentSelection = () => {
    const view = cmRef.current?.view;
    if (!view) {
      onAskAgentWithSelection('');
      return;
    }
    const { from, to } = view.state.selection.main;
    const selected = from !== to ? view.state.sliceDoc(from, to) : '';
    onAskAgentWithSelection(selected);
  };

  // Find HTML content for live preview (either current HTML tab or index.html tab)
  const previewHtmlContent = useMemo(() => {
    if (!activeTab) return '';
    if (activeTab.language === 'html') return activeTab.content;
    const htmlTab = tabs.find((t) => t.path.endsWith('.html'));
    if (htmlTab) return htmlTab.content;
    return `<!DOCTYPE html><html><body style="background:#0f172a;color:#e2e8f0;font-family:sans-serif;padding:20px;"><h3>Anteprima Codice: ${activeTab.path}</h3><pre style="background:#1e293b;padding:14px;border-radius:8px;overflow:auto;">${activeTab.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</pre></body></html>`;
  }, [activeTab, tabs]);

  const isDirty = activeTab && (activeTab.content !== activeTab.originalContent || activeTab.isNew);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0b0f19] h-full overflow-hidden">
      {/* Top Multi-Tab Bar + Tablet Editor Controls */}
      <div className="h-11 bg-[#111827] border-b border-slate-800 flex items-center justify-between px-2 gap-2 shrink-0">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {tabs.map((tab) => {
            const active = tab.path === activeTabPath;
            const modified = tab.content !== tab.originalContent || tab.isNew;
            return (
              <div
                key={tab.path}
                onClick={() => onSelectTab(tab.path)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer shrink-0 transition-all border ${
                  active
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-sm'
                    : 'bg-slate-900/60 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate max-w-[140px]">{tab.name}</span>
                {modified && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
                    title="Modifiche non salvate su GitHub"
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.path);
                  }}
                  className="p-0.5 rounded hover:bg-slate-700/80 text-slate-400 hover:text-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={onNewFilePrompt}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 shrink-0 ml-1"
            title="Nuovo file"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Right-side Quick Editor Actions */}
        {activeTab && (
          <div className="flex items-center gap-1 shrink-0">
            {isDirty && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenDiffModal(activeTab)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/25"
                  title="Confronta modifiche (Diff)"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Diff</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRevertFile(activeTab.path)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300"
                  title="Ripristina versione originale"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onChangeFontSize(-1)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hidden md:flex"
              title="Riduci testo"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChangeFontSize(1)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hidden md:flex"
              title="Ingrandisci testo"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleWordWrap}
              className={`p-1.5 rounded-lg text-xs ${
                wordWrap
                  ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-800/80 text-slate-400'
              }`}
              title="A capo automatico (Word Wrap)"
            >
              <WrapText className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleLivePreview}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showLivePreview
                  ? 'bg-emerald-600/25 border border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
              title="Anteprima Live Split-Screen"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Editor + Optional Live Preview Split View */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {activeTab ? (
          <div className="flex-1 h-full min-h-0 overflow-hidden relative">
            {activeTab.isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm gap-2">
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span>Caricamento di {activeTab.path} da GitHub...</span>
              </div>
            ) : (
              <CodeMirror
                ref={cmRef}
                value={activeTab.content}
                height="100%"
                theme={oneDark}
                extensions={extensions}
                onChange={(val) => onChangeContent(activeTab.path, val)}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLineGutter: true,
                  highlightActiveLine: true,
                  foldGutter: true,
                  autocompletion: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  indentOnInput: true,
                }}
                className="h-full text-left"
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <FileCode2 className="w-12 h-12 text-indigo-400/50 mb-3" />
            <p className="text-base font-medium text-slate-200 mb-1">
              Nessun file aperto nell'editor
            </p>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              Seleziona un file dall'esploratore a sinistra oppure crea un nuovo file per iniziare a programmare sul tuo tablet Android.
            </p>
            <button
              type="button"
              onClick={onNewFilePrompt}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
            >
              + Crea Nuovo File
            </button>
          </div>
        )}

        {/* Split-Screen Live Sandbox Preview */}
        {showLivePreview && (
          <div className="h-1/2 lg:h-full lg:w-5/12 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950 flex flex-col shrink-0">
            <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Sandbox Preview
              </span>
              <button
                type="button"
                onClick={onToggleLivePreview}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <iframe
              title="Live Sandbox Preview"
              srcDoc={previewHtmlContent}
              sandbox="allow-scripts"
              className="flex-1 w-full h-full border-0 bg-slate-950"
            />
          </div>
        )}
      </div>

      {/* Android Tablet Quick Symbol Bar */}
      {showTouchBar && activeTab && (
        <TouchSymbolBar
          onInsertSymbol={handleInsertSymbol}
          onIndent={handleIndent}
          onOutdent={handleOutdent}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onMoveCursor={handleMoveCursor}
          onOpenSearch={handleOpenSearch}
          onAskAgentSelection={handleAskAgentSelection}
        />
      )}
    </div>
  );
};
