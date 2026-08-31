# 0007 - Data fetching nel frontend

## Stato

Accettato

## Contesto

Il backend espone la prima API di dominio (`/api/vehicles`, ADR 0006) e il
frontend ha una struttura di pagine completa (ADR 0005) alimentata da mock
importati staticamente. Collegare i due lati richiede di decidere **come** le
pagine parlano con l'API.

La domanda non è "quale libreria HTTP", ma qualcosa di più profondo. Oggi le
pagine leggono i dati in modo **sincrono**: `const vehicles = mockVehicles`, e
alla riga dopo si può già renderizzare. Con le API reali ogni pagina acquisisce
tre stati che non ha mai avuto — in caricamento, in errore, con i dati — più il
problema di rinfrescare una lista dopo una scrittura. Quel lavoro va fatto in
ogni caso: la scelta è se scriverlo a mano o delegarlo.

Le forze in gioco:

- **La superficie è piccola**: cinque rotte su una sola risorsa, e quattro
  pagine che la leggono. Non c'è ancora nessuna delle condizioni che rendono
  dolorosa la gestione manuale — liste condivise tra schermate lontane,
  invalidazioni incrociate, aggiornamenti ottimistici, paginazione infinita.
- **L'approccio del progetto è il walking skeleton**: prima una fetta reale,
  poi le astrazioni, e mai strumenti in anticipo rispetto al bisogno.
- **L'obiettivo didattico taglia in due direzioni.** TanStack Query è molto
  diffuso in azienda, quindi impararlo ha valore; ma scrivere a mano il ciclo
  richiesta → stato → render è ciò che fa capire *quale problema* quella
  libreria risolve. Adottarla prima di aver sentito il problema significa
  impararne l'API senza impararne la ragione.
- **Nessuna autenticazione**: non c'è ancora token da allegare né sessione da
  invalidare, quindi nessuna delle complicazioni che spingono presto verso un
  layer strutturato.

### Alternative considerate

- **`fetch` nativo con hook scritti a mano.** Nessuna dipendenza, controllo
  completo, e il codice del ciclo di vita è visibile. Costo: gli stati di
  caricamento ed errore vanno scritti in ogni pagina, non c'è cache tra le
  schermate, e ogni navigazione rifà la richiesta.
- **TanStack Query.** Cache, deduplicazione, invalidazione, `refetch` e stati
  derivati già risolti; è lo standard di fatto ed è ciò che si incontra più
  spesso in azienda. Costo: una dipendenza e un modello mentale — query key,
  staleness, invalidazione — introdotti per quattro pagine, cioè prima di aver
  incontrato il problema che giustifica quel modello.
- **SWR.** Più leggero di TanStack Query, stesse obiezioni in scala ridotta.
- **`loader`/`action` di React Router in modalità framework.** Risolverebbe il
  data fetching a livello di rotta, ma ADR 0005 ha scelto la modalità
  dichiarativa: passare alla modalità framework ora sarebbe una riorganizzazione
  del routing, non un'aggiunta.
- **Axios al posto di `fetch`.** Non affronta il problema vero — che è la
  gestione dello stato asincrono, non la sintassi della richiesta — e aggiunge
  una dipendenza per un vantaggio marginale, ora che `fetch` è nativo ovunque.

## Decisione

**`fetch` nativo, incapsulato in un client tipizzato e in hook scritti a mano.**
Nessuna libreria di data fetching.

La struttura che ne deriva:

| Livello | File | Responsabilità |
|---|---|---|
| Trasporto | `src/lib/api.ts` | `fetch` con percorsi relativi, JSON, e traduzione degli errori HTTP in un `ApiError` tipizzato |
| Risorsa | `src/lib/vehicles-api.ts` | Le cinque chiamate su `/api/vehicles`, tipizzate; nessun React |
| Stato | `src/hooks/` | `useApiResource` e i due hook di dominio che ne derivano, con `data` / `loading` / `error` / `reload` |
| Pagine | `src/pages/app/` | Consumano gli hook e rendono i tre stati |

Regole che fanno parte della decisione:

- **Percorsi relativi, sempre** (`/api/vehicles`, mai un host). Il proxy di Vite
  in sviluppo e il reverse proxy in produzione instradano lo stesso percorso:
  non esiste una variabile d'ambiente con la base URL dell'API, e non deve
  nascerne una.
- **`src/lib/` resta senza React.** Il client e le funzioni di risorsa sono
  moduli puri, testabili senza montare componenti; gli hook stanno in
  `src/hooks/`, una cartella nuova che ADR 0005 non prevedeva.
- **Ogni pagina che carica dati rende esplicitamente i tre stati.** Un errore di
  rete non deve mai apparire come una lista vuota: sono due cose diverse e
  l'utente deve poterle distinguere.
- **Dopo una scrittura si rilegge dal server**, non si aggiorna uno stato
  locale. Senza cache non c'è nulla da invalidare, e la fonte di verità resta
  una sola.

## Conseguenze

- + Nessuna dipendenza aggiunta: il frontend resta React, React Router e nulla
    più.
- + Il ciclo richiesta → stato → render è scritto per esteso e leggibile: è la
    cosa che vale la pena capire prima di delegarla.
- + Il punto di sostituzione è isolato. Se un giorno si adotterà TanStack Query,
    cambieranno gli hook in `src/hooks/`; `src/lib/vehicles-api.ts` e le pagine
    resteranno quasi invariati.
- + Il client tipizzato dà un solo punto in cui tradurre gli errori del backend,
    quindi i messaggi di validazione di Nest possono comparire nei form senza
    codice ripetuto.
- − **Nessuna cache**: ogni navigazione verso una pagina rifà la richiesta.
    Passare dalla lista al dettaglio e tornare indietro sono tre chiamate dove
    una libreria ne farebbe una.
- − **Stati di caricamento ed errore ripetuti** in ogni pagina. `useApiResource`
    ne assorbe la logica, ma il markup dei tre stati resta da scrivere ogni
    volta.
- − Nessuna deduplicazione: due componenti che chiedono la stessa risorsa nello
    stesso momento fanno due richieste. Oggi non accade, ma è il primo sintomo
    da sorvegliare.
- − Niente aggiornamento ottimistico: dopo una scrittura si aspetta la risposta
    del server prima di vedere il risultato.
- − La correttezza delle richieste concorrenti è a carico nostro: `useApiResource`
    deve scartare le risposte arrivate in ritardo dopo un cambio di parametri, un
    problema che le librerie risolvono per costruzione.

Il momento per rivedere questa decisione — con un nuovo ADR, non riscrivendo
questo — è quando comparirà la prima delle condizioni che la motivano al
contrario: dati condivisi tra schermate lontane, necessità di aggiornamenti
ottimistici, o più di due pagine che devono invalidarsi a vicenda.
