# 0001 - Scelta dello stack tecnologico

## Stato

Proposto
<!-- L'architettura PWA + backend + Postgres è consolidata; le specifiche
     scelte di framework (React vs Svelte, NestJS vs Node "puro") sono default
     ragionevoli ancora da confermare. -->

## Contesto

L'app deve funzionare su desktop e mobile con un solo codebase, essere
installabile, e supportare notifiche che arrivino anche ad app chiusa. Non è un
progetto a scopo di lucro: gli obiettivi sono l'apprendimento di strumenti usati
in azienda e la costruzione di un portfolio pubblico su GitHub.

Vincoli e forze in gioco:

- Un solo codebase per più dispositivi → PWA.
- Servono account utente, un database di conoscenza condiviso e uno scheduler
  per i promemoria → è necessario un backend, non solo il frontend.
- Le notifiche push richiedono HTTPS e un server che le invii.

Alternative considerate: app native separate (più lavoro, più codebase);
frontend-only senza backend (impossibile per notifiche server-side e dati
condivisi).

## Decisione

- **Frontend**: PWA con React + Vite.
- **Backend**: Node.js con NestJS (struttura opinionata, buona per imparare
  pattern usati in azienda).
- **Database**: PostgreSQL.
- **Linguaggio**: TypeScript su tutto lo stack.

## Conseguenze

- + Un solo codebase installabile su più piattaforme.
- + TypeScript end-to-end: tipi condivisi tra frontend e backend.
- + Stack molto diffuso → ottimo valore per il curriculum e tanta documentazione.
- − Le Web Push su iOS funzionano solo da iOS 16.4 e solo con PWA aggiunta alla
    home (vedi ADR 0003).
- − NestJS ha una curva di apprendimento iniziale rispetto a Node "puro"; è un
    costo accettato perché rientra tra gli obiettivi didattici.
- − Scelte di framework da confermare prima di scendere di stato ad "Accettato".
