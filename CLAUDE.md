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

Siamo **dentro il passo 3** della roadmap (scheletro end-to-end in locale).

- `backend/` — NestJS 12, ESM, Vitest. Ancora lo scaffold: espone solo
  `GET /` → `"Hello World!"`.
- `frontend/` — React 19 + Vite 8 con **React Router 8**. Il template
  `create-vite` è stato sostituito dalla struttura delle pagine (ADR 0005):
  tutte le rotte pubbliche e dell'area app esistono come gusci navigabili,
  alimentati da **mock hardcoded** in `src/mocks/` e tipizzati da
  `src/types/index.ts`.

**I due progetti non comunicano ancora**: nessuna chiamata HTTP dal frontend,
nessun CORS né proxy Vite, nessun database collegato. Nell'area app non c'è
autenticazione né route guard: le rotte sono raggiungibili da chiunque. Non
esistono ancora PWA/manifest/Service Worker, push, Docker o CI.

Il prossimo obiettivo è la prima fetta verticale reale: creazione di un veicolo
dalla UI → `POST /api/vehicles` → persistenza su PostgreSQL → lista letta dal DB.

## ⚠️ Decisioni NON ancora finalizzate

Lo stack è chiuso: gli ADR 0001, 0002, 0003, 0005 e 0006 sono **Accettati**
(React+Vite, NestJS, PostgreSQL, Web Push, deploy su VPS con Docker, routing con
React Router, accesso ai dati con TypeORM). Su queste scelte puoi costruire senza
chiedere conferma.

Resta aperta una decisione:

- **Fonte dataset marca-modello**: da scegliere (ADR 0004, stato "Proposto").
  Prima di scrivere codice che dipende da una fonte specifica, proponi le
  alternative e chiedi conferma.

Regola generale: gli ADR con stato **"Proposto"** sono aperti. Prima di scrivere
codice che dipende da una decisione "Proposto", segnalalo, proponi le alternative
e aggiorna l'ADR (o creane uno nuovo) una volta deciso, allineando l'indice in
`docs/adr/README.md`.

## Stack

- Frontend: React + Vite, come PWA installabile — *accettato*
- Backend: Node.js + NestJS, TypeScript — *accettato*
- Database: PostgreSQL — *accettato*
- Routing frontend: React Router, modalità dichiarativa — *accettato* (ADR 0005)
- Styling frontend: CSS globale + CSS Modules, nessuna libreria UI — *accettato* (ADR 0005)
- Accesso ai dati: TypeORM (`@nestjs/typeorm` + `pg`) — *accettato* (ADR 0006)
- Notifiche: Web Push (VAPID) + cron giornaliero — *accettato*
- Deploy: VPS Aruba + Docker Compose, reverse proxy con HTTPS — *accettato*
- CI/CD: GitHub Actions — previsto più avanti

## Struttura e toolchain

Due applicazioni indipendenti nella stessa repo, ciascuna col proprio
`package.json` e `node_modules`. **Non c'è un workspace npm**: se in futuro
serviranno tipi condivisi tra backend e frontend, andrà introdotto.

| | `backend/` | `frontend/` |
|---|---|---|
| Framework | NestJS 12 (Express) | React 19 + Vite 8 |
| Test | Vitest (`*.spec.ts` unit, `*.e2e-spec.ts` e2e, config separate) | non configurati |
| Routing | — | React Router 8, modalità dichiarativa (`src/App.tsx`) |
| Styling | — | CSS globale (`src/index.css`) + CSS Modules per componente |
| Lint | oxlint | ESLint (flat config) |
| Porta in dev | 3000 (`PORT` override) | 5173 |
| Avvio | `npm run start:dev` | `npm run dev` |

Da sapere prima di toccare il codice:

- **Node 24** (LTS), fissato in `.nvmrc`. Sulla macchina dell'utente convivono
  **nvm** (Node 24.20.0, caricato da `.bashrc` solo nelle shell *interattive*) e
  **mise** (che nel config globale pinna un'altra versione ed è l'unico attivo
  nelle shell *non interattive*: script, git hook, task di editor, agenti).
  Prima di eseguire build o test da script, verifica con `node -v` di essere su
  24: il terminale dell'utente e una shell non interattiva possono divergere.
- **Il backend è ESM** (`"type": "module"`, `moduleResolution: nodenext`): gli
  import relativi devono avere estensione **`.js`** anche se puntano a un `.ts`
  (`import { AppModule } from './app.module.js'`). Sbagliarlo compila ma esplode
  a runtime con `ERR_MODULE_NOT_FOUND`.
- **Le rotte non hanno ancora prefisso** `/api` e non c'è `ValidationPipe`
  globale: vanno aggiunti quando si crea il primo endpoint reale.
- **I dati del frontend sono mock.** Tutte le pagine leggono da `src/mocks/`,
  importati staticamente: nessun `fetch`, nessuna persistenza, i form sono
  inerti. Quando arriveranno le API, il punto da sostituire è quello — non
  toccare `src/lib/` né i componenti.
- **Lo stato di una scadenza è derivato, non memorizzato.** `DeadlineStatus`
  (`expired`/`urgent`/`upcoming`/`ok`/`paused`) lo calcola
  `getDeadlineStatus()` da data e flag di pausa. Il database dovrà salvare la
  **data**, mai l'etichetta.
- **`src/types/index.ts` è la bozza del modello di dominio.** Prima di definire
  entità lato backend, leggilo: duplicarlo divergendo sarebbe il primo
  disallineamento del progetto.
- **`BrowserRouter` richiede il fallback su `index.html`** per ogni percorso
  sconosciuto. In dev ci pensa Vite; in produzione dovrà farlo il reverse proxy,
  altrimenti un refresh su `/veicoli/1` dà 404.

## Convenzioni

- **ADR**: ogni decisione architetturale va documentata in `docs/adr/` usando
  `0000-template.md`. Gli ADR sono immutabili: una decisione superata si sostituisce
  con un nuovo ADR, non si riscrive. Aggiorna sempre l'indice in `docs/adr/README.md`.
- **Segreti**: mai committare `.env` o chiavi. Il `.gitignore` di root copre
  `.env*` (con eccezione per `.env.example`), `*.pem`, `*.key` e `vapid*.json`.
  Gli `.env.example` non esistono ancora: vanno creati insieme alla prima
  variabile d'ambiente reale.
- **TypeScript** su tutto lo stack.
- **Commit**: stile Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`…).
- **Lingua**: commenti e codice in inglese; il testo dell'interfaccia utente resta
  in italiano. La documentazione di progetto (README, ADR, questo file) resta in
  italiano. Nel frontend i segnaposto sono marcati con `// MOCK:` (dati finti da
  sostituire) e `// TODO:` (lavoro futuro), così restano ricercabili.

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
- Analisi tecnica file per file: `PROJECT_DOCS.md` — living document **locale,
  non versionato**; va riallineato quando la struttura del codice cambia.

## Debiti noti (piccoli, da sanare quando si passa di lì)

- `backend/package.json` dichiara `"license": "UNLICENSED"`, ma il progetto è MIT.
- `frontend/.gitignore` duplica regole già presenti nel `.gitignore` di root.
- Nessun code splitting per rotta nel frontend: tutte le pagine finiscono in un
  unico bundle (`React.lazy` quando il peso lo giustificherà).
