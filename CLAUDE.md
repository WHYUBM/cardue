# CLAUDE.md — istruzioni di progetto per Claude Code

Questo file dà a Claude Code il contesto stabile del progetto. Leggilo prima di
operare e tienilo aggiornato quando le cose cambiano.

## Cos'è Cardue

PWA per tenere sotto controllo scadenze e manutenzione dell'auto (bollo,
assicurazione, revisione, tagliando) con promemoria automatici prima di ogni
scadenza. Progetto **personale, open source e non profit**.

**Lo scopo è uno solo: che l'applicazione funzioni e non faccia dimenticare una
scadenza.** Non è un esercizio didattico né un portfolio (ADR 0008): non
scegliere uno strumento perché "è quello che si usa in azienda" o perché
insegna qualcosa.

**Il criterio per le scelte tecniche è la longevità**: a parità di qualità,
vince ciò che ha più probabilità di funzionare ancora fra due anni, con un solo
manutentore e lunghi periodi di inattività. In ordine di peso: poche
dipendenze → documentazione solida → reversibilità della scelta → introdurre le
cose quando servono, non prima.

Il codice è **scritto da Claude Code**; il ruolo umano è definire i requisiti,
decidere fra le alternative e verificare. Quando una decisione è strutturale,
proponi le alternative e chiedi conferma invece di sceglierla da solo.

## Stato attuale

Il **passo 3** della roadmap è concluso: lo scheletro cammina end-to-end in locale.

- `backend/` — NestJS 12, ESM, Vitest. `VehiclesModule` espone cinque rotte su
  `/api/vehicles` (CRUD completo), con TypeORM su PostgreSQL in Docker e
  migrazioni versionate. 24 test.
- `frontend/` — React 19 + Vite 8 con **React Router 8**. Il template
  `create-vite` è stato sostituito dalla struttura delle pagine (ADR 0005).
  Le pagine dei **veicoli** leggono e scrivono l'API reale via `fetch`
  (ADR 0007); catalogo, utente e impostazioni restano su **mock hardcoded** in
  `src/mocks/`.

**L'applicazione ha ora un'autenticazione reale.** Le rotte dell'area app sono
protette, i veicoli hanno un proprietario, e Keycloak gestisce accesso, reset
password e (una volta configurato) Google.

**La fetta verticale è chiusa**: si crea un veicolo dal form, finisce in
PostgreSQL, e la lista lo rilegge dal database. Il collegamento passa dal proxy
`/api` di Vite, non da CORS.

**L'applicazione ha un ambiente di sviluppo condiviso** (ADR 0012): una VM
Proxmox in casa, raggiungibile solo dal tailnet all'indirizzo
`cardue-dev.<tailnet>.ts.net`, con l'intero stack in Docker — frontend
compilato e servito da Caddy, backend, due PostgreSQL, Keycloak in modalità di
produzione. È lì che la PWA si prova per quello che è: HTTPS valido, indirizzo
stabile, installazione sul telefono che sopravvive. I comandi stanno in
`docs/deploy.md`.

Restano fuori: i dati offline (ADR 0010), le push e la CI.

Il piano approvato per i prossimi passi, in ordine:

1. ~~**PWA**~~ — fatta (ADR 0011): manifest, icone, Service Worker scritto a
   mano. L'app è installabile e il guscio si apre senza rete.
2. ~~**Autenticazione**~~ — fatta (ADR 0009): Keycloak in modalità BFF,
   sessione a cookie di 30 giorni scorrevoli, marcatore locale per l'apertura
   offline, guard globale e filtro per proprietario nei servizi. La migrazione
   ha portato anche i campi di ADR 0010 (`updatedAt` sulle scadenze,
   `deletedAt` per i tombstone).
3. **Local-first** vero (ADR 0010): IndexedDB come fonte di verità, coda delle
   operazioni, endpoint di sincronizzazione, scadenze come entità sincronizzate.
   Manca ancora anche la generazione degli id lato client, che però non
   richiede migrazioni.

La derivazione delle attività di manutenzione dai chilometri resta più avanti:
dipende da ADR 0004, ancora aperto.

## ⚠️ Decisioni NON ancora finalizzate

Lo stack è chiuso: gli ADR 0001, 0002, 0003, 0005, 0006, 0007, 0008, 0009,
0010, 0011 e 0012 sono **Accettati** (React+Vite, NestJS, PostgreSQL, Web Push, deploy su VPS
con Docker, routing con React Router, accesso ai dati con TypeORM, data fetching
con `fetch` a mano, autenticazione con Keycloak in modalità BFF, architettura
local-first, ambiente di sviluppo su Proxmox via Tailscale). Su queste scelte
puoi costruire senza chiedere conferma.

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
- Data fetching frontend: `fetch` nativo + hook scritti a mano, nessuna libreria — *accettato* (ADR 0007)
- Autenticazione: Keycloak come identity provider, integrato in modalità BFF — *accettato* (ADR 0009)
- Architettura dati client: local-first, IndexedDB come fonte di verità con sincronizzazione — *accettato* (ADR 0010)
- PWA: manifest + Service Worker scritto a mano, nessun plugin — *accettato* (ADR 0011)
- Notifiche: Web Push (VAPID) + cron giornaliero — *accettato*
- Deploy: VPS Aruba + Docker Compose, reverse proxy con HTTPS — *accettato*
- Ambiente di sviluppo condiviso: VM Proxmox + Docker Compose + Caddy, esposto
  solo nel tailnet Tailscale — *accettato* (ADR 0012)
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
- **Non esiste auto-registrazione** (ADR 0009): `/register` è una pagina che
  spiega che l'accesso è su invito, non un form. Invitare qualcuno significa
  creargli l'account nella console di Keycloak: **SMTP non è configurato**,
  quindi non parte alcuna email — e per la stessa ragione «Password
  dimenticata» compare ma non può recapitare nulla.
- **La guard è globale**: ogni rotta è protetta salvo `@Public()`. Ma la guard
  dice *chi sei*, non *cosa è tuo*: il filtro per `userId` sta nei **servizi**,
  e ogni query dei veicoli lo applica. Un `findOne(id)` senza proprietario
  consegnerebbe il veicolo di un altro a chi ne indovina l'identificatore.
- **Nel frontend l'avvio non aspetta il server**: `session-marker.ts` decide
  cosa mostrare subito, `/api/auth/me` conferma dopo. Invertire l'ordine
  romperebbe l'apertura offline.
- **Le cancellazioni sono logiche** (`softRemove`, ADR 0010): TypeORM esclude da
  sé le righe con `deleted_at`. L'indice unico parziale delle scadenze lo tiene
  in conto, altrimenti un bollo cancellato occuperebbe il posto per sempre.
- **I test e2e usano un database dedicato** (`cardue_test`, creato e migrato da
  `test/test-database.ts`) e una transazione annullata per test. Non toccano
  `cardue`: se scrivi asserzioni sulle quantità, questa è la ragione per cui
  reggono.
- **Prefisso `/api` e `ValidationPipe` stanno in `src/app-setup.ts`**, non in
  `main.ts`: la stessa funzione configura l'app di produzione e quella dei test
  e2e. Aggiungendo configurazione globale, mettila lì o i test proveranno
  un'applicazione diversa da quella che gira.
- **Il frontend è mock solo in parte.** Veicoli e scadenze vengono dall'API;
  catalogo marca-modello, utente e impostazioni sono ancora finti e marcati
  `// MOCK:`. Il livello di rete è `src/lib/api.ts` (trasporto) e
  `src/lib/vehicles-api.ts` (risorsa); gli hook stanno in `src/hooks/`.
- **`src/lib/` non contiene React.** È la regola che rende quei moduli testabili
  senza montare componenti: se serve stato o ciclo di vita, il posto è
  `src/hooks/`.
- **Percorsi API sempre relativi** (`/api/vehicles`). Non introdurre una
  variabile d'ambiente con la base URL: il proxy Vite in sviluppo e il reverse
  proxy in produzione instradano lo stesso percorso.
- **Il contratto `PATCH` che sostituisce l'intero insieme delle scadenze è
  destinato a cambiare** (ADR 0010): per la sincronizzazione le scadenze
  diventeranno entità a sé, con id e timestamp propri. Non costruirci sopra
  altra logica senza saperlo.
- **Le scadenze sono di due specie.** I quattro tipi standard (bollo,
  assicurazione, revisione, tagliando) sono unici per veicolo e prendono il nome
  dal tipo; quelle `custom` hanno un `title` obbligatorio e possono ripetersi.
  Sono righe della stessa tabella, distinte da un indice unico **parziale**.
  Per mostrare il nome usa sempre `deadlineName()` di `lib/format.ts`.
- **Aggiungere un valore a un enum PostgreSQL richiede di ricreare il tipo**:
  `ALTER TYPE ... ADD VALUE` non è utilizzabile nella stessa transazione, e
  TypeORM esegue le migrazioni in transazione. Vedi
  `1788181878395-CustomDeadlines.ts` per il modello da seguire.
- **Lo stato di una scadenza è derivato, non memorizzato.** `DeadlineStatus`
  (`expired`/`urgent`/`upcoming`/`ok`/`paused`) lo calcola
  `getDeadlineStatus()` da data e flag di pausa. Il database dovrà salvare la
  **data**, mai l'etichetta.
- **`src/types/index.ts` e `backend/src/vehicles/entities/` sono lo stesso
  modello scritto due volte**, allineati solo a mano: non c'è workspace npm né
  pacchetto condiviso. Ogni modifica al modello va fatta su entrambi i lati, e
  niente segnala la dimenticanza.
- **I km di un veicolo sono sempre presenti**: assenti alla creazione
  significa *veicolo nuovo*, quindi 0, non "non lo sappiamo". Il form non deve
  mai inviare `mileageKm: 0` per un campo vuoto — deve ometterlo.
- **`BrowserRouter` richiede il fallback su `index.html`** per ogni percorso
  sconosciuto. In dev ci pensa Vite; in produzione dovrà farlo il reverse proxy,
  altrimenti un refresh su `/veicoli/1` dà 404. Offline lo fa il Service Worker,
  che serve il guscio in cache sotto la chiave `/`.
- **Il Service Worker non gira in `npm run dev`**, solo nel build di produzione:
  per provarlo servono `npm run build && npm run preview`. E non deve mai
  intercettare `/api/` — i dati offline sono compito di ADR 0010, non di una
  cache HTTP.
- **Il deploy è un override, non un file a sé**: `docker compose -f
  docker-compose.yml -f docker-compose.deploy.yml`. Il secondo cambia solo ciò
  che sul server è diverso, e usa il tag `!reset` per togliere le porte
  pubblicate dal primo — un `ports:` normale si sarebbe *aggiunto*, non
  sostituito.
- **Ci sono due `.env`, con ruoli diversi.** Quello di root serve a Compose
  *mentre interpreta* i file (nome pubblico, indirizzo Tailscale, password);
  `backend/.env` è ciò che finisce *dentro* i container. Aggiungendo una
  variabile, il posto giusto dipende da chi deve leggerla.
- **Il nome di host del server compare in quattro punti** — `PUBLIC_HOSTNAME`,
  `KEYCLOAK_ISSUER_URL`, `APP_BASE_URL` e il certificato — e devono coincidere
  esattamente. È la causa prima di un login che gira a vuoto.
- **Sul server il backend chiama Keycloak al suo indirizzo pubblico in HTTPS**,
  e ci riesce perché quel nome è un alias di rete del container Caddy. Non
  sostituirlo con `http://keycloak:8080` per comodità: `oidc.service.ts` non
  verifica la firma dell'id token e si appoggia proprio a quel certificato per
  sapere chi ha risposto.

## Convenzioni

- **ADR**: ogni decisione architetturale va documentata in `docs/adr/` usando
  `0000-template.md`. Gli ADR sono immutabili: una decisione superata si sostituisce
  con un nuovo ADR, non si riscrive. Aggiorna sempre l'indice in `docs/adr/README.md`.
  ⚠️ Gli ADR 0001-0007 motivano alcune scelte con l'obiettivo didattico, ormai
  decaduto (ADR 0008): sono contesto storico, non criteri ancora validi.
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
Sviluppo e test **in locale**; la VM Proxmox (ADR 0012) è dove l'applicazione
si usa e si prova sul telefono, non dove la si scrive. Il **VPS Aruba** resta
intoccato finché non serve servire qualcuno fuori dal tailnet: il suo credito
ha una scadenza temporale, e accenderlo prima significa consumarlo a vuoto.

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
- Deploy sull'ambiente di sviluppo condiviso: `docs/deploy.md`
- Analisi tecnica file per file: `PROJECT_DOCS.md` — living document **locale,
  non versionato**; va riallineato quando la struttura del codice cambia.

## Debiti noti (piccoli, da sanare quando si passa di lì)

- `backend/package.json` dichiara `"license": "UNLICENSED"`, ma il progetto è MIT.
- `frontend/.gitignore` duplica regole già presenti nel `.gitignore` di root.
- In `docker-compose.yml` il servizio `keycloak-config` dichiara
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `environment` con default vuoto:
  siccome `environment` ha la precedenza su `env_file`, i valori messi in
  `backend/.env` vengono sovrascritti dalla stringa vuota e Google non si
  collega. Vanno tolti da lì (come già fatto per `CARDUE_DEV_USER_*`) il giorno
  in cui si configura Google.
- Nessun code splitting per rotta nel frontend: tutte le pagine finiscono in un
  unico bundle (`React.lazy` quando il peso lo giustificherà).
