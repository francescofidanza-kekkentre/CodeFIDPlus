---
trigger: always_on
---

# Regole Git e Controllo Versione

- Non eseguire mai `git add`, `git commit` o `git push` automaticamente a meno che l'utente non lo chieda esplicitamente.
- Lascia sempre tutti i file creati o modificati pronti nel workspace senza toccare lo stage o i commit di Git, in modo che l'utente possa fare in autonomia revisione, stage e commit quando preferisce.
