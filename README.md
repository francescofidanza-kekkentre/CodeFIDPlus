# CodeFID+ | Guida all'Uso dell'App su Tablet Android

**CodeFID+** è un ambiente di sviluppo IDE installato come Progressive Web App (PWA) su tablet Android, progettato per programmare su **GitHub** sfruttando l'integrazione con **Google Antigravity AI** e l'editor **CodeMirror 6**.

📄 **Miniguida PDF:** [`Guida_Configurazione_CodeFIDPlus.pdf`](./Guida_Configurazione_CodeFIDPlus.pdf)

---

## 📱 Guida all'Uso e Configurazione Post-Installazione

### 1. Primo Avvio dell'App su Tablet
Una volta installata sul tablet Android, avvia **CodeFID+** toccando la sua icona nella schermata Home o nel drawer delle applicazioni:
* L'app si apre automaticamente in **modalità Standalone a schermo intero**, senza barre del browser.
* L'area di lavoro si adatta dinamicamente: quando compare la tastiera virtuale di Android, l'editor e la barra simboli touch si ridimensionano automaticamente per mantenere visibile il cursore.

---

### 2. Configurazione del GitHub Personal Access Token (PAT)
Per consentire all'app di accedere ai tuoi repository, creare branch, salvare file ed effettuare commit direttamente dal tablet:

1. Su **GitHub**:
   * Tocca la tua **foto profilo** in alto a destra → **Settings**.
   * Scorri il menu laterale a sinistra fino in fondo e seleziona **Developer settings**.
   * Tocca **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
   * Assegna un nome (es. `CodeFID+ Tablet`) e seleziona i permessi:
     - `repo` *(obbligatorio: controllo completo dei repository, commit e branch)*
     - `workflow` *(opzionale: necessario se intendi modificare file di GitHub Actions)*
   * Tocca **Generate token** e copia il token generato (`ghp_...`).
2. Sull'app **CodeFID+**:
   * Tocca l'icona **Impostazioni (⚙️)** in alto a destra.
   * Incolla il token nel campo **GitHub Personal Access Token (PAT)**.
   * Imposta o verifica l'**Owner** (il tuo username o organizzazione) e il **Repository** predefinito su cui lavorare.
   * Tocca **Salva e Applica**.

> 🔒 **Privacy e Sicurezza:** Il token viene memorizzato unicamente nello storage locale del tuo tablet (`localStorage`) e viene utilizzato esclusivamente per comunicare con le API ufficiali di GitHub.

---

### 3. Configurazione dell'Agente AI Antigravity
Nelle **Impostazioni (⚙️) → Sezione 2**, puoi configurare come l'app deve dialogare con l'AI:

#### ☁️ Modalità Cloud Autonoma (Gemini API)
Ideale in mobilità, non richiede nessun computer acceso:
1. Ottieni una chiave API su [Google AI Studio](https://aistudio.google.com/app/apikey) (`AIzaSy...`).
2. Nelle impostazioni di CodeFID+, seleziona **PWA Autonoma (Gemini Cloud)**.
3. Incolla la chiave API e seleziona il modello (`gemini-2.5-pro` per analisi approfondite o `gemini-2.5-flash` per risposte istantanee).
4. Tocca **Salva e Applica**.

#### 🖥️ Modalità Bridge Locale (`google-antigravity` Python SDK)
Per collegare il tablet al runtime Python reale di Google Antigravity in esecuzione sul tuo PC/workstation (tramite rete Wi-Fi locale o Tailscale):
1. Sul computer avvia il server bridge:
   ```bash
   pip install -r backend/requirements.txt
   python backend/antigravity_bridge.py --host 0.0.0.0 --port 8765
   ```
2. Individua l'indirizzo IP locale del tuo PC (es. `192.168.1.50`).
3. Nelle impostazioni di CodeFID+, seleziona **Antigravity Python SDK Bridge** e inserisci `http://<IP-DEL-PC>:8765`.
4. Tocca **Test Connessione** e poi **Salva e Applica**.

---

### 4. Utilizzo Quotidiano e Strumenti Touch per Tablet

| Funzione | Descrizione e Modalità d'Uso |
| :--- | :--- |
| **Barra Simboli Touch** | Posizionata appena sopra la tastiera Android. Permette di inserire caratteri di programmazione frequenti (`{ }`, `( )`, `[ ]`, `=>`, `;`, `=`, `===`, `' '`, `" "`, `` ` ` ``) e di muovere il cursore con le frecce **senza provocare la chiusura della tastiera virtuale**. |
| **Invia Selezione all'AI** | Seleziona un blocco di codice nell'editor e tocca il tasto viola **✨ AI** nella barra simboli: il codice selezionato verrà inviato come contesto immediato all'Agente Antigravity. |
| **Anteprima Diff e Applicazione in 1-Tap** | Quando l'Agente suggerisce modifiche a un file, crea una **Card Proposta** con statistiche `+righe / -righe`. Puoi toccare **Anteprima Diff** per verificare riga per riga o **Applica (1-Tap)** per aggiornare il file all'istante (con possibilità di annullare subito). |
| **Live Preview Split-Screen** | Per progetti web, tocca **Preview** nella barra superiore dell'editor per visualizzare in tempo reale l'anteprima interattiva HTML/JS/CSS a fianco del codice. |
| **Gestione File e Branch** | La barra laterale a sinistra permette di esplorare l'albero dei file, passare rapidamente da un branch all'altro o crearne di nuovi. |
| **Commit Multi-File e Pull Request** | I file modificati mostrano un indicatore di stato. Toccando il pulsante **Commit** in alto puoi esaminare l'elenco dei file, verificare i diff pre-commit, inserire il messaggio e pubblicare le modifiche su GitHub o aprire direttamente una Pull Request. |
| **Salvataggio Locale delle Bozze** | Tutte le modifiche vengono preservate localmente in automatico per evitare perdite di lavoro accidentali in caso di disconnessione della rete. |
