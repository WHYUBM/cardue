# CLAUDE.md — istruzioni di progetto per Claude Code

Questo file dà a Claude Code il contesto stabile del progetto. Leggilo prima di
operare e tienilo aggiornato quando le cose cambiano.

## Cos'è Cardue

PWA per tenere sotto controllo scadenze e manutenzione dell'auto (bollo,
assicurazione, revisione, tagliando) con promemoria automatici prima di ogni
scadenza. Progetto **open source, non profit**, a scopo didattico e di
portfolio: uno degli obiettivi espliciti è **imparare strumenti usati in
azienda**, quindi privilegia soluzioni standard e ben documentate rispetto a
scorciatoie.

## Stato attuale

Siamo al **passo 2 completato** della roadmap nel README: esistono solo la
struttura del repo, il README e i primi ADR. **Non c'è ancora codice
applicativo.** Il prossimo obiettivo è il passo 3: lo scheletro end-to-end in
locale.

## ⚠️ Decisioni NON ancora finalizzate

Alcune scelte sono provvisorie. **Non trattarle come definitive e non costruirci
sopra codice significativo senza prima confermarle con l'utente.**

- **Database**: PostgreSQL è indicato negli ADR, ma **non è confermato** —
  l'utente sta ancora valutando. Se una task tocca la scelta del DB, proponi
  opzioni e chiedi conferma prima di procedere.
- **Framework**: React+Vite (frontend) e NestJS (backend) sono **default
  ragionevoli, non scelte bloccate** (vedi ADR 0001, stato "Proposto").
- **Fonte dataset marca-modello**: da scegliere (ADR 0004, "Proposto").

Regola generale: gli ADR con stato **"Proposto"** sono aperti. Prima di scrivere
codice che dipende da una decisione "Proposto", segnalalo, proponi le alternative
e aggiorna l'ADR (o creane uno nuovo) una volta deciso.

## Stack (allo stato attuale, da confermare dove indicato sopra)

- Frontend: React + Vite, come PWA installabile — *proposto*
- Backend: Node.js + NestJS, TypeScript — *proposto*
- Database: PostgreSQL — *da confermare*
- Notifiche: Web Push (VAPID) + cron giornaliero — *accettato*
- Deploy: VPS Aruba + Docker Compose, reverse proxy con HTTPS — *accettato*
- CI/CD: GitHub Actions — previsto più avanti

## Convenzioni

- **ADR**: ogni decisione architetturale va documentata in `docs/adr/` usando
  `0000-template.md`. Gli ADR sono immutabili: una decisione superata si sostituisce
  con un nuovo ADR, non si riscrive. Aggiorna sempre l'indice in `docs/adr/README.md`.
- **Segreti**: mai committare `.env` o chiavi. `.gitignore` è già configurato;
  usa `.env.example` per documentare le variabili senza valori reali.
- **TypeScript** su tutto lo stack.
- **Commit**: stile Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`…).
- **Lingua**: documentazione e commenti in italiano; codice/identificatori in inglese.

## Approccio di sviluppo

Walking skeleton: prima una fetta end-to-end minima ma reale, poi le feature.
Non introdurre strumenti o astrazioni in anticipo rispetto al bisogno.
Sviluppo e test **in locale** finché lo scheletro non gira; il VPS si tocca solo
al passo 5 della roadmap (per non consumare inutilmente il credito Aruba).

## Vincoli da ricordare

- **Web Push su iOS**: funziona solo da iOS 16.4 e solo con PWA aggiunta alla home.
- **HTTPS obbligatorio** per PWA e push (gestito dal reverse proxy in produzione).
- **Credito Aruba**: ha una scadenza temporale; il VPS va creato solo al momento
  del primo deploy.
- **Dataset veicoli**: niente scraping di portali di annunci (ToS + fragilità);
  usare fonti aperte con licenza libera. Molte sono USA-centriche → i modelli
  europei vanno integrati.
- **Disclaimer**: i dati su scadenze/manutenzione sono indicativi e senza
  assunzione di responsabilità (vedi README).

## Riferimenti

- Panoramica, stack e roadmap: `README.md`
- Decisioni e motivazioni: `docs/adr/`
