import React, { useState, useEffect, useCallback } from 'react';
import {
  PanelLeft,
  Sparkles,
  GitCommit,
  Settings,
  Download,
  Code2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  AppSettings,
  ChatMessage,
  CodeProposal,
  FileTreeNode,
  GitHubBranch,
  GitHubRepo,
  OpenFileTab,
} from './types';
import {
  loadDrafts,
  loadSettings,
  saveDrafts,
  saveSettings,
  clearDraftsForRepo,
  saveSession,
  loadSession,
} from './services/storageService';
import {
  commitMultipleFilesToGitHub,
  createNewBranch,
  createPullRequest,
  fetchFileContent,
  fetchRepoBranches,
  fetchRepoFileTree,
  fetchUserRepos,
} from './services/githubService';
import {
  checkAntigravityBridgeHealth,
  sendAgentPrompt,
} from './services/aiService';
import { detectLanguageFromPath } from './utils/diffEngine';
import { SidebarExplorer } from './components/SidebarExplorer';
import { EditorPane } from './components/EditorPane';
import { AgentPanel } from './components/AgentPanel';
import { DiffViewerModal } from './components/DiffViewerModal';
import { GitCommitModal } from './components/GitCommitModal';
import { SettingsModal } from './components/SettingsModal';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showAgentPanel, setShowAgentPanel] = useState<boolean>(true);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // GitHub state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState<boolean>(false);

  // Editor Tabs state - lazily initialized from stored session so tabs appear immediately on first render
  const [tabs, setTabs] = useState<OpenFileTab[]>(() => {
    const s = loadSettings();
    if (s.activeOwner && s.activeRepo) {
      const sess = loadSession(`${s.activeOwner}/${s.activeRepo}@${s.activeBranch}`);
      if (sess?.tabs && sess.tabs.length > 0) return sess.tabs;
    }
    return [];
  });
  const [activeTabPath, setActiveTabPath] = useState<string>(() => {
    const s = loadSettings();
    if (s.activeOwner && s.activeRepo) {
      const sess = loadSession(`${s.activeOwner}/${s.activeRepo}@${s.activeBranch}`);
      if (sess?.activeTabPath) return sess.activeTabPath;
    }
    return '';
  });

  // Agent state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content:
        'Ciao! Sono **Antigravity AI** su **CodeFID+**.\n\nL\'ambiente è pronto. Per iniziare, tocca l\'icona **Impostazioni (⚙️)** in alto a destra per inserire il tuo **GitHub Personal Access Token (PAT)** e collegare il tuo repository, oppure seleziona la modalità AI che preferisci.',
      thoughts: [
        'Ambiente tablet rilevato e inizializzato.',
        'In attesa di configurazione iniziale nelle Impostazioni.',
      ],
    },
  ]);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [selectedSnippet, setSelectedSnippet] = useState<string>('');
  const [bridgeConnected, setBridgeConnected] = useState<boolean>(false);

  // Modals state
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showCommitModal, setShowCommitModal] = useState<boolean>(false);
  const [diffModalState, setDiffModalState] = useState<{
    isOpen: boolean;
    filePath: string;
    originalCode: string;
    modifiedCode: string;
    title: string;
    canApply: boolean;
    onApply?: () => void;
  }>({
    isOpen: false,
    filePath: '',
    originalCode: '',
    modifiedCode: '',
    title: '',
    canApply: false,
  });

  // PWA Install Prompt
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e as BeforeInstallPromptEvent);
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save settings & workspace session automatically
  const repoKey = `${settings.activeOwner}/${settings.activeRepo}@${settings.activeBranch}`;

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const isInitialMount = React.useRef(true);

  // Restore open session when switching to a different repository
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (settings.activeOwner && settings.activeRepo) {
      const session = loadSession(repoKey);
      setTabs(session?.tabs || []);
      setActiveTabPath(session?.activeTabPath || '');
    }
  }, [repoKey]);

  useEffect(() => {
    if (settings.activeOwner && settings.activeRepo) {
      saveSession(repoKey, tabs, activeTabPath);
      saveDrafts(repoKey, tabs);
    }
  }, [repoKey, tabs, activeTabPath, settings.activeOwner, settings.activeRepo]);

  // Check local Antigravity SDK Bridge health when in bridge mode
  useEffect(() => {
    if (settings.aiMode === 'antigravity-bridge') {
      checkAntigravityBridgeHealth(settings.bridgeUrl).then((res) =>
        setBridgeConnected(res.ok)
      );
    }
  }, [settings.aiMode, settings.bridgeUrl]);

  // Load GitHub repository data when token or active repo changes
  const syncGitHubWorkspace = useCallback(async () => {
    if (!settings.activeOwner.trim() || !settings.activeRepo.trim()) {
      if (settings.githubToken.trim()) {
        try {
          const userRepos = await fetchUserRepos(settings.githubToken);
          if (userRepos.length > 0) setRepos(userRepos);
        } catch {
          // ignore
        }
      }
      setTree([]);
      setBranches([]);
      return;
    }

    setIsLoadingTree(true);
    try {
      const userRepos = await fetchUserRepos(settings.githubToken).catch(() => []);
      if (userRepos.length > 0) {
        setRepos(userRepos);
      }

      const repoBranches = await fetchRepoBranches(
        settings.activeOwner,
        settings.activeRepo,
        settings.githubToken
      ).catch(() => []);

      if (repoBranches.length > 0) {
        setBranches(repoBranches);
      }

      const remoteTree = await fetchRepoFileTree(
        settings.activeOwner,
        settings.activeRepo,
        settings.activeBranch,
        settings.githubToken
      );

      setTree(remoteTree);
      // Restore any saved local drafts for this repo
      const drafts = loadDrafts(repoKey);
      if (drafts.length > 0) {
        setTabs((prev) => {
          const map = new Map(prev.map((t) => [t.path, t]));
          drafts.forEach((d) => {
            map.set(d.path, {
              path: d.path,
              name: d.path.split('/').pop() || d.path,
              content: d.content,
              originalContent: d.originalContent,
              sha: d.sha,
              language: detectLanguageFromPath(d.path),
              isNew: d.isNew,
            });
          });
          return Array.from(map.values());
        });
      }
    } catch {
      setTree([]);
    } finally {
      setIsLoadingTree(false);
    }
  }, [
    settings.githubToken,
    settings.activeOwner,
    settings.activeRepo,
    settings.activeBranch,
    repoKey,
  ]);

  useEffect(() => {
    syncGitHubWorkspace();
  }, [syncGitHubWorkspace]);

  const activeTab = tabs.find((t) => t.path === activeTabPath);
  const dirtyTabs = tabs.filter((t) => t.content !== t.originalContent || t.isNew);

  // Open a file from the tree
  const handleSelectFile = async (node: FileTreeNode) => {
    if (node.type !== 'blob') return;

    const existing = tabs.find((t) => t.path === node.path);
    if (existing) {
      setActiveTabPath(node.path);
      return;
    }

    // Load from GitHub API
    const placeholderTab: OpenFileTab = {
      path: node.path,
      name: node.name,
      content: '',
      originalContent: '',
      sha: node.sha,
      language: detectLanguageFromPath(node.path),
      isLoading: true,
    };
    setTabs((prev) => [...prev, placeholderTab]);
    setActiveTabPath(node.path);

    try {
      const { content, sha } = await fetchFileContent(
        settings.activeOwner,
        settings.activeRepo,
        node.path,
        settings.activeBranch,
        settings.githubToken
      );
      setTabs((prev) =>
        prev.map((t) =>
          t.path === node.path
            ? { ...t, content, originalContent: content, sha, isLoading: false }
            : t
        )
      );
    } catch (err) {
      const errMsg = `// Errore caricamento ${node.path}: ${
        err instanceof Error ? err.message : String(err)
      }`;
      setTabs((prev) =>
        prev.map((t) =>
          t.path === node.path
            ? { ...t, content: errMsg, originalContent: errMsg, isLoading: false }
            : t
        )
      );
    }
  };

  const handleCloseTab = (path: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.path !== path);
      if (activeTabPath === path) {
        setActiveTabPath(filtered[filtered.length - 1]?.path || '');
      }
      return filtered;
    });
  };

  const handleChangeContent = (path: string, newContent: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.path === path ? { ...t, content: newContent } : t))
    );
  };

  const handleRevertFile = (path: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.path === path ? { ...t, content: t.originalContent, isNew: false } : t
      )
    );
  };

  const handleNewFilePrompt = () => {
    const filePath = window.prompt(
      'Inserisci il percorso del nuovo file (es. src/components/Button.tsx):',
      'src/nuovoFile.ts'
    );
    if (!filePath || !filePath.trim()) return;
    const cleanPath = filePath.trim().replace(/^\/+/, '');
    const name = cleanPath.split('/').pop() || cleanPath;
    const lang = detectLanguageFromPath(cleanPath);

    const existing = tabs.find((t) => t.path === cleanPath);
    if (existing) {
      setActiveTabPath(cleanPath);
      return;
    }

    const starterContent = `// ${cleanPath} — Creato su CodeFID+\n\n`;
    const newTab: OpenFileTab = {
      path: cleanPath,
      name,
      content: starterContent,
      originalContent: '',
      sha: `new-${Date.now()}`,
      language: lang,
      isNew: true,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabPath(cleanPath);
    setTree((prev) => [
      ...prev,
      { path: cleanPath, name, type: 'blob', sha: newTab.sha, isNew: true },
    ]);
  };

  const handleCreateBranchPrompt = async () => {
    const newBranch = window.prompt(
      `Crea un nuovo branch a partire da "${settings.activeBranch}":`,
      'feat/tablet-update'
    );
    if (!newBranch || !newBranch.trim()) return;
    const cleanName = newBranch.trim();

    if (!settings.githubToken.trim()) {
      setBranches((prev) => [
        ...prev,
        { name: cleanName, commit: { sha: 'local-branch' } },
      ]);
      setSettings((s) => ({ ...s, activeBranch: cleanName }));
      return;
    }

    try {
      const currentBranchObj = branches.find((b) => b.name === settings.activeBranch);
      const baseSha = currentBranchObj?.commit.sha || branches[0]?.commit.sha;
      if (!baseSha) throw new Error('SHA del branch di partenza non trovato.');
      await createNewBranch(
        settings.activeOwner,
        settings.activeRepo,
        cleanName,
        baseSha,
        settings.githubToken
      );
      const updatedBranches = await fetchRepoBranches(
        settings.activeOwner,
        settings.activeRepo,
        settings.githubToken
      );
      setBranches(updatedBranches);
      setSettings((s) => ({ ...s, activeBranch: cleanName }));
    } catch (err) {
      window.alert(
        `Impossibile creare il branch su GitHub: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  // Send prompt to Antigravity AI
  const handleSendAgentPrompt = async (promptText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const res = await sendAgentPrompt({
        prompt: promptText,
        activeTab,
        allOpenTabs: tabs,
        selectedText: selectedSnippet,
        repoFullName: `${settings.activeOwner}/${settings.activeRepo}`,
        branch: settings.activeBranch,
        history: messages,
        settings,
      });

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        thoughts: res.thoughts,
        toolCalls: res.toolCalls,
        proposals: res.proposals,
        modeUsed: res.modeUsed,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setSelectedSnippet('');
    } catch (err) {
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Errore durante la richiesta AI**: ${
          err instanceof Error ? err.message : String(err)
        }`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  // 1-Tap Apply Code Proposal from AI Agent
  const handleApplyProposal = (messageId: string, proposal: CodeProposal) => {
    setTabs((prev) => {
      const existing = prev.find((t) => t.path === proposal.filePath);
      if (existing) {
        return prev.map((t) =>
          t.path === proposal.filePath
            ? {
                ...t,
                previousSnapshot: t.content,
                content: proposal.proposedCode,
              }
            : t
        );
      } else {
        const name = proposal.filePath.split('/').pop() || proposal.filePath;
        return [
          ...prev,
          {
            path: proposal.filePath,
            name,
            content: proposal.proposedCode,
            originalContent: '',
            previousSnapshot: '',
            sha: `ai-new-${Date.now()}`,
            language: detectLanguageFromPath(proposal.filePath),
            isNew: true,
          },
        ];
      }
    });

    setActiveTabPath(proposal.filePath);

    // Ensure new file is visible in tree
    setTree((prev) => {
      const existsInTree = JSON.stringify(prev).includes(`"${proposal.filePath}"`);
      if (existsInTree) return prev;
      return [
        ...prev,
        {
          path: proposal.filePath,
          name: proposal.filePath.split('/').pop() || proposal.filePath,
          type: 'blob',
          sha: `ai-new-${Date.now()}`,
          isNew: true,
        },
      ];
    });

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              proposals: m.proposals?.map((p) =>
                p.id === proposal.id ? { ...p, status: 'applied' } : p
              ),
            }
          : m
      )
    );
  };

  // 1-Tap Undo/Revert Applied Proposal
  const handleRevertProposal = (messageId: string, proposal: CodeProposal) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.path === proposal.filePath
          ? {
              ...t,
              content:
                t.previousSnapshot !== undefined
                  ? t.previousSnapshot
                  : proposal.originalCode,
            }
          : t
      )
    );

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              proposals: m.proposals?.map((p) =>
                p.id === proposal.id ? { ...p, status: 'pending' } : p
              ),
            }
          : m
      )
    );
  };

  const handleInstallPwa = async () => {
    if (!deferredInstallPrompt) return;
    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-[#0b0f19] text-slate-100 overflow-hidden select-none">
      {/* Top Android Tablet App Bar */}
      <header className="h-12 bg-[#0f172a] border-b border-slate-800 px-3 flex items-center justify-between gap-2 shrink-0 z-30">
        {/* Left: Sidebar Toggle & Brand */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setShowSidebar((v) => !v)}
            className={`p-2 rounded-xl border transition-colors ${
              showSidebar
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Mostra/Nascondi File Explorer"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div className="truncate">
              <div className="text-xs font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>CodeFID+</span>
                <span className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Antigravity Tablet PWA
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {settings.activeOwner && settings.activeRepo
                  ? `${settings.activeOwner}/${settings.activeRepo} (${settings.activeBranch})`
                  : 'Nessun repository configurato'}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Git Commit, Install PWA, Agent Toggle, Settings */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Online/Offline Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-amber-500/20 text-amber-300'
            }`}
            title={
              isOnline
                ? 'Connesso: pronto per sincronizzare con GitHub'
                : 'Modalità Offline: le bozze sono salvate sul tablet'
            }
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Install PWA Button (Appears when installable on Android Chrome) */}
          {deferredInstallPrompt && (
            <button
              type="button"
              onClick={handleInstallPwa}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/25"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Installa App</span>
            </button>
          )}

          {/* GitHub Commit Button with Dirty Count Badge */}
          <button
            type="button"
            onClick={() => setShowCommitModal(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              dirtyTabs.length > 0
                ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-200 hover:bg-emerald-600/35'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <GitCommit className="w-4 h-4 text-emerald-400" />
            <span>Commit</span>
            {dirtyTabs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px]">
                {dirtyTabs.length}
              </span>
            )}
          </button>

          {/* Antigravity AI Panel Toggle */}
          <button
            type="button"
            onClick={() => setShowAgentPanel((v) => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
              showAgentPanel
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Agente AI</span>
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200"
            title="Impostazioni GitHub & Antigravity"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main 3-Pane Tablet Workspace */}
      <main className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Pane: GitHub File Explorer */}
        {showSidebar && (
          <SidebarExplorer
            repos={repos}
            activeOwner={settings.activeOwner}
            activeRepo={settings.activeRepo}
            activeBranch={settings.activeBranch}
            branches={branches}
            tree={tree}
            openTabs={tabs}
            activeTabPath={activeTabPath}
            isLoadingTree={isLoadingTree}
            onSelectRepo={(owner, repo, defaultBranch) =>
              setSettings((s) => ({
                ...s,
                activeOwner: owner,
                activeRepo: repo,
                activeBranch: defaultBranch,
              }))
            }
            onSelectBranch={(branch) =>
              setSettings((s) => ({ ...s, activeBranch: branch }))
            }
            onCreateBranchPrompt={handleCreateBranchPrompt}
            onRefreshTree={syncGitHubWorkspace}
            onSelectFile={handleSelectFile}
            onNewFilePrompt={handleNewFilePrompt}
          />
        )}

        {/* Center Pane: CodeMirror 6 Editor + Touch Symbol Bar */}
        <EditorPane
          tabs={tabs}
          activeTabPath={activeTabPath}
          onSelectTab={setActiveTabPath}
          onCloseTab={handleCloseTab}
          onChangeContent={handleChangeContent}
          onRevertFile={handleRevertFile}
          onOpenDiffModal={(tab) =>
            setDiffModalState({
              isOpen: true,
              filePath: tab.path,
              originalCode: tab.originalContent,
              modifiedCode: tab.content,
              title: `Modifiche locali su ${tab.name}`,
              canApply: false,
            })
          }
          onNewFilePrompt={handleNewFilePrompt}
          onAskAgentWithSelection={(sel) => {
            setSelectedSnippet(sel);
            setShowAgentPanel(true);
          }}
          fontSize={settings.fontSize}
          onChangeFontSize={(delta) =>
            setSettings((s) => ({
              ...s,
              fontSize: Math.min(24, Math.max(11, s.fontSize + delta)),
            }))
          }
          wordWrap={settings.wordWrap}
          onToggleWordWrap={() =>
            setSettings((s) => ({ ...s, wordWrap: !s.wordWrap }))
          }
          showTouchBar={settings.showTouchBar}
          showLivePreview={settings.showLivePreview}
          onToggleLivePreview={() =>
            setSettings((s) => ({ ...s, showLivePreview: !s.showLivePreview }))
          }
        />

        {/* Right Pane: Antigravity AI Assistant & 1-Tap Diff Cards */}
        {showAgentPanel && (
          <AgentPanel
            messages={messages}
            isThinking={isThinking}
            aiMode={settings.aiMode}
            hasGeminiKey={Boolean(settings.geminiApiKey.trim())}
            bridgeConnected={bridgeConnected}
            activeTab={activeTab}
            selectedSnippet={selectedSnippet}
            onClearSnippet={() => setSelectedSnippet('')}
            onSendPrompt={handleSendAgentPrompt}
            onClearChat={() => setMessages((prev) => prev.slice(0, 1))}
            onApplyProposal={handleApplyProposal}
            onRevertProposal={handleRevertProposal}
            onPreviewProposalDiff={(prop, msgId) =>
              setDiffModalState({
                isOpen: true,
                filePath: prop.filePath,
                originalCode: prop.originalCode,
                modifiedCode: prop.proposedCode,
                title: `Proposta Antigravity AI: ${prop.filePath}`,
                canApply: prop.status !== 'applied',
                onApply: () => handleApplyProposal(msgId, prop),
              })
            }
            onOpenSettings={() => setShowSettingsModal(true)}
          />
        )}
      </main>

      {/* Visual Diff Modal */}
      <DiffViewerModal
        isOpen={diffModalState.isOpen}
        filePath={diffModalState.filePath}
        originalCode={diffModalState.originalCode}
        modifiedCode={diffModalState.modifiedCode}
        title={diffModalState.title}
        canApply={diffModalState.canApply}
        onApply={diffModalState.onApply}
        onClose={() => setDiffModalState((s) => ({ ...s, isOpen: false }))}
      />

      {/* GitHub Multi-File Commit & PR Modal */}
      <GitCommitModal
        isOpen={showCommitModal}
        owner={settings.activeOwner}
        repo={settings.activeRepo}
        branch={settings.activeBranch}
        dirtyTabs={dirtyTabs}
        hasGithubToken={Boolean(settings.githubToken.trim())}
        onClose={() => setShowCommitModal(false)}
        onInspectDiff={(tab) =>
          setDiffModalState({
            isOpen: true,
            filePath: tab.path,
            originalCode: tab.originalContent,
            modifiedCode: tab.content,
            title: `Revisione Pre-Commit: ${tab.path}`,
            canApply: false,
          })
        }
        onCommitFiles={async (message, selectedPaths) => {
          const filesToCommit = tabs
            .filter((t) => selectedPaths.includes(t.path))
            .map((t) => ({
              path: t.path,
              content: t.content,
              sha: t.sha,
            }));

          const result = await commitMultipleFilesToGitHub(
            settings.activeOwner,
            settings.activeRepo,
            settings.activeBranch,
            message,
            filesToCommit,
            settings.githubToken
          );

          // Mark committed tabs as clean
          setTabs((prev) =>
            prev.map((t) =>
              selectedPaths.includes(t.path)
                ? { ...t, originalContent: t.content, isNew: false }
                : t
            )
          );
          clearDraftsForRepo(repoKey);
          await syncGitHubWorkspace();
          return result;
        }}
        onCreatePR={(title, body, head, base) =>
          createPullRequest(
            settings.activeOwner,
            settings.activeRepo,
            title,
            body,
            head,
            base,
            settings.githubToken
          )
        }
        onOpenSettings={() => setShowSettingsModal(true)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        settings={settings}
        onSave={(newSettings) => setSettings(newSettings)}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
