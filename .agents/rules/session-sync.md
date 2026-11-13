---
trigger: always_on
---

# Regola di Persistenza e Sincronizzazione Sessione

- Alla fine di ogni turno o risposta a una richiesta dell'utente, aggiorna sempre i file `docs/SESSION_SUMMARY.md` e `docs/CHAT_HISTORY.md`.
- Includi sempre le ultime richieste dell'utente, le decisioni tecniche adottate, le modifiche apportate ai file e lo stato del progetto.
- In questo modo l'utente potrà ritrovare l'intera cronologia e il contesto su qualsiasi altro dispositivo collegato allo stesso account GitHub / Antigravity semplicemente sincronizzando il repository.
- Lascia sempre i file pronti nel workspace (rispettando sempre la regola di non eseguire mai `git add`, `git commit` o `git push` automaticamente).
