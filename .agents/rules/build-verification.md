---
trigger: always_on
---

# Regola di Verifica Leggera e Ottimizzata (Build & Typecheck)

- Quando vengono modificati file `.ts` o `.tsx`, verifica la correttezza del codice eseguendo il controllo leggero `npm run typecheck` (`tsc -b`) invece di `npm run build` / `vite build` dentro il terminale dell'IDE, per evitare picchi di RAM/OOM e riavvii del server Antigravity.
- Quando vengono modificati solo file statici (`index.html`, `public/*`, `docs/*`, file `.md` o `.json` di configurazione non TypeScript), non è necessario eseguire `vite build`.
- La build completa di produzione (`npm run build`) va eseguita solo su richiesta esplicita dell'utente (preferibilmente tramite terminale esterno con `npm run build:lowmem` o automaticamente su GitHub Actions al push).
