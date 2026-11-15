---
trigger: always_on
---

# Regola di Verifica Leggera e Ottimizzata (Build & Typecheck)

- Quando vengono modificati file `.ts` o `.tsx`, verifica la correttezza del codice eseguendo il controllo incrementale a bassa RAM (`tsc --noEmit` con `--max-old-space-size=384`) invece di `npm run build` / `vite build` dentro il terminale dell'IDE, per evitare picchi di RAM/OOM e riavvii del server Antigravity.
- Invoca direttamente il binario Node con limite di memoria esplicito (`/home/francescofidanza/.var/app/com.visualstudio.code/config/nvm/versions/node/v26.13.1/bin/node --max-old-space-size=384 ./node_modules/typescript/bin/tsc --noEmit`) senza concatenazioni `&&` o variabili `$VAR`, così il comando resta leggero, veloce (grazie a `incremental: true` in `tsconfig.json`) e compatibile con l'approvazione automatica per prefisso.
- Quando vengono modificati solo file statici (`index.html`, `public/*`, `docs/*`, file `.md` o `.json` di configurazione non TypeScript), non è necessario eseguire `vite build`.
- La build completa di produzione (`npm run build`) va eseguita solo su richiesta esplicita dell'utente (preferibilmente tramite terminale esterno con `npm run build:lowmem` o automaticamente su GitHub Actions al push).
