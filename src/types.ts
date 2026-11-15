export type AIMode = 'gemini-direct' | 'claude-direct' | 'antigravity-bridge';

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  private: boolean;
  default_branch: string;
  description: string | null;
  updated_at: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
}

export interface FileTreeNode {
  path: string;
  name: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  children?: FileTreeNode[];
  isModified?: boolean;
  isNew?: boolean;
}

export interface OpenFileTab {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  sha: string;
  language: string;
  isLoading?: boolean;
  isNew?: boolean;
  previousSnapshot?: string;
}

export interface CodeProposal {
  id: string;
  filePath: string;
  language: string;
  proposedCode: string;
  originalCode: string;
  summary: string;
  addedLines: number;
  removedLines: number;
  status: 'pending' | 'applied' | 'rejected';
}

export interface AgentToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  thoughts?: string[];
  toolCalls?: AgentToolCall[];
  proposals?: CodeProposal[];
  modeUsed?: AIMode | 'demo';
}

export interface AppSettings {
  githubToken: string;
  activeOwner: string;
  activeRepo: string;
  activeBranch: string;
  aiMode: AIMode;
  geminiApiKey: string;
  geminiModel: string;
  claudeApiKey: string;
  claudeModel: string;
  bridgeUrl: string;
  fontSize: number;
  wordWrap: boolean;
  showTouchBar: boolean;
  showLivePreview: boolean;
}

export interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export interface DiffResult {
  lines: DiffLine[];
  addedCount: number;
  removedCount: number;
}
