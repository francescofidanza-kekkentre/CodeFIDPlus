---
trigger: always_on
---

# Regola di Verifica Leggera e Ottimizzata (Build & Typecheck)

- Quando vengono modificati file `.ts` o `.tsx`, verifica la correttezza del codice eseguendo il controllo leggero `npm run typecheck` (`tsc -b`) invece di `npm run build` / `vite build` dentro il terminale dell'IDE, per evitare picchi di RAM/OOM e riavvii del server Antigravity.
- Se `npm` non è nel PATH predefinito, invoca direttamente il binario (es. `/home/francescofidanza/.var/app/com.visualstudio.code/config/nvm/versions/node/v26.13.1/bin/npm run typecheck`) senza concatenazioni `&&` o variabili `$VAR`, così il comando resta semplice e compatibile con l'approvazione automatica per prefisso.
- Quando vengono modificati solo file statici (`index.html`, `public/*`, `docs/*`, file `.md` o `.json` di configurazione non TypeScript), non è necessario eseguire `vite build`.
- La build completa di produzione (`npm run build`) va eseguita solo su richiesta esplicita dell'utente (preferibilmente tramite terminale esterno con `npm run build:lowmem` o automaticamente su GitHub Actions al push).
