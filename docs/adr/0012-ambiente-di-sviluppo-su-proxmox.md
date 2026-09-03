# 0012 - Ambiente di sviluppo condiviso su Proxmox, esposto via Tailscale

## Stato

Accettato

## Contesto

Lo scheletro cammina in locale, ma tre cose non si possono provare sul
portatile.

La prima è la **PWA**. Service Worker, installazione sulla home e Web Push
richiedono un contesto sicuro: `localhost` lo è per convenzione, un indirizzo
di rete locale no. Finora l'unico modo di provare l'app su un telefono è stato
un tunnel temporaneo — ne restano le tracce in `vite.config.ts`, fra gli
`allowedHosts` di `preview`. È un espediente: URL diverso a ogni avvio, quindi
niente installazione che sopravviva, e niente push.

La seconda è lo **stack containerizzato**. Oggi backend e frontend girano
sull'host e solo database e Keycloak stanno in Docker. Quanto di ADR 0002 sia
davvero vero — le migrazioni che partono da sole, `configure.sh` che porta
Keycloak nello stato giusto a ogni avvio — non è mai stato eseguito da nessuna
parte.

La terza è **usare l'applicazione**. Un'app che ricorda le scadenze dell'auto
si valuta tenendola sul telefono per settimane, non aprendola per dieci minuti
dopo una modifica.

ADR 0002 prevede per tutto questo un VPS Aruba, ma il credito Aruba ha una
scadenza temporale: accenderlo adesso significa consumarlo mentre l'app non è
ancora finita. Nel frattempo è disponibile un piccolo server Proxmox in casa,
già dentro un tailnet.

Alternative considerate:

- **Anticipare il VPS Aruba.** Risolve tutto subito, ma inizia a bruciare il
  credito nel periodo in cui serve meno, e obbliga a preoccuparsi da subito di
  una macchina esposta su internet.
- **Continuare con i tunnel temporanei.** Costo zero, ma l'indirizzo cambia a
  ogni sessione: l'installazione della PWA non sopravvive, e le push nemmeno.
- **Esporre il server di casa su internet**, con port forwarding e un dominio.
  Dà un indirizzo stabile, ma apre la rete domestica e aggiunge un dominio da
  rinnovare e un certificato da gestire, per un ambiente che non deve servire
  nessun pubblico.

## Decisione

Una **VM su Proxmox** ospita l'intero stack in Docker Compose, raggiungibile
solo attraverso **Tailscale**, all'indirizzo `cardue-dev.<tailnet>.ts.net`. È
un **ambiente di sviluppo condiviso**, non una produzione: ADR 0002 resta in
piedi come ipotesi per il giorno in cui l'applicazione dovrà servire qualcuno
che non sia nel tailnet.

Le scelte che ne discendono, e perché:

**VM, non container LXC.** Docker dentro LXC funziona ma richiede nesting e
`keyctl`, e si rompe negli aggiornamenti del kernel. Con un solo manutentore e
lunghi periodi di inattività, la macchina virtuale è la scelta che si spiega da
sola quando ci si torna dopo sei mesi (ADR 0008).

**Il certificato viene da Tailscale, non da Let's Encrypt via ACME.** Caddy lo
chiede a `tailscaled` attraverso il socket montato nel container. È un
certificato pubblicamente valido, rinnovato senza cron, e soprattutto ottenuto
**senza che la macchina sia mai raggiungibile da internet**: nessuna porta
aperta sul router, nessuna sfida ACME da superare.

**Un'unica origine per tutto.** Caddy serve il frontend compilato, inoltra
`/api/*` al backend e `/idp/*` a Keycloak. È la stessa forma che in sviluppo ha
il proxy di Vite, ed è ciò che permette al frontend di continuare a usare
percorsi relativi senza variabili d'ambiente (ADR 0007).

**Keycloak sotto `/idp`, non sulla radice.** Il prefisso lo tiene fuori dallo
spazio dei percorsi dell'applicazione — `/realms`, `/admin`, `/js` restano
liberi — e lo distingue a colpo d'occhio da `/api/auth`, che è la sessione che
l'applicazione rilascia, non l'identity provider dietro di essa.

**Il backend chiama Keycloak al suo indirizzo pubblico, in HTTPS.**
`oidc.service.ts` non verifica la firma dell'id token: si appoggia
esplicitamente al certificato del token endpoint per sapere chi ha risposto.
Farlo parlare in HTTP con il container accanto avrebbe smontato quel
ragionamento senza dirlo. Il nome pubblico è quindi un alias di rete del
container Caddy: dentro Docker risolve lì, con il certificato giusto, senza
uscire dalla macchina.

**Le migrazioni sono un container che parte ed esce**, non un passo dentro
l'avvio dell'applicazione. Un backend che migra all'avvio migra a ogni riavvio,
e un fallimento assomiglia a un crash invece che a una migrazione fallita.

**Keycloak ha un proprio PostgreSQL.** La modalità di produzione non accetta il
database H2 usato in sviluppo, e mescolarlo con quello dell'applicazione
avrebbe reso il `pg_dump` dell'una un dump anche dell'altra.

## Conseguenze

- + La PWA si prova per quello che è: indirizzo stabile, installazione che
    resta, Service Worker attivo, e la strada aperta alle push (ADR 0003).
- + L'applicazione diventa usabile davvero, tutti i giorni, mentre la si
    scrive: è l'unico modo di scoprire se fa il suo mestiere.
- + Quanto ADR 0002 dava per scontato viene finalmente eseguito — Dockerfile,
    migrazioni automatiche, `configure.sh` su una macchina che non è quella di
    sviluppo — e i problemi emergono ora, non il giorno del primo deploy vero.
- + Il credito Aruba resta intatto fino a quando serve.
- + Nessuna porta aperta verso internet: la superficie esposta è il tailnet.
- − Una macchina in più da aggiornare, e un `docker compose` in più di cui
    ricordarsi.
- − Chi non è nel tailnet non può usare l'applicazione. Per ora è la scelta
    giusta; il giorno in cui servirà un pubblico, servirà ADR 0002.
- − Le immagini si costruiscono sul server: ciò che gira non è bit per bit ciò
    che è stato provato altrove. Si sana con la CI, quando arriverà.
- − Il nome dell'host compare in quattro punti della configurazione e vanno
    tenuti allineati a mano. Cambiarlo non è gratis.
- − Il repository ha ora due file `.env` di esempio con ruoli diversi (uno per
    l'interpolazione di Compose, uno per l'interno dei container): una
    distinzione reale, ma da spiegare.
