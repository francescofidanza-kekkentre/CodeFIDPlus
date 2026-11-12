# CodeFID+ | Antigravity GitHub Tablet PWA

**CodeFID+** è una **Progressive Web App (PWA)** progettata su misura per **tablet Android** per programmare su **GitHub** sfruttando un'architettura **ibrida Google Antigravity AI**.

---

## ✨ Caratteristiche Principali

1. **Architettura AI Ibrida (Autonoma + Bridge SDK Locale)**
   - **Modalità Cloud Autonoma (Gemini API Diretta)**: funziona al 100% nel browser del tablet Android (anche ospitata su GitHub Pages) comunicando direttamente con le API Gemini e GitHub REST v3.
   - **Modalità Bridge Locale (`google-antigravity` Python SDK)**: si collega tramite LAN o Tailscale allo script [`backend/antigravity_bridge.py`](./backend/antigravity_bridge.py) in esecuzione sul tuo PC/server per pilotare l'agente reale `google.antigravity.Agent`, visualizzando in tempo reale *Thoughts* (ragionamenti) e *Tool Calls*.
2. **Pannello Agente AI con Anteprima Diff e Applicazione 1-Tap**
   - Ogni modifica proposta dall'AI genera una **Card Interattiva** con il conteggio delle righe aggiunte/rimosse (`+N / -M`).
   - Pulsante **Anteprima Diff** per ispezionare il confronto riga per riga.
   - Pulsante **Applica (1-Tap)** per inserire istantaneamente il codice nell'editor (o creare un nuovo file) con possibilità di **Annulla (1-Tap)** immediato.
3. **Ergonomia Ottimizzata per Tablet Android + CodeMirror 6**
   - **Barra Simboli Touch Rapida** posizionata sopra la tastiera virtuale Android (`{ }`, `( )`, `[ ]`, `=>`, `;`, `=`, `' '`, `" "`, `` ` ` ``, `Tab`, `⇧Tab`, frecce direzionali `← ↓ ↑ →`, `Undo/Redo`, e pulsante `AI`).
   - I pulsanti della barra simboli usano `onPointerDown` con `preventDefault()` per **non far chiudere la tastiera Android** durante la digitazione.
   - Meta viewport con `interactive-widget=resizes-content` per ridimensionare fluidamente l'editor quando compare la tastiera su Chrome per Android.
4. **Flusso GitHub Completo & Bozze Offline**
   - Esplorazione repository, cambio/creazione branch, albero file ricorsivo, **commit atomico multi-file** tramite GitHub Git Data API e apertura **Pull Request**.
   - Salvataggio automatico delle bozze locali su `localStorage` per non perdere mai il lavoro anche se cade la connessione sul tablet.

---

## 🚀 Come Avviare e Pubblicare la PWA

### Opzione A: Pubblicazione Automatica su GitHub Pages (Consigliata per Tablet)
Il repository include già il workflow GitHub Actions [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml):
1. Esegui il push del codice sul branch `main` di `francescofidanza-kekkentre/CodeFIDPlus`.
2. Su GitHub vai in **Settings → Pages** e sotto **Build and deployment → Source** seleziona **GitHub Actions**.
3. Al termine dell'azione, apri l'URL GitHub Pages da **Chrome sul tuo tablet Android** e tocca **"Installa App"** nella barra in alto (oppure *Menu Chrome → Aggiungi a schermata Home*).

### Opzione B: Sviluppo Locale con Vite (Node.js)
```bash
npm install
npm run dev
```
L'opzione `--host` espone il server sulla rete locale così puoi aprirlo direttamente dal tablet Android collegato allo stesso Wi-Fi.

### Opzione C: Avvio del Bridge Locale Antigravity Python SDK (Opzionale)
Se vuoi collegare il tablet Android al runtime Python di **Google Antigravity** sul tuo PC:
```bash
pip install -r backend/requirements.txt
python backend/antigravity_bridge.py --host 0.0.0.0 --port 8765
```
Poi apri le **Impostazioni (⚙️)** nella PWA sul tablet, seleziona **Antigravity Python SDK Bridge** e inserisci `http://<IP-DEL-PC>:8765`.

---

## 📂 Struttura del Progetto

- [`index.html`](./index.html) — Entrypoint PWA con configurazione `viewport-fit=cover` e `interactive-widget=resizes-content` per Android.
- [`public/manifest.webmanifest`](./public/manifest.webmanifest) & [`public/sw.js`](./public/sw.js) — Web App Manifest installabile e Service Worker per caching offline.
- [`src/App.tsx`](./src/App.tsx) — Layout principale a 3 pannelli adattivo per tablet Android (Esplora File, Editor CodeMirror 6, Agente AI Antigravity).
- [`src/components/EditorPane.tsx`](./src/components/EditorPane.tsx) — Editor CodeMirror 6 multi-tab con Live Sandbox Preview split-screen.
- [`src/components/TouchSymbolBar.tsx`](./src/components/TouchSymbolBar.tsx) — Barra simboli rapida touch sopra la tastiera virtuale Android.
- [`src/components/AgentPanel.tsx`](./src/components/AgentPanel.tsx) — Pannello chat contestuale Antigravity AI con Card Diff e applicazione in 1 tap.
- [`src/components/DiffViewerModal.tsx`](./src/components/DiffViewerModal.tsx) — Visualizzatore diff riga per riga (`+aggiunte / -rimosse`).
- [`src/components/GitCommitModal.tsx`](./src/components/GitCommitModal.tsx) — Finestra di commit multi-file e creazione Pull Request.
- [`src/services/githubService.tsx`](./src/services/githubService.ts) — Client GitHub REST API v3 & Git Data API.
- [`src/services/aiService.ts`](./src/services/aiService.ts) — Motore AI ibrido (Gemini Cloud + Antigravity SDK Bridge + estrattore automatico di proposte diff).
- [`backend/antigravity_bridge.py`](./backend/antigravity_bridge.py) — Server bridge Python basato su `google-antigravity`.
