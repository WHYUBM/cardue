# 0009 - Autenticazione con Keycloak, in modalità BFF

## Stato

Accettato

## Contesto

L'applicazione non ha autenticazione. Tutte le rotte dell'area app sono
raggiungibili da chiunque, i veicoli non hanno un proprietario e la dashboard
saluta un utente finto preso da `mocks/user.ts`. In locale non si nota; al primo
deploy diventa il problema principale, ed è anche un prerequisito delle notifiche
push — non si può mandare un promemoria senza sapere a chi.

I requisiti espressi sono tre, e il terzo è quello che rende la decisione
interessante:

1. **Accesso con Google**, oltre a email e password.
2. **Reset e cambio password**, con quel che comporta (invio di email).
3. **La PWA aperta senza rete, dopo un accesso già fatto, deve mostrare i dati —
   e, con ADR 0010, permettere di scriverli.**

Scrivere a mano il primo e il secondo punto è un progetto a sé: identity
brokering OAuth, invio di email, token di reset a scadenza, protezione dal brute
force. Sono settimane di lavoro su terreno dove gli errori si pagano cari.

Il terzo requisito, però, va in tensione con l'idea di appoggiarsi a un identity
provider esterno: **un flusso OIDC a redirect richiede la rete**. Se l'apertura
dell'app dipende da un redirect verso Keycloak, senza rete non si entra — e se
Keycloak è irraggiungibile mentre il resto funziona, nemmeno.

Il VPS avrà 16 GB di RAM, quindi il consumo di un servizio Java non è più un
argomento contro.

### Alternative considerate

- **Sessione a cookie scritta a mano**, con `scrypt` da `node:crypto` e una
  tabella di sessioni. Zero dipendenze, nessun servizio in più, offline banale.
  Ma niente Google, niente reset password: i requisiti 1 e 2 resterebbero da
  costruire, ed è esattamente il lavoro che non vale la pena rifare.
- **Keycloak come client pubblico**, con i token gestiti nella SPA. È il modo in
  cui Keycloak viene mostrato più spesso. Significa però access token di pochi
  minuti da rinnovare, refresh nel browser, e soprattutto un'apertura dell'app
  che passa da un controllo di validità: il requisito 3 diventa un continuo
  lavorare contro il modello.
- **Keycloak in modalità BFF**, con il backend come client confidenziale. I
  token restano lato server, il browser vede solo un cookie di sessione
  dell'applicazione. È anche l'indirizzo raccomandato dalle linee guida OAuth
  per le applicazioni browser.
- **Provider gestiti** (Auth0, Clerk, Supabase Auth). Nessuna infrastruttura, ma
  i dati degli utenti escono dal VPS e il servizio è una dipendenza esterna su
  una funzione centrale, con piani gratuiti che cambiano nel tempo. Contro il
  criterio di autonomia e longevità dell'ADR 0008.
- **Self-hosted più leggeri** (Zitadel, Ory Kratos). Meno risorse di Keycloak,
  stesso modello a servizio separato. Con 16 GB il vantaggio principale sfuma, e
  Keycloak ha un bacino di documentazione molto più ampio — che sul criterio
  della longevità conta.

## Decisione

**Keycloak come identity provider, integrato in modalità BFF**: il backend
NestJS è il client OIDC confidenziale, non il browser.

```
Accesso (online, raro)
  PWA → redirect a Keycloak (authorization code + PKCE)
      → callback al backend, che scambia il code e conserva i token lato server
      → il backend emette la PROPRIA sessione: cookie httpOnly, SameSite=Lax
      → la PWA salva in IndexedDB un marcatore: chi sei, quando scade

Uso quotidiano (anche offline)
  marcatore locale valido → l'interfaccia parte dai dati locali, subito
      → in sottofondo, quando c'è rete, si riverifica col backend
      → se il backend risponde 401: dati locali cancellati, ritorno al login
```

Le regole che fanno parte della decisione:

- **La PWA non maneggia mai i token OIDC.** Niente access token da rinnovare nel
  browser, niente refresh all'avvio, niente redirect per aprire l'app. È ciò che
  rende compatibili il requisito 1 e il requisito 3.
- **La sessione applicativa è lunga e scorrevole** (settimane, rinnovata a ogni
  richiesta andata a buon fine), indipendente dai tempi di vita interni di
  Keycloak, che sono pensati per applicazioni sempre online.
- **All'avvio l'interfaccia non aspetta il server.** Il marcatore locale decide
  cosa mostrare; la verifica è asincrona. Un `await` su `/api/auth/me` prima del
  primo render annullerebbe tutto il resto.
- **Il filtro per proprietario sta nei servizi, non solo nella guard.** La guard
  dice *chi sei*, non *cosa puoi vedere*: se `findOne(id)` non filtra anche per
  `userId`, un utente autenticato legge il veicolo di un altro conoscendone
  l'identificatore. Tutte e cinque le rotte di `VehiclesModule` vanno riviste.
- **Difesa CSRF con `SameSite=Lax` più API solo JSON.** Un form cross-site non
  può inviare `Content-Type: application/json` senza preflight, quindi la
  combinazione copre i casi realistici. Va rivista se un giorno l'API accettasse
  form URL-encoded.
- **La configurazione del realm è versionata**, esportata in un file nel
  repository: altrimenti il giorno che si ricrea la macchina va ricostruita a
  memoria.

### Punti aperti, da chiudere prima della migrazione

1. **I veicoli già esistenti.** `userId` sarà obbligatorio, e nel database di
   sviluppo ci sono già dei veicoli senza proprietario. La migrazione dovrà
   assegnarli a un utente o cancellarli. *Proposta: assegnarli al primo utente
   registrato, così i dati di prova sopravvivono.*
2. **Durata della sessione contro latenza della revoca.** Più è lunga, più
   l'offline è comodo e più tardi un dispositivo disconnesso smette di mostrare
   i dati locali. *Proposta: 30 giorni scorrevoli, con riverifica a ogni
   richiesta online.*
3. **Registrazione aperta o su invito.** Il README promette contributi degli
   utenti al catalogo, quindi il progetto è multiutente; ma un'app personale
   esposta con registrazione libera invita spam. *Proposta: su invito, che in
   Keycloak è configurazione.*

## Conseguenze

- + Google, reset password, cambio password, MFA e protezione dal brute force
    arrivano già fatti e non vanno né scritti né mantenuti.
- + Il backend **non tocca mai le password**: niente hashing, niente token di
    reset, niente email da inviare. Una superficie di rischio che semplicemente
    non esiste.
- + Il pattern BFF tiene i token fuori dal browser, quindi un XSS non li può
    esfiltrare: il cookie è `httpOnly`.
- + L'apertura offline resta possibile, perché nessun percorso di avvio passa
    per Keycloak.
- + Il modello utente lato applicazione resta minimo: basta l'identificativo
    stabile che Keycloak fornisce.
- − **Un secondo servizio in produzione**, esposto su internet, da aggiornare.
    È il perimetro di sicurezza: un Keycloak fermo a una versione vecchia per
    mesi è un rischio, e i cambi fra major di Keycloak sono stati in passato
    tutt'altro che indolori.
- − **La revoca arriva in ritardo.** Un dispositivo offline continua a mostrare i
    dati locali finché non torna online: è il prezzo diretto del requisito 3.
- − Chi ha il dispositivo sbloccato ha i dati, senza passare da Keycloak. La
    difesa è il blocco schermo, non l'applicazione.
- − Il logout offline può solo cancellare i dati locali e avvisare il server più
    tardi.
- − Lo sviluppo in locale richiede Keycloak acceso, quindi un servizio in più
    nel `docker-compose.yml` e un realm da configurare prima di poter provare
    l'accesso.
- − I test end-to-end dovranno creare sessioni senza passare dal flusso OIDC,
    per non dipendere da un servizio esterno: serve una via di accesso riservata
    ai test, che è essa stessa qualcosa da tenere d'occhio.
