import { AppSettings, FileTreeNode, OpenFileTab } from '../types';

const SETTINGS_KEY = 'codefid_plus_settings_v1';
const DRAFTS_KEY = 'codefid_plus_drafts_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  githubToken: '',
  activeOwner: 'francescofidanza-kekkentre',
  activeRepo: 'CodeFIDPlus',
  activeBranch: 'main',
  aiMode: 'gemini-direct',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-pro',
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
    const raw = localStorage.getItem(`${DRAFTS_KEY}_${repoKey}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearDraftsForRepo(repoKey: string): void {
  try {
    localStorage.removeItem(`${DRAFTS_KEY}_${repoKey}`);
  } catch {
    // ignore
  }
}

/**
 * Starter workspace files loaded when no GitHub token is configured yet or repo is empty,
 * so the tablet IDE is 100% interactive out of the box.
 */
export const DEMO_WORKSPACE_FILES: Record<string, { content: string; language: string; sha: string }> = {
  'src/app.ts': {
    language: 'typescript',
    sha: 'demo-sha-1',
    content: `/**
 * CodeFID+ — Starter Module per Tablet Android & Antigravity AI
 * Prova a selezionare una funzione e chiedere all'Agente AI di ottimizzarla!
 */

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export class ProjectManager {
  private tasks: TaskItem[] = [
    { id: '1', title: 'Configurare GitHub PAT nelle Impostazioni', completed: true, priority: 'high' },
    { id: '2', title: 'Testare la barra simboli touch su tablet Android', completed: false, priority: 'high' },
    { id: '3', title: 'Applicare un diff generato da Antigravity con 1 tap', completed: false, priority: 'medium' },
  ];

  public getPendingTasks(): TaskItem[] {
    return this.tasks.filter((task) => !task.completed);
  }

  public addTask(title: string, priority: TaskItem['priority'] = 'medium'): TaskItem {
    const newTask: TaskItem = {
      id: Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      completed: false,
      priority,
    };
    this.tasks.push(newTask);
    return newTask;
  }

  public toggleTask(id: string): boolean {
    const found = this.tasks.find((t) => t.id === id);
    if (!found) return false;
    found.completed = !found.completed;
    return true;
  }
}
`,
  },
  'index.html': {
    language: 'html',
    sha: 'demo-sha-2',
    content: `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>Live Preview Tablet Sandbox</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      margin: 0;
      padding: 24px;
    }
    .card {
      background: linear-gradient(135deg, #1e1b4b, #0f172a);
      border: 1px solid #4f46e5;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    button {
      background: #6366f1;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>🚀 CodeFID+ Live Preview</h2>
    <p>Attiva "Preview" nella barra superiore per vedere le modifiche HTML/CSS/JS in tempo reale in split-screen sul tuo tablet Android.</p>
    <button onclick="document.getElementById('out').textContent = 'Tap rilevato alle ' + new Date().toLocaleTimeString()">
      Tocca per Testare
    </button>
    <p id="out" style="color: #34d399; font-weight: bold; margin-top: 12px;"></p>
  </div>
</body>
</html>`,
  },
  'backend/antigravity_agent.py': {
    language: 'python',
    sha: 'demo-sha-3',
    content: `import asyncio
from google.antigravity import Agent, LocalAgentConfig, CapabilitiesConfig

async def run_codefid_agent(prompt: str) -> None:
    """Esempio di integrazione con Google Antigravity Python SDK."""
    config = LocalAgentConfig(
        system_instructions="Sei l'agente AI di CodeFID+ per lo sviluppo mobile su GitHub.",
        capabilities=CapabilitiesConfig(),
    )
    async with Agent(config) as agent:
        response = await agent.chat(prompt)
        async for token in response:
            print(token, end="", flush=True)

if __name__ == "__main__":
    asyncio.run(run_codefid_agent("Analizza il repository e proponi ottimizzazioni."))
`,
  },
  'README.md': {
    language: 'markdown',
    sha: 'demo-sha-4',
    content: `# CodeFID+ | Guida all'Uso Post-Installazione

Benvenuto in **CodeFID+**, l'ambiente di sviluppo per **tablet Android** con architettura ibrida **GitHub API + Google Antigravity**.

## Come iniziare subito dopo l'installazione
1. **GitHub Personal Access Token (PAT)**: su GitHub vai in *Settings → Developer settings → Personal access tokens → Tokens (classic)*, genera un token con permesso \`repo\` (\`ghp_...\`) e incollalo in **Impostazioni (⚙️)** in alto a destra.
2. **Agente AI Antigravity**:
   - **Modalità Cloud Autonoma**: inserisci la tua Gemini API Key (\`AIzaSy...\`) nelle Impostazioni per lavorare ovunque in mobilità.
   - **Modalità Bridge PC**: avvia il bridge sul computer (\`python backend/antigravity_bridge.py\`) e inserisci l'indirizzo IP locale nelle Impostazioni.
3. **Ergonomia Touch su Tablet**: usa la **Barra Simboli Touch** sopra la tastiera, il tasto **✨ AI** per analizzare il codice selezionato e il pulsante **Applica (1-Tap)** per applicare le proposte con anteprima diff!
`,
  },
};

export function getDemoFileTree(): FileTreeNode[] {
  return [
    {
      path: 'src',
      name: 'src',
      type: 'tree',
      sha: 'dir-src',
      children: [
        {
          path: 'src/app.ts',
          name: 'app.ts',
          type: 'blob',
          sha: 'demo-sha-1',
        },
      ],
    },
    {
      path: 'backend',
      name: 'backend',
      type: 'tree',
      sha: 'dir-backend',
      children: [
        {
          path: 'backend/antigravity_agent.py',
          name: 'antigravity_agent.py',
          type: 'blob',
          sha: 'demo-sha-3',
        },
      ],
    },
    {
      path: 'index.html',
      name: 'index.html',
      type: 'blob',
      sha: 'demo-sha-2',
    },
    {
      path: 'README.md',
      name: 'README.md',
      type: 'blob',
      sha: 'demo-sha-4',
    },
  ];
}
