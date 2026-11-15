# CodeFID+ | Riepilogo Completo della Sessione Antigravity AI

Questo documento contiene lo storico dettagliato dell'architettura, delle decisioni progettuali e dello sviluppo effettuato in questa sessione per l'ambiente **CodeFID+**.

> 💡 **Come riprendere il contesto su un altro computer o dispositivo:**  
> Clona o fai `git pull` del repository, apri Antigravity e digita semplicemente:  
> *"Leggi `docs/SESSION_SUMMARY.md` e `docs/CHAT_HISTORY.md` e riprendiamo da dove eravamo rimasti"*.

---

## 📌 1. Panoramica del Progetto
**CodeFID+** è un ambiente di sviluppo IDE progettato specificamente per **tablet Android e iOS (iPad)**, orientato alla programmazione su **GitHub** e assistito in modo ibrido da **Google Antigravity AI**.

* **Tecnologie Frontend:** React 18, TypeScript, Vite, Tailwind CSS, CodeMirror 6.
* **Ergonomia Touch:** Barra simboli sopra la tastiera virtuale, viewport reattivo con `interactive-widget=resizes-content`.
* **Architettura AI Ibrida:**
  1. *Modalità Cloud Autonoma:* chiama direttamente l'API Gemini dal browser del tablet (senza PC acceso).
  2. *Modalità Bridge Locale:* si collega tramite rete locale o VPN allo script `backend/antigravity_bridge.py` in esecuzione su PC/workstation con l'SDK ufficiale `google-antigravity`.
* **Proposte di Codice 1-Tap:** l'Agente estrae blocchi di codice e genera Card Interattive con conteggio `+righe / -righe`, visualizzatore diff e pulsante di applicazione immediata con un solo tocco (e annulla rapido).
* **Gestione GitHub:** lettura alberi file, selezione/creazione branch, commit atomici multi-file tramite Git Data API e apertura Pull Request.

---

## 🛠️ 2. File e Componenti Chiave Realizzati

| File / Modulo | Scopo e Funzionalità |
| :--- | :--- |
| `src/main.tsx` | Entrypoint React protetto a doppio livello da `<TabletGate>` e `<StoreProtectionGate>`. |
| `src/App.tsx` | Layout a 3 pannelli per tablet (Explorer file, Editor CodeMirror 6, Agente Antigravity). |
| `src/components/TabletGate.tsx` | Schermata di blocco per computer desktop/smartphone: consente l'accesso solo da tablet Android/iPad (con tasto dev override). |
| `src/utils/deviceDetector.ts` | Rilevamento avanzato di tablet Android (token Android senza Mobile), iPadOS e schermi touch capacitivi $\ge 580\text{px}$. |
| `src/components/StoreProtectionGate.tsx` | Protezione commerciale: blocca l'accesso web libero da browser e verifica la licenza d'acquisto dallo Store. |
| `src/utils/storeProtection.ts` | Verifica crittografica con hash **SHA-256** (nessun codice in chiaro) e rilevamento intent TWA/Capacitor. |
| `src/components/TouchSymbolBar.tsx` | Barra rapida touch posizionata sopra la tastiera virtuale (`{ }`, `( )`, `=>`, `;`, `Tab`, frecce direzionali, tasto `AI`). |
| `src/components/EditorPane.tsx` | Editor CodeMirror 6 multi-scheda, con zoom font, word-wrap e Live Sandbox Preview split-screen. |
| `src/components/AgentPanel.tsx` | Chat contestuale con l'Agente Antigravity, storico pensieri (`thoughts`), tool calls e card di applicazione diff. |
| `src/services/githubService.ts` | Client REST e Git Data API per gestione repository, alberi file, commit multi-file e Pull Request. |
| `src/services/storageService.ts` | Gestione persistente di impostazioni, sessione di lavoro (schede aperte, file attivo) e bozze locali in `localStorage`. |
| `src/vite-env.d.ts` | Dichiarazioni ambientali TypeScript (`JSX.IntrinsicElements`) per azzerare gli errori di VS Code in assenza di `node_modules` locale. |
| `backend/antigravity_bridge.py` | Server HTTP Python leggero per esporre l'SDK `google-antigravity` locale al tablet via LAN/Tailscale. |
| `public/sw.js` & `index.html` | Service Worker `v2` con politica **Strict Network-First** (no cache statica per il codice web, auto-reload al deploy). |
| `.github/workflows/deploy.yml` | Workflow GitHub Actions per compilare e distribuire automaticamente l'app su GitHub Pages ad ogni push. |
| `.agents/rules/git-workflow.md` | Regola permanente per l'Agente: **nessun commit o push automatico**, l'utente gestisce sempre Git in autonomia. |
| `.agents/rules/session-sync.md` | Regola permanente per l'Agente: **salvataggio e aggiornamento automatico dello storico chat** (`docs/SESSION_SUMMARY.md` e `docs/CHAT_HISTORY.md`) al termine di ogni risposta. |
| `.vscode/settings.json` | Configurazione `css.lint.unknownAtRules: "ignore"` per silenziare i falsi allarmi del linter su `@tailwind`. |
| `Guida_Configurazione_CodeFIDPlus.pdf` | Scheda PDF ad alta risoluzione (1 pagina A4) per la configurazione post-installazione sul tablet. |
| `capacitor.config.json` | Configurazione per il packaging nativo Android (`.apk`/`.aab`) e iOS (`.ipa`). |
| `docs/CHAT_HISTORY.md` | Trascrizione cronologica completa di domande, risposte, decisioni e comandi della sessione. |

---

## 🔒 3. Misure di Sicurezza e Protezione Introdotte

1. **Nessun Indirizzo Web Esposto nella Documentazione:**
   * Sia in `README.md` che nella miniguida PDF è stato rimosso qualsiasi riferimento all'URL pubblico di GitHub Pages.
2. **Stato Iniziale Pulito (Zero dati personali):**
   * Al primo avvio l'app non precarica repository hardcoded o file demo: parte pulita e vuota, pronta per essere configurata dall'utente tramite le Impostazioni.
3. **Protezione Accesso Store:**
   * Chiunque provi ad aprire l'URL pubblico da un browser comune viene bloccato da una schermata di sicurezza che richiede l'acquisto su Google Play Store o Apple App Store.
   * La chiave di sblocco master per test/sviluppo (`CODEFID-STORE-2026`) è protetta tramite **hash crittografico irreversibile SHA-256** (`b58f846695234676d28ee500640b88e5f2b55cfc53d5fdca839aafccc5df406c`). Nessun testo in chiaro è presente nel bundle JavaScript.
4. **Conformità Policy Store e Tutela Marchi Registrati:**
   * Titolo standardizzato in `index.html` e `manifest.webmanifest`: `"CodeFID+ - Touch Code & Git IDE"`.
   * Rimossi riferimenti che potevano suggerire un'affiliazione ufficiale diretta nei titoli principali dell'app.
   * Inserito il disclaimer standard di non-affiliazione in `README.md` e nel modal delle Impostazioni (`SettingsModal.tsx`).

---

## 📱 4. Istruzioni per Generare l'App Nativa Android per lo Store (Capacitor)

Quando si desidera impacchettare l'applicazione per la vendita su **Google Play Store**:

1. Aprire il terminale di Visual Studio Code (`Ctrl + \``) nella cartella del progetto.
2. Installare i pacchetti Capacitor:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```
3. Compilare il progetto web:
   ```bash
   npm run build
   ```
4. Aggiungere il progetto nativo Android:
   ```bash
   npx cap add android
   ```
5. Sincronizzare e aprire Android Studio:
   ```bash
   npx cap sync
   npx cap open android
   ```
6. In Android Studio: selezionare **Build → Generate Signed Bundle / APK** per produrre il file `.aab` firmato da caricare sulla **Google Play Console**.

---

## 🔄 5. Regole Permanenti del Progetto

1. **Gestione Git (`.agents/rules/git-workflow.md`):**
   * Tutti i file vengono lasciati modificati/pronti nell'area di lavoro senza eseguire comandi `git add`, `git commit` o `git push` automatici.
2. **Sincronizzazione Sessione (`.agents/rules/session-sync.md`):**
   * Alla fine di ogni turno, i file `docs/SESSION_SUMMARY.md` e `docs/CHAT_HISTORY.md` vengono aggiornati per preservare l'intero contesto e permetterne la sincronizzazione con qualsiasi altro dispositivo.

---

## 📍 6. Stato Attuale
* **Ultimo aggiornamento:** 2026-11-15 — Aggiunta l'attivazione automatica della modalità immersiva al primo tocco su Android (`requestFullscreen({ navigationUI: 'hide' })` in `src/App.tsx`) per nascondere la barra inferiore di sistema. `npm run typecheck` completato con codice 0. Tutti i file sono pronti nel workspace (nessun commit/push eseguito).
