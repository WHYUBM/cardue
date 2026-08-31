# 0011 - PWA e Service Worker scritto a mano

## Stato

Accettato

## Contesto

Il progetto nasce come PWA installabile (ADR 0001), ma finora non lo era:
nessun manifest, nessun Service Worker, nessuna icona. Aprendo l'app senza rete
non succedeva nulla di buono.

È anche il primo dei tre passi decisi con ADR 0009 e 0010, e ne è il
prerequisito: senza un Service Worker che serva il guscio dell'applicazione non
ha senso parlare né di apertura offline dopo l'accesso né di dati locali —
l'app non si aprirebbe affatto.

Le forze in gioco:

- **Il build produce nomi con hash.** Tutto ciò che sta sotto `/assets/` cambia
  nome quando cambia il contenuto. È una proprietà preziosa — un file in cache
  non può essere obsoleto — ma significa che i nomi sono noti solo a build
  concluso.
- **`BrowserRouter` serve lo stesso documento per ogni percorso** (ADR 0005):
  offline, un link profondo come `/veicoli/1` deve poter aprire il guscio già in
  cache.
- **Un Service Worker sbagliato è un problema serio.** Servire contenuto vecchio
  per sempre è il modo classico di sbagliarlo, ed è anche difficile da
  diagnosticare, perché colpisce solo chi ha già visitato il sito.
- **Il criterio è la longevità** (ADR 0008): poche dipendenze, e coerenza con la
  scelta già fatta in ADR 0007 di scrivere a mano il livello di rete.

### Alternative considerate

- **`vite-plugin-pwa`** (Workbox). È lo standard dell'ecosistema Vite: genera il
  worker, la lista di precache con i nomi hashati e il manifest, e gestisce il
  flusso di aggiornamento. Molti casi limite sono già risolti da Workbox, che è
  mantenuto da Google. Costo: due dipendenze di build e un worker generato che
  non si legge — quando qualcosa va storto in produzione si debugga codice che
  nessuno ha scritto.
- **Service Worker scritto a mano.** Nessuna dipendenza, un file leggibile per
  intero, coerente con ADR 0007. Costo: la logica di cache e di aggiornamento è
  responsabilità nostra, e il precache dei bundle hashati non è possibile,
  perché i nomi non sono noti quando si scrive il file.

## Decisione

**Service Worker scritto a mano**, in `frontend/src/sw.ts`, compilato come
secondo punto d'ingresso del build.

La strategia poggia su una sola osservazione: **il documento e gli asset hanno
bisogno di politiche opposte**.

| Richiesta | Strategia | Perché |
|---|---|---|
| Navigazione (documento) | **Network first**, con il guscio in cache come ripiego | Un deploy dev'essere visibile subito a chi è online, senza aspettare un nuovo worker |
| `/assets/*` | **Cache first** | I nomi hanno un hash: una voce in cache non può essere obsoleta |
| `/api/*` | **Mai intercettata** | Vedi sotto |
| Altre origini, metodi diversi da GET | Non intercettate | Non sono nostre, o non sono cacheabili |

Le regole che fanno parte della decisione:

- **Il documento è in cache sotto un'unica chiave, `/`.** Ogni percorso
  dell'applicazione è servito dallo stesso `index.html`, quindi offline un link
  profondo apre il guscio e React Router risolve il resto senza toccare la rete.
- **Il precache si limita al guscio**: `/`, il manifest e le icone. I bundle
  entrano in cache man mano che vengono richiesti, il che basta — l'app va
  aperta almeno una volta per essere installata.
- **L'invalidazione passa dal nome della cache** (`cardue-v1`): una versione
  nuova è una cache nuova, e `activate` cancella le precedenti.
- **Niente `skipWaiting()`.** Un worker nuovo aspetta che il precedente venga
  rilasciato invece di prendere il controllo di una pagina già in esecuzione con
  gli asset vecchi. Gli aggiornamenti si applicano alla successiva chiusura
  completa dell'app; chi è online vede comunque subito il documento aggiornato,
  perché per i documenti la strategia è network first.
- **Il worker viene registrato solo nel build di produzione**, come script
  classico. Il file compilato non ha import, quindi non serve `type: 'module'`
  e funziona anche dove i module worker non sono supportati.

### `/api/` non viene messa in cache, deliberatamente

Sarebbe la via rapida per mostrare gli ultimi dati letti anche offline, ma è
sbagliata per due ragioni. I dati di un utente autenticato non hanno posto in
una cache condivisa da chiunque usi il dispositivo, e non esiste ancora un
momento in cui invalidarla — l'autenticazione arriva con ADR 0009. E soprattutto
i dati offline sono il mestiere di **ADR 0010**, che li mette in IndexedDB con
una riconciliazione vera: una cache HTTP intermedia sarebbe lavoro da buttare.

Finché ADR 0010 non è implementato, l'app si apre offline ma le pagine dei
veicoli mostrano il loro stato di errore con il pulsante «Riprova». È un
comportamento onesto: l'applicazione c'è, i dati no.

## Conseguenze

- + L'app è installabile su telefono e desktop, e si apre senza rete.
- + Nessuna dipendenza aggiunta; il worker è un file di un centinaio di righe
    che si legge tutto, commenti compresi.
- + Gli aggiornamenti sono immediati per chi è online, perché il documento è
    sempre chiesto alla rete per primo.
- + I link profondi funzionano offline.
- + `sw.ts` è verificato dal compilatore, con la libreria `WebWorker` al posto di
    `DOM`, tramite un terzo progetto TypeScript (`tsconfig.sw.json`).
- − **La correttezza della cache è a nostro carico.** Un errore qui si manifesta
    come contenuto vecchio servito a un utente che non sa perché, ed è la classe
    di bug che Workbox esiste per prevenire.
- − Gli aggiornamenti del worker si applicano solo alla chiusura completa
    dell'app. Un avviso «nuova versione disponibile» richiederebbe interfaccia in
    più e `skipWaiting()`, con i rischi che comporta.
- − Il primo caricamento offline dopo l'installazione può mancare di qualche
    asset non ancora richiesto, non essendoci un precache dei bundle.
- − Il worker va ricordato: aggiungendo un import a `sw.ts` il file compilato
    diventerebbe un modulo, e la registrazione come script classico smetterebbe
    di funzionare.
- − Lo sviluppo con `npm run dev` non esercita il worker: va provato con
    `npm run build && npm run preview`, quindi il ciclo di verifica è più lento.
