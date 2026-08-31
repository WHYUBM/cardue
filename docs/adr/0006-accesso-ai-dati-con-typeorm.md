# 0006 - Accesso ai dati con TypeORM

## Stato

Accettato

## Contesto

Il database è deciso da tempo — PostgreSQL, ADR 0001 — ma **come** il backend ci
parla non lo era: nessun client è installato, e `backend/` è ancora lo scaffold
che espone `GET /` → `"Hello World!"`.

La domanda diventa bloccante adesso perché il prossimo obiettivo è la prima
fetta verticale reale (creazione di un veicolo dalla UI → `POST /api/vehicles` →
persistenza → lista letta dal database). È anche una scelta **strutturale e
difficile da invertire**: cambiare livello di accesso ai dati dopo che entità,
migrazioni e servizi esistono significa riscriverli tutti.

Le forze in gioco:

- **Obiettivo didattico**: uno degli scopi espliciti del progetto è imparare
  strumenti che si incontrano in azienda. A parità di qualità tecnica, lo
  strumento più diffuso vale più di quello più elegante.
- **Il modello di dominio esiste già come bozza**, in
  `frontend/src/types/index.ts`. Le entità del backend devono riconciliarsi con
  quel file, non duplicarlo divergendo: sarebbe il primo disallineamento vero
  del progetto.
- **L'app è CRUD.** Veicoli e scadenze, query semplici, nessun carico atteso e
  nessuna interrogazione analitica: non c'è un requisito di prestazioni che
  giustifichi il controllo fine dell'SQL scritto a mano.

### Alternative considerate

- **TypeORM** — è l'ORM con integrazione ufficiale in NestJS
  (`@nestjs/typeorm`): entità a decoratori, repository iniettati via DI,
  migrazioni incluse. È lo stesso vocabolario del resto del framework, e sulle
  codebase Nest che si trovano in azienda è di gran lunga il più frequente. Per
  contro ha una manutenzione storicamente altalenante, un'API che offre più modi
  di fare la stessa cosa (Active Record *e* Data Mapper, query builder *e*
  find options) e una type-safety inferiore ai concorrenti più recenti: molti
  errori di query si scoprono a runtime.
- **Prisma** — la migliore esperienza di sviluppo del gruppo: schema unico come
  fonte di verità, client generato completamente tipizzato, `prisma migrate`
  solido. Il costo è che vive **fuori** dal modello a moduli e DI di Nest, e che
  lo schema è scritto in un linguaggio proprio: diventerebbe una **terza**
  definizione del modello di dominio dopo `src/types/index.ts` e le entità,
  mentre il problema da risolvere qui è averne meno, non di più. Aggiunge
  inoltre un passo di codegen alla pipeline.
- **Drizzle** — leggero, SQL-first, type-safety eccellente e ottimo supporto
  ESM: tecnicamente forse la scelta migliore in astratto. Ma è il meno diffuso
  in azienda e ha meno materiale di riferimento, il che contraddice
  direttamente l'obiettivo didattico.
- **`pg` puro** — zero magia, controllo totale, ottimo per capire davvero cosa
  succede. Ma imporrebbe mapping riga→oggetto e gestione delle migrazioni
  scritti a mano: molto codice ripetitivo per un'app che fa CRUD, e la
  ripetizione è esattamente il posto dove nascono le incoerenze.

## Decisione

**TypeORM**, tramite `@nestjs/typeorm` e il driver `pg`.

La scelta è motivata dall'obiettivo didattico e dalla coerenza con il
framework: è l'opzione che si integra nel modello a moduli di Nest senza
attriti ed è quella con più probabilità di ripresentarsi in un contesto
professionale. La type-safety inferiore a Prisma e Drizzle è un costo accettato
consapevolmente, in cambio di un'unica definizione delle entità e di zero
strumenti fuori dal framework.

Le regole d'uso che fanno parte della decisione:

- **`synchronize: false` sempre**, anche in sviluppo. Lo schema si evolve solo
  con **migrazioni versionate**, dalla prima tabella in poi: `synchronize: true`
  è comodo per due giorni e poi lascia senza storia dello schema proprio quando
  serve deployare.
- **Data Mapper, non Active Record.** I servizi ricevono i repository via
  `@InjectRepository`; le entità restano oggetti di dati senza metodi di
  persistenza. È la modalità che si integra con la DI di Nest ed è l'unica che
  permette di testare un servizio sostituendo il repository.
- **Configurazione del `DataSource` da variabili d'ambiente** (`ConfigModule`),
  mai credenziali nel codice. Nascono con questo ADR i primi `.env` e
  `.env.example` del progetto.
- **Entità registrate per riferimento esplicito alla classe**, non con glob di
  percorsi. Sotto ESM i glob di TypeORM sono una fonte nota di problemi, e
  l'elenco esplicito fallisce a compile time invece che a runtime.
- **Tipo di colonna sempre esplicito** (`@Column('varchar')`, non `@Column()`).
  Vedi la nota su Vitest nelle conseguenze: qui non è uno stile, è una
  condizione perché i test funzionino.
- **Le entità sono la controparte di `frontend/src/types/index.ts`.** In
  particolare la scadenza persiste una **data** (`date`, senza componente
  oraria), mai l'etichetta di stato: `DeadlineStatus` resta derivato al momento
  della lettura, come stabilito in ADR 0005.

## Conseguenze

- + L'accesso ai dati usa lo stesso vocabolario del resto del backend — moduli,
    provider, DI — quindi non c'è un secondo modello mentale da imparare
    accanto a Nest.
- + Un'unica definizione delle entità in TypeScript, senza schema in un
    linguaggio separato né passo di generazione del client.
- + Le migrazioni esistono dalla prima tabella: lo schema ha una storia
    versionata e il deploy sul VPS non richiederà di inventarsela a posteriori.
- + I repository iniettati rendono i servizi testabili con Vitest senza un
    database vero.
- + `emitDecoratorMetadata` e `experimentalDecorators` sono **già** attivi in
    `backend/tsconfig.json`: la build non richiede modifiche per i decoratori
    delle entità.
- + È la scelta con la maggiore probabilità di ricomparire in un contesto
    professionale, che è il criterio dichiarato del progetto.
- − **Vitest non applica `emitDecoratorMetadata`.** La trasformazione passa da
    esbuild, che implementa `experimentalDecorators` ma **non** l'emissione dei
    metadati di tipo: un `@Column()` senza tipo esplicito, che in build
    funziona, nei test fallisce. Da qui la regola sul tipo di colonna esplicito.
    Se un giorno la cosa diventasse ingestibile, l'uscita è aggiungere
    `unplugin-swc` alle due config Vitest.
- − **TypeORM ed ESM convivono, ma la CLI è la parte fragile.** Generare ed
    eseguire migrazioni su un progetto `"type": "module"` richiede un
    `data-source.ts` dedicato e un runner che carichi TypeScript in ESM; va
    verificato e documentato al primo uso, non dato per scontato.
- − Type-safety limitata: le `find options` e il query builder non sono
    verificati dal compilatore quanto lo sarebbero con Prisma o Drizzle. Parte
    degli errori di query si scoprirà solo eseguendo.
- − L'API offre più strade per lo stesso risultato; senza disciplina il codice
    di persistenza diverge di stile. Le regole qui sopra servono a questo.
- − Restano **due** definizioni del modello di dominio da tenere allineate a
    mano, entità e `frontend/src/types/index.ts`, finché non esisterà un
    workspace con tipi condivisi. Il disallineamento è un rischio reale e va
    sorvegliato a ogni modifica del modello.
- − La dipendenza da un progetto con manutenzione storicamente irregolare è un
    rischio di lungo periodo. È mitigato dal fatto che il livello di
    persistenza resta confinato nei repository dei servizi: sostituirlo
    resterebbe costoso, ma circoscritto.
