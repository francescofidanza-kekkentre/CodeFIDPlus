import { AppSettings, FileTreeNode, OpenFileTab } from '../types';

const SETTINGS_KEY = 'codefid_plus_settings_v1';
const DRAFTS_KEY = 'codefid_plus_drafts_v1';
const SESSION_KEY = 'codefid_plus_session_v1';
const WIZARD_DONE_KEY = 'codefid_plus_wizard_done_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  githubToken: '',
  activeOwner: '',
  activeRepo: '',
  activeBranch: 'main',
  aiMode: 'gemini-direct',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-pro',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-20250514',
  bridgeUrl: 'http://localhost:8765',
  fontSize: 15,
  wordWrap: true,
  showTouchBar: true,
  showLivePreview: false,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Impossibile salvare le impostazioni su localStorage:', err);
  }
}

export interface StoredDraft {
  repoKey: string;
  path: string;
  content: string;
  originalContent: string;
  sha: string;
  isNew?: boolean;
  updatedAt: number;
}

export function saveDrafts(repoKey: string, tabs: OpenFileTab[]): void {
  try {
    if (!repoKey || repoKey.startsWith('/')) return;
    const dirtyDrafts: StoredDraft[] = tabs
      .filter((t) => t.content !== t.originalContent || t.isNew)
      .map((t) => ({
        repoKey,
        path: t.path,
        content: t.content,
        originalContent: t.originalContent,
        sha: t.sha,
        isNew: t.isNew,
        updatedAt: Date.now(),
      }));
    localStorage.setItem(`${DRAFTS_KEY}_${repoKey}`, JSON.stringify(dirtyDrafts));
  } catch (err) {
    console.warn('Impossibile salvare bozze locali:', err);
  }
}

export function loadDrafts(repoKey: string): StoredDraft[] {
  try {
    if (!repoKey || repoKey.startsWith('/')) return [];
    const raw = localStorage.getItem(`${DRAFTS_KEY}_${repoKey}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearDraftsForRepo(repoKey: string): void {
  try {
    if (!repoKey) return;
    localStorage.removeItem(`${DRAFTS_KEY}_${repoKey}`);
  } catch {
    // ignore
  }
}

export interface StoredSession {
  repoKey: string;
  tabs: OpenFileTab[];
  activeTabPath: string;
}

export function saveSession(repoKey: string, tabs: OpenFileTab[], activeTabPath: string): void {
  try {
    if (!repoKey || repoKey.startsWith('/')) return;
    const session: StoredSession = { repoKey, tabs, activeTabPath };
    localStorage.setItem(`${SESSION_KEY}_${repoKey}`, JSON.stringify(session));
  } catch (err) {
    console.warn('Impossibile salvare sessione su localStorage:', err);
  }
}

export function loadSession(repoKey: string): StoredSession | null {
  try {
    if (!repoKey || repoKey.startsWith('/')) return null;
    const raw = localStorage.getItem(`${SESSION_KEY}_${repoKey}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isSetupWizardCompleted(): boolean {
  try {
    return localStorage.getItem(WIZARD_DONE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markSetupWizardCompleted(): void {
  try {
    localStorage.setItem(WIZARD_DONE_KEY, 'true');
  } catch {
    // ignore
  }
}
