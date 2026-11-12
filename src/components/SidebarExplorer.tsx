import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode2,
  GitBranch,
  RefreshCw,
  Plus,
  Search,
  Github,
  PlusCircle,
} from 'lucide-react';
import {
  FileTreeNode,
  GitHubBranch,
  GitHubRepo,
  OpenFileTab,
} from '../types';

export interface SidebarExplorerProps {
  repos: GitHubRepo[];
  activeOwner: string;
  activeRepo: string;
  activeBranch: string;
  branches: GitHubBranch[];
  tree: FileTreeNode[];
  openTabs: OpenFileTab[];
  activeTabPath: string;
  isLoadingTree: boolean;
  onSelectRepo: (owner: string, repo: string, defaultBranch: string) => void;
  onSelectBranch: (branch: string) => void;
  onCreateBranchPrompt: () => void;
  onRefreshTree: () => void;
  onSelectFile: (node: FileTreeNode) => void;
  onNewFilePrompt: () => void;
}

export const SidebarExplorer: React.FC<SidebarExplorerProps> = ({
  repos,
  activeOwner,
  activeRepo,
  activeBranch,
  branches,
  tree,
  openTabs,
  activeTabPath,
  isLoadingTree,
  onSelectRepo,
  onSelectBranch,
  onCreateBranchPrompt,
  onRefreshTree,
  onSelectFile,
  onNewFilePrompt,
}) => {
  const [filterText, setFilterText] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    backend: true,
    public: true,
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const isFileDirty = (path: string) => {
    const tab = openTabs.find((t) => t.path === path);
    return Boolean(tab && (tab.content !== tab.originalContent || tab.isNew));
  };

  const renderNode = (node: FileTreeNode, depth = 0): React.ReactNode => {
    if (filterText.trim()) {
      const match = node.path.toLowerCase().includes(filterText.toLowerCase());
      const hasMatchingChild =
        node.children &&
        JSON.stringify(node.children).toLowerCase().includes(filterText.toLowerCase());
      if (!match && !hasMatchingChild) return null;
    }

    if (node.type === 'tree') {
      const isOpen = Boolean(expandedFolders[node.path] || filterText.trim());
      return (
        <div key={node.path}>
          <button
            type="button"
            onClick={() => toggleFolder(node.path)}
            style={{ paddingLeft: `${depth * 14 + 10}px` }}
            className="w-full py-2 pr-3 flex items-center gap-2 text-left text-xs text-slate-300 hover:bg-slate-800/70 active:bg-slate-800 rounded-lg transition-colors"
          >
            {isOpen ? (
              <FolderOpen className="w-4 h-4 text-indigo-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-indigo-400/80 shrink-0" />
            )}
            <span className="truncate font-medium">{node.name}</span>
          </button>
          {isOpen && node.children && (
            <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    const active = node.path === activeTabPath;
    const dirty = isFileDirty(node.path);

    return (
      <button
        key={node.path}
        type="button"
        onClick={() => onSelectFile(node)}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        className={`w-full py-2 pr-3 flex items-center justify-between gap-2 text-left text-xs rounded-lg transition-colors ${
          active
            ? 'bg-indigo-600/25 text-indigo-200 font-semibold'
            : 'text-slate-300 hover:bg-slate-800/70 active:bg-slate-800'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileCode2
            className={`w-4 h-4 shrink-0 ${
              active ? 'text-indigo-400' : 'text-slate-400'
            }`}
          />
          <span className="truncate">{node.name}</span>
        </div>
        {dirty && (
          <span
            className="w-2 h-2 rounded-full bg-amber-400 shrink-0"
            title="Modificato localmente"
          />
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 sm:w-72 bg-[#111827] border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
      {/* Repository & Branch Selector */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Github className="w-3.5 h-3.5 text-slate-300" />
            <span>Repository GitHub</span>
          </span>
          <button
            type="button"
            onClick={onRefreshTree}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
            title="Ricarica da GitHub"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTree ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Repo Dropdown */}
        <select
          value={`${activeOwner}/${activeRepo}`}
          onChange={(e) => {
            const [owner, repo] = e.target.value.split('/');
            const found = repos.find((r) => r.full_name === e.target.value);
            if (owner && repo) {
              onSelectRepo(owner, repo, found?.default_branch || 'main');
            }
          }}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-medium outline-none focus:border-indigo-500"
        >
          <option value={`${activeOwner}/${activeRepo}`}>
            {activeOwner}/{activeRepo}
          </option>
          {repos
            .filter((r) => r.full_name !== `${activeOwner}/${activeRepo}`)
            .map((r) => (
              <option key={r.id} value={r.full_name}>
                {r.full_name} {r.private ? '🔒' : ''}
              </option>
            ))}
        </select>

        {/* Branch Selector + Create Branch */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1.5">
            <GitBranch className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <select
              value={activeBranch}
              onChange={(e) => onSelectBranch(e.target.value)}
              className="w-full bg-transparent text-xs text-slate-200 outline-none"
            >
              <option value={activeBranch}>{activeBranch}</option>
              {branches
                .filter((b) => b.name !== activeBranch)
                .map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onCreateBranchPrompt}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
            title="Crea nuovo branch"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
          </button>
        </div>
      </div>

      {/* File Filter & New File */}
      <div className="p-2.5 border-b border-slate-800/80 flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Filtra file..."
            className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onNewFilePrompt}
          className="p-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 shrink-0"
          title="Nuovo File"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoadingTree ? (
          <div className="py-8 text-center text-xs text-slate-400 space-y-2">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Sincronizzazione albero GitHub...</p>
          </div>
        ) : tree.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            Nessun file trovato. Tocca <strong>+</strong> per creare il primo file.
          </div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>
    </aside>
  );
};
