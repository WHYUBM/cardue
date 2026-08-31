# 0005 - Information architecture e routing del frontend

## Stato

Accettato

## Contesto

Il frontend era ancora la landing page del template `create-vite`: una sola
schermata, nessuna navigazione. Prima di costruire la fetta verticale end-to-end
serviva sapere **quali pagine esistono, come si chiamano e come si annidano**,
perché è la struttura che poi determina la forma degli endpoint del backend e
del modello dati.

Le forze in gioco:

- L'app ha due aree nettamente distinte: una **pubblica** (presentazione,
  disclaimer, accesso) e una **riservata** all'utente con i propri veicoli.
- Il disclaimer è un requisito trasversale: deve restare raggiungibile ovunque
  e comparire in evidenza dove l'utente inserisce o legge dati indicativi.
- L'autenticazione non esiste ancora: le rotte dell'area app devono essere
  navigabili adesso, ma predisposte per essere protette dopo.

### Alternative considerate per il router

- **React Router in modalità dichiarativa** (`<BrowserRouter>` + `<Routes>`):
  standard di fatto nell'ecosistema React, ottima documentazione, nessuna
  configurazione di build. È il modo in cui React Router viene insegnato e usato
  nella maggior parte dei progetti.
- **React Router in modalità framework** (loader, action, plugin Vite): porta
  data fetching e code splitting integrati, ma impone una struttura di file e un
  modello di caricamento dati che oggi non serve — non ci sono ancora API da
  chiamare. Sarebbe un'astrazione anticipata.
- **TanStack Router**: rotte type-safe, molto interessante, ma meno diffuso in
  azienda e con una curva di apprendimento maggiore; contraddice l'obiettivo
  didattico di imparare gli strumenti più comuni.
- **Nessun router**, con rendering condizionale a stato: costa poco all'inizio
  ma rompe URL condivisibili, cronologia e tasto "indietro" — inaccettabile per
  una PWA.

### Alternative considerate per lo styling

CSS semplice, CSS Modules, CSS-in-JS o un framework di utility. Le librerie di
componenti e Tailwind sono state escluse: sono decisioni con effetti profondi
sull'aspetto e sul vendor lock-in, da prendere quando l'interfaccia sarà più
matura.

## Decisione

**Routing con React Router in modalità dichiarativa.** L'albero delle rotte è
definito in un unico file (`src/App.tsx`) e articolato su due layout annidati:

| Rotta                    | Pagina             | Layout         |
|--------------------------|--------------------|----------------|
| `/`                      | Landing            | `PublicLayout` |
| `/login`                 | Login              | `PublicLayout` |
| `/register`              | Registrazione      | `PublicLayout` |
| `/disclaimer`            | Disclaimer         | `PublicLayout` |
| `/info`                  | Info progetto      | `PublicLayout` |
| `/dashboard`             | Dashboard          | `AppLayout`    |
| `/veicoli`               | I miei veicoli     | `AppLayout`    |
| `/veicoli/nuovo`         | Form veicolo       | `AppLayout`    |
| `/veicoli/:id`           | Dettaglio veicolo  | `AppLayout`    |
| `/veicoli/:id/modifica`  | Form veicolo       | `AppLayout`    |
| `/catalogo`              | Catalogo           | `AppLayout`    |
| `/catalogo/richiedi`     | Richiedi veicolo   | `AppLayout`    |
| `/catalogo/contribuisci` | Contribuisci info  | `AppLayout`    |
| `/impostazioni`          | Impostazioni       | `AppLayout`    |
| `*`                      | Pagina non trovata | `AppLayout`    |

Scelte di information architecture che ne derivano:

- **I percorsi sono in italiano**, coerenti con la lingua dell'interfaccia. Gli
  identificatori nel codice restano in inglese, come da convenzione di progetto.
- **Creazione e modifica di un veicolo usano lo stesso componente**
  (`VehicleForm`), distinto da una prop `mode`: i campi sono gli stessi e la
  duplicazione sarebbe solo un costo di manutenzione.
- **La gestione di una singola scadenza è un modal dentro `/veicoli/:id`**, non
  una rotta a sé. È un'operazione breve su un oggetto già visibile a schermo:
  una rotta dedicata farebbe perdere il contesto del veicolo senza dare in
  cambio un URL che valga la pena condividere.
- **L'area app non ha ancora un route guard.** Tutte le rotte sono raggiungibili
  perché non esiste una sessione da controllare; il punto in cui inserire il
  controllo è già isolato, ed è `AppLayout`.
- **Lo stato dell'urgenza di una scadenza è derivato, non memorizzato.**
  `getDeadlineStatus` lo calcola dalla data e dall'eventuale pausa: il backend
  dovrà salvare la data, non l'etichetta.

**Styling con CSS semplice**: un foglio globale (`index.css`) con i design token
— comprese le variabili dei colori di urgenza — e **CSS Modules** accanto a ogni
componente per gli stili locali. Nessuna libreria di UI, nessun framework di
utility, nessuna libreria di state management: lo stato è locale ai componenti.

I dati mostrati sono **mock hardcoded** tipizzati (`src/mocks/`), con i tipi di
dominio condivisi in `src/types/index.ts`. Nessuna chiamata HTTP: la scelta
dell'accesso ai dati lato backend è ancora aperta e questo lavoro non la
pregiudica.

## Conseguenze

- + Gli URL diventano condivisibili e la cronologia del browser funziona: un
    requisito di fatto per una PWA installabile.
- + La struttura delle pagine è visibile e navigabile prima di scrivere una riga
    di backend: rende concreto cosa dovranno esporre le API.
- + React Router dichiarativo è la scelta più comune in azienda ed è quindi
    quella che risponde meglio all'obiettivo didattico del progetto.
- + I tipi condivisi in `src/types/` fanno da bozza del modello di dominio e
    potranno essere allineati (o condivisi) con il backend.
- + CSS Modules elimina le collisioni di nomi senza aggiungere dipendenze né
    passaggi di build.
- − Senza `loader`/`action` il data fetching andrà scritto a mano nei componenti
    quando arriveranno le API; se in futuro servisse, passare alla modalità
    framework richiederà una riorganizzazione.
- − Tutte le pagine finiscono in un unico bundle: manca il code splitting per
    rotta, da introdurre con `React.lazy` quando il peso lo giustificherà.
- − I mock dovranno essere sostituiti da chiamate reali; il rischio è che le
    pagine si adagino sulla forma dei dati finti anziché su quella delle API.
- − Servirà un `ProtectedRoute` (o un `loader` di sessione) sopra `AppLayout`
    quando esisterà l'autenticazione.
- − Senza un router type-safe, i percorsi restano stringhe: un refuso in un
    `<Link>` si scopre solo navigando.
