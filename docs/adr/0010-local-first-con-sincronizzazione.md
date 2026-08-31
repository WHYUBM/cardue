# 0010 - Local-first con sincronizzazione

## Stato

Accettato

## Contesto

L'applicazione è una PWA installabile: una volta sulla schermata home di un
telefono, l'aspettativa dell'utente è che si apra e funzioni, non che mostri un
errore perché il treno è in galleria. Oggi non è così — le pagine dei veicoli
leggono dall'API a ogni navigazione (ADR 0007) e senza rete mostrano un errore
con pulsante «Riprova».

Un vincolo della piattaforma delimita però quanto lontano si possa arrivare.
**Una notifica push viene inviata da un server**: il backend controlla le
scadenze, chiama il push service del browser, quello sveglia il Service Worker.
Non esiste, sul web, un modo affidabile di programmare una notifica locale fra
tre settimane — la proposta delle Notification Triggers è rimasta sperimentale e
non è mai arrivata a uno stato utilizzabile.

Quindi un'applicazione senza backend perderebbe i promemoria, cioè la ragione
per cui esiste. Il server non può sparire: la domanda è se debba essere
**indispensabile per usare l'app** o solo per le funzioni che solo lui può
svolgere.

Le forze in gioco:

- **I dati sono pochi e l'utente è uno.** Qualche veicolo, una manciata di
  scadenze. Due dispositivi che modificano lo stesso record nello stesso minuto
  sono un caso di scuola, non lo scenario normale. Questo rende praticabile una
  soluzione che in altri contesti sarebbe temeraria.
- **Il server resta necessario come backup.** I dati solo sul dispositivo
  significano che perdere il telefono, o disinstallare l'app, perde tutto. Per
  scadenze seguite per anni è inaccettabile, e lo storage del browser non è un
  posto dove considerare i dati al sicuro.
- **Lo stato di una scadenza è già derivato dalla data** (ADR 0005): l'urgenza
  si ricalcola sul dispositivo senza chiedere niente a nessuno. È la premessa
  che rende il funzionamento offline naturale invece che forzato.
- **Il criterio è la longevità** (ADR 0008): poche dipendenze, e non costruire
  macchinari prima che servano.

### Alternative considerate

- **Solo cache di lettura.** Il Service Worker conserva il guscio dell'app e gli
  ultimi dati letti; le scritture falliscono con un messaggio chiaro. Si ottiene
  quasi gratis insieme alla PWA ed è probabilmente la maggior parte del valore
  percepito. Non risolve però la scrittura offline, che è il caso in cui
  l'utente ha in mano il libretto e vuole inserire una data.
- **Local-first con sincronizzazione.** IndexedDB è la fonte di verità per
  l'interfaccia; il server è un pari con cui riconciliare quando c'è rete.
  Scritture offline, riconciliazione dopo.
- **Nessun backend.** Perde promemoria, backup e multi-dispositivo: scartata per
  il vincolo descritto sopra.
- **Una libreria di sincronizzazione** — RxDB, PouchDB con CouchDB, ElectricSQL,
  o CRDT con Yjs/Automerge. Risolverebbero i conflitti in modo molto più solido
  di quanto faremo noi. Il costo è però una dipendenza strutturale e pesante,
  che in alcuni casi impone il database (CouchDB) o un servizio in più. I CRDT,
  in particolare, risolvono l'editing concorrente fra utenti diversi: un
  problema che questa applicazione non ha. Scartate per il criterio dell'ADR
  0008, con l'annotazione che il giorno in cui la riconciliazione a mano
  diventasse una fonte di bug ricorrenti, questa è la direzione in cui guardare.

## Decisione

**Local-first con sincronizzazione**, adottato per gradi: la cache di lettura
arriva con la PWA, il motore di sincronizzazione dopo.

L'architettura che ne deriva:

| Livello | Ruolo |
|---|---|
| **IndexedDB** | Fonte di verità per l'interfaccia. Le pagine leggono e scrivono qui, sempre, anche online. |
| **Coda delle operazioni** | Le scritture non ancora arrivate al server, conservate anch'esse su IndexedDB. |
| **Sincronizzazione** | Push della coda e pull di ciò che è cambiato, quando c'è rete. |
| **Server** | Copia autoritativa, backup e — unico a poterlo fare — invio dei promemoria. |

Le regole che fanno parte della decisione:

- **Gli identificatori li genera il client.** Sono già UUID, ma oggi li produce
  PostgreSQL con `gen_random_uuid()`. Offline un record deve esistere prima di
  raggiungere il server, quindi l'id nasce sul dispositivo.
- **Ogni entità sincronizzata porta `updatedAt`.** Esiste su `Vehicle`, va
  aggiunto a `Deadline`.
- **Le cancellazioni sono logiche.** Un `deletedAt` invece della rimozione
  fisica: «il record non c'è» e «il record è stato cancellato» sono due cose
  diverse quando due dispositivi si confrontano, e senza tombstone una
  cancellazione fatta su un dispositivo verrebbe annullata dall'altro.
- **Il cursore di sincronizzazione lo assegna il server.** L'orologio di un
  dispositivo può essere sbagliato, e un telefono con la data avanti si
  «mangerebbe» i record. Il timestamp del client serve semmai a risolvere i
  conflitti, mai a decidere cosa scaricare.
- **Conflitti risolti con last-write-wins per record.** Con un solo utente è una
  scelta onesta, ma va detto cosa comporta: una modifica può essere sovrascritta
  **in silenzio**, senza che nessuno se ne accorga.
- **Le scadenze diventano entità sincronizzate a sé.** È il cambiamento di
  contratto più importante: oggi `PATCH /api/vehicles/:id` sostituisce l'intero
  insieme delle scadenze (ADR 0006). Va benissimo per un form che salva tutto
  insieme, è pessimo per la sincronizzazione, perché rende ogni modifica a una
  scadenza una scrittura sull'intero veicolo e moltiplica i conflitti.

### Cosa anticipare subito

Le modifiche allo **schema** vanno fatte insieme alla migrazione
dell'autenticazione (ADR 0009), non dopo: `updatedAt` sulle scadenze,
`deletedAt` per i tombstone, id generati dal client. Sono poche righe in un file
che scriveremo comunque, mentre farle dopo costa una migrazione a sé e un
backfill di tutte le righe esistenti.

Il **macchinario** — coda, endpoint di sincronizzazione, riconciliazione —
aspetta invece il passo 3, secondo l'approccio del progetto: non costruire prima
di sapere che serve.

## Conseguenze

- + L'app installata si apre e funziona senza rete, che è l'aspettativa di
    chiunque abbia un'icona sulla schermata home.
- + Le scritture offline funzionano: la data si inserisce con il libretto in
    mano, non quando si torna sotto copertura.
- + L'interfaccia diventa istantanea anche online: nessuna attesa di rete fra
    l'azione e il risultato, perché la fonte di verità è locale.
- + Il server resta come backup e come unico mittente dei promemoria: si perde
    la dipendenza, non la funzione.
- + Lo stato derivato delle scadenze funziona già offline senza modifiche.
- − **Una scadenza creata offline non genera promemoria finché non è
    sincronizzata.** È inevitabile — le push partono dal server — ma è una cosa
    che l'interfaccia deve dire, non nascondere.
- − **Last-write-wins sovrascrive in silenzio.** Nessun avviso, nessuna
    fusione: la scrittura più recente vince e l'altra sparisce.
- − Le cancellazioni logiche lasciano righe morte nel database, che prima o poi
    vorranno una pulizia.
- − Il modello dati si complica: timestamp, tombstone e cursori sono campi che
    esistono solo per la sincronizzazione e vanno mantenuti corretti a ogni
    scrittura.
- − **Su iOS la Background Sync API non esiste**: la coda si svuota alla
    riapertura dell'app, non da sola in sottofondo. Cambia cosa si può
    promettere all'utente.
- − I dati sul dispositivo sono leggibili da chi ha il dispositivo sbloccato. È
    vero per qualunque applicazione che funzioni offline, e la difesa è il blocco
    schermo, non l'app — ma va saputo.
- − La superficie da testare cresce parecchio, e i bug di sincronizzazione sono
    fra i più sgradevoli da riprodurre. Il frontend, che oggi non ha test, ne
    avrà bisogno prima di questo passo.
