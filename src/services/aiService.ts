import {
  AgentToolCall,
  AppSettings,
  ChatMessage,
  CodeProposal,
  OpenFileTab,
} from '../types';
import { computeLineDiff, detectLanguageFromPath } from '../utils/diffEngine';

interface AIRequestContext {
  prompt: string;
  activeTab?: OpenFileTab;
  allOpenTabs: OpenFileTab[];
  selectedText?: string;
  repoFullName: string;
  branch: string;
  history: ChatMessage[];
  settings: AppSettings;
}

export interface AIResponsePayload {
  content: string;
  thoughts: string[];
  toolCalls: AgentToolCall[];
  proposals: CodeProposal[];
  modeUsed: 'gemini-direct' | 'claude-direct' | 'antigravity-bridge' | 'demo';
}

const ANTIGRAVITY_SYSTEM_PROMPT = `Sei Antigravity AI integrato in CodeFID+, un IDE PWA ottimizzato per tablet Android per programmare su GitHub.
Rispondi sempre in italiano in modo chiaro, tecnico e conciso.

REGOLA FONDAMENTALE PER LE MODIFICHE AL CODICE:
Quando proponi modifiche a un file esistente o la creazione di un nuovo file, restituisci l'INTERO contenuto aggiornato del file all'interno di un blocco di codice markdown che specifica il percorso del file nell'intestazione, usando esattamente questo formato:

\`\`\`linguaggio:percorso/del/file.ext
// contenuto completo del file aggiornato
\`\`\`

Ad esempio:
\`\`\`typescript:src/app.ts
// codice completo aggiornato
\`\`\`

In questo modo l'utente sul tablet Android vedrà automaticamente la Card di Anteprima Diff (+righe / -righe) e potrà applicare la modifica con 1 solo tap!`;

/**
 * Extracts code blocks from AI markdown response and converts them into interactive CodeProposals
 * with precomputed diff metrics (+added / -removed lines) for 1-tap tablet application.
 */
export function extractProposalsFromMarkdown(
  markdown: string,
  activeTab: OpenFileTab | undefined,
  allTabs: OpenFileTab[]
): CodeProposal[] {
  const proposals: CodeProposal[] = [];
  const codeBlockRegex = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const header = (match[1] || '').trim();
    const code = match[2].replace(/\n$/, '');
    if (!code.trim()) continue;

    // Parse header like "typescript:src/app.ts" or "ts src/app.ts" or just "typescript"
    let filePath = '';
    let language = 'typescript';

    if (header.includes(':')) {
      const [langPart, ...pathParts] = header.split(':');
      language = langPart.trim() || 'typescript';
      filePath = pathParts.join(':').trim();
    } else if (header.includes(' ')) {
      const parts = header.split(/\s+/);
      language = parts[0].trim();
      const possiblePath = parts.slice(1).join(' ').trim();
      if (possiblePath.includes('.') || possiblePath.includes('/')) {
        filePath = possiblePath;
      }
    } else if (header.includes('/') || header.includes('.')) {
      filePath = header;
      language = detectLanguageFromPath(filePath);
    } else if (header) {
      language = header;
    }

    // Fallback to active tab if no explicit path was given and code block is substantial
    if (!filePath && activeTab && code.split('\n').length >= 3) {
      filePath = activeTab.path;
      language = activeTab.language;
    }

    if (!filePath) continue;

    const existingTab = allTabs.find((t) => t.path === filePath);
    const originalCode = existingTab ? existingTab.content : '';
    const diff = computeLineDiff(originalCode, code);

    proposals.push({
      id: `prop-${Date.now()}-${index++}`,
      filePath,
      language: detectLanguageFromPath(filePath) || language,
      proposedCode: code,
      originalCode,
      summary: existingTab
        ? `Aggiornamento proposto per ${filePath}`
        : `Nuovo file proposto: ${filePath}`,
      addedLines: diff.addedCount,
      removedLines: diff.removedCount,
      status: 'pending',
    });
  }

  return proposals;
}

export async function checkAntigravityBridgeHealth(bridgeUrl: string): Promise<{
  ok: boolean;
  sdkAvailable?: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const cleanUrl = bridgeUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${cleanUrl}/api/antigravity/health`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return {
      ok: true,
      sdkAvailable: Boolean(data.sdk_available),
      version: data.version || '1.0.0',
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Connessione rifiutata',
    };
  }
}

/**
 * Formats chat history for Anthropic Messages API:
 * - Filters out system/empty messages
 * - Ensures alternating user/assistant turns starting with 'user'
 */
function buildClaudeMessages(
  history: ChatMessage[],
  contextualPrompt: string
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const formatted: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of history.slice(-6)) {
    if (msg.role !== 'user' && msg.role !== 'assistant') continue;
    const text = msg.content.trim();
    if (!text) continue;

    if (formatted.length === 0 && msg.role === 'assistant') {
      continue;
    }

    const last = formatted[formatted.length - 1];
    if (last && last.role === msg.role) {
      last.content = `${last.content}\n\n${text}`;
    } else {
      formatted.push({ role: msg.role, content: text });
    }
  }

  const last = formatted[formatted.length - 1];
  if (last && last.role === 'user') {
    last.content = `${last.content}\n\n${contextualPrompt}`;
  } else {
    formatted.push({ role: 'user', content: contextualPrompt });
  }

  return formatted;
}

export async function sendAgentPrompt(ctx: AIRequestContext): Promise<AIResponsePayload> {
  const { settings, activeTab, allOpenTabs, selectedText, prompt, repoFullName, branch } = ctx;

  // Build rich contextual prompt
  const openFilesSummary = allOpenTabs
    .map((t) => `- ${t.path} (${t.content !== t.originalContent ? 'modificato' : 'sincronizzato'})`)
    .join('\n');

  const contextualPrompt = [
    `Repository GitHub: ${repoFullName} (branch: ${branch})`,
    `File aperti nella sessione:\n${openFilesSummary || 'Nessuno'}`,
    activeTab
      ? `\nFile attivo corrente (${activeTab.path}):\n\`\`\`${activeTab.language}:${activeTab.path}\n${activeTab.content}\n\`\`\``
      : '',
    selectedText
      ? `\nSelezione evidenziata dall'utente sul tablet:\n\`\`\`\n${selectedText}\n\`\`\``
      : '',
    `\nRichiesta dell'utente:\n${prompt}`,
  ]
    .filter(Boolean)
    .join('\n');

  // 1. Try Antigravity Local Python SDK Bridge if selected
  if (settings.aiMode === 'antigravity-bridge') {
    const cleanUrl = settings.bridgeUrl.replace(/\/+$/, '');
    try {
      const res = await fetch(`${cleanUrl}/api/antigravity/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: contextualPrompt,
          system_instructions: ANTIGRAVITY_SYSTEM_PROMPT,
          active_file: activeTab?.path || null,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Bridge Antigravity (${res.status}): ${errText}`);
      }
      const data = await res.json();
      const content: string = data.reply || data.content || '';
      const proposals = extractProposalsFromMarkdown(content, activeTab, allOpenTabs);
      return {
        content,
        thoughts: data.thoughts || ['Connesso al runtime locale Google Antigravity SDK.'],
        toolCalls: data.tool_calls || [],
        proposals,
        modeUsed: 'antigravity-bridge',
      };
    } catch (err) {
      // If bridge fails and no fallback cloud key is configured, return demo response
      if (!settings.geminiApiKey.trim() && !settings.claudeApiKey.trim()) {
        return buildInteractiveDemoResponse(ctx, err instanceof Error ? err.message : String(err));
      }
    }
  }

  // 2. Direct Browser Claude (Anthropic) API mode
  if (settings.aiMode === 'claude-direct' && settings.claudeApiKey.trim()) {
    const model = settings.claudeModel || 'claude-sonnet-4-20250514';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.claudeApiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 8192,
        temperature: 0.25,
        system: ANTIGRAVITY_SYSTEM_PROMPT,
        messages: buildClaudeMessages(ctx.history, contextualPrompt),
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData?.error?.message || `Errore Claude API (${res.status}). Verifica la chiave API nelle Impostazioni.`
      );
    }

    const data = await res.json();
    const blocks: Array<{ type?: string; text?: string; thinking?: string }> = Array.isArray(data?.content)
      ? data.content
      : [];

    const textParts = blocks
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string);
    const thinkingParts = blocks
      .filter((b) => b.type === 'thinking' && b.thinking)
      .map((b) => b.thinking as string);

    const content = textParts.join('\n');
    const proposals = extractProposalsFromMarkdown(content, activeTab, allOpenTabs);

    return {
      content: content || 'Nessuna risposta generata.',
      thoughts: [
        ...thinkingParts,
        `Analisi contestuale di ${activeTab?.path || repoFullName} completata tramite ${model}.`,
        proposals.length > 0
          ? `Generata ${proposals.length} proposta di modifica pronta per l'applicazione con 1 tap.`
          : 'Risposta diretta elaborata.',
      ],
      toolCalls: activeTab
        ? [{ name: 'inspect_active_tab', args: { path: activeTab.path, branch } }]
        : [],
      proposals,
      modeUsed: 'claude-direct',
    };
  }

  // 3. Direct Browser Gemini API mode
  if (settings.aiMode === 'gemini-direct' && settings.geminiApiKey.trim()) {
    const model = settings.geminiModel || 'gemini-2.5-pro';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(settings.geminiApiKey.trim())}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: ANTIGRAVITY_SYSTEM_PROMPT }],
        },
        contents: [
          ...ctx.history.slice(-6).map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          {
            role: 'user',
            parts: [{ text: contextualPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(
        errData?.error?.message || `Errore Gemini API (${res.status}). Verifica la chiave API nelle Impostazioni.`
      );
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const content = parts.map((p: { text?: string }) => p.text || '').join('\n');
    const proposals = extractProposalsFromMarkdown(content, activeTab, allOpenTabs);

    return {
      content: content || 'Nessuna risposta generata.',
      thoughts: [
        `Analisi contestuale di ${activeTab?.path || repoFullName} completata tramite ${model}.`,
        proposals.length > 0
          ? `Generata ${proposals.length} proposta di modifica pronta per l'applicazione con 1 tap.`
          : 'Risposta diretta elaborata.',
      ],
      toolCalls: activeTab
        ? [{ name: 'inspect_active_tab', args: { path: activeTab.path, branch } }]
        : [],
      proposals,
      modeUsed: 'gemini-direct',
    };
  }

  // 3. Smart Interactive Demo Mode (when user hasn't entered API key yet, so they can immediately test 1-Tap Diff Apply!)
  return buildInteractiveDemoResponse(ctx);
}

function buildInteractiveDemoResponse(
  ctx: AIRequestContext,
  bridgeError?: string
): AIResponsePayload {
  const { activeTab, allOpenTabs, prompt } = ctx;
  const targetTab = activeTab || allOpenTabs[0];

  let proposedCode = '';
  let targetPath = targetTab ? targetTab.path : 'src/app.ts';
  let targetLang = targetTab ? targetTab.language : 'typescript';

  if (targetTab) {
    if (targetTab.language === 'typescript' || targetTab.language === 'javascript') {
      proposedCode =
        targetTab.content.trimEnd() +
        `\n\n// ✨ [Antigravity AI] Funzione generata per: "${prompt.slice(0, 50)}"\nexport function getTabletWorkspaceStats() {\n  return {\n    platform: 'Android Tablet PWA',\n    engine: 'Antigravity Hybrid v1.0',\n    timestamp: new Date().toISOString(),\n    touchOptimized: true,\n  };\n}\n`;
    } else if (targetTab.language === 'python') {
      proposedCode =
        targetTab.content.trimEnd() +
        `\n\n# ✨ [Antigravity AI] Helper generato per: "${prompt.slice(0, 50)}"\ndef get_tablet_status() -> dict:\n    return {\n        "device": "Android Tablet",\n        "agent": "google-antigravity",\n        "status": "ready",\n    }\n`;
    } else if (targetTab.language === 'html') {
      proposedCode = targetTab.content.replace(
        '</body>',
        `  <!-- ✨ [Antigravity AI] Banner aggiunto -->\n  <div style="margin-top:16px;padding:12px;border-radius:12px;background:#064e3b;color:#a7f3d0;">\n    ✨ Modifica applicata con 1 Tap da Antigravity AI!\n  </div>\n</body>`
      );
    } else {
      proposedCode =
        targetTab.content.trimEnd() +
        `\n\n<!-- Modifica generata da Antigravity AI: ${prompt.slice(0, 40)} -->\n`;
    }
  } else {
    proposedCode = `// Nuovo modulo generato da Antigravity AI\nexport const antigravityReady = true;\n`;
  }

  const replyMarkdown = [
    bridgeError
      ? `> **Nota Bridge Locale**: Impossibile contattare il server Antigravity SDK locale (${bridgeError}). Rispondo in **Modalità Demo Interattiva** (puoi inserire una **Gemini o Claude API Key** nelle Impostazioni ⚙️ o avviare \`python backend/antigravity_bridge.py\`).\n`
      : `> **Modalità Demo Interattiva Attiva**: Per usare il modello live, inserisci la tua **Gemini o Claude API Key** nelle Impostazioni (⚙️) oppure avvia il bridge locale \`backend/antigravity_bridge.py\`. Nel frattempo, ecco una proposta di modifica reale per testare subito il **Diff Viewer** e l'**Applicazione con 1 Tap**!\n`,
    `Ho analizzato **\`${targetPath}\`** in base alla tua richiesta (*"${prompt}"*) e ho preparato l'aggiornamento completo del file qui sotto:`,
    `\n\`\`\`${targetLang}:${targetPath}\n${proposedCode}\`\`\``,
  ].join('\n');

  const proposals = extractProposalsFromMarkdown(replyMarkdown, activeTab, allOpenTabs);

  return {
    content: replyMarkdown,
    thoughts: [
      `Lettura file attivo: ${targetPath}`,
      `Calcolo diff line-by-line per interfaccia touch Android`,
      `Preparazione Card "Applica con 1 Tap"`,
    ],
    toolCalls: [
      { name: 'read_file', args: { path: targetPath } },
      { name: 'propose_patch', args: { target: targetPath, interactive_diff: true } },
    ],
    proposals,
    modeUsed: 'demo',
  };
}
