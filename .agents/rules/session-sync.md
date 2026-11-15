---
trigger: always_on
---

# Regola di Persistenza e Sincronizzazione Sessione (Su Richiesta)

- Non aggiornare automaticamente `docs/SESSION_SUMMARY.md` e `docs/CHAT_HISTORY.md` ad ogni modifica o fine turno.
- Aggiorna `docs/SESSION_SUMMARY.md` e `docs/CHAT_HISTORY.md` **solo quando l'utente lo chiede esplicitamente** (es. "salva/aggiorna lo storico della chat").
- Lascia sempre i file pronti nel workspace senza eseguire `git add`, `git commit` o `git push` automaticamente.
