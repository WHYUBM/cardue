# Deploy sull'ambiente di sviluppo condiviso

Come portare Cardue sulla VM Proxmox e come rimetterci mano dopo. La decisione
e le sue ragioni stanno in [ADR 0012](adr/0012-ambiente-di-sviluppo-su-proxmox.md);
qui ci sono solo i comandi.

Questo **non è un ambiente di produzione**: è la stessa applicazione dello
sviluppo locale, messa dove un telefono può raggiungerla in HTTPS. Se un giorno
si va su un VPS pubblico, i punti da rivedere sono elencati in fondo.

## Cosa gira dove

```
telefono / portatile (nel tailnet)
        │  https://cardue-dev.<tailnet>.ts.net
        ▼
   100.x.y.z:443 ── web (Caddy + frontend compilato)
                      ├── /api/*  →  backend:3000      (NestJS)
                      ├── /idp/*  →  keycloak:8080     (identity provider)
                      └── /*      →  /srv              (la PWA)

                    backend  →  db:5432               (dati dell'app)
                    keycloak →  keycloak-db:5432      (realm e utenti)
                    migrate  →  db:5432               (una volta, poi esce)
```

Nessuna porta è pubblicata sulla LAN di casa: la 443 è legata **solo**
all'indirizzo Tailscale. Il resto parla su una rete Docker privata.

## 1. La macchina virtuale

Su Proxmox, una VM (non un container LXC: Docker dentro LXC richiede nesting e
si rompe agli aggiornamenti, e qui la scelta noiosa vale più della densità).

- Debian 13 o Ubuntu Server 24.04, installazione minima, OpenSSH incluso
- 2 vCPU, 4 GB di RAM, 32 GB di disco — Keycloak da solo ne prende ~700 MB
- **hostname `cardue-dev`**: diventa il nome nel tailnet, e quindi l'indirizzo
  dell'applicazione. Cambiarlo dopo significa rifare i redirect URI
- IP statico fuori dal pool DHCP del router
- `qemu-guest-agent` installato e abilitato: senza, gli snapshot di Proxmox
  sono fatti a caldo senza mettere in pausa il filesystem

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y qemu-guest-agent git
sudo systemctl enable --now qemu-guest-agent
```

Sul lato Proxmox, nelle opzioni della VM, va spuntato **QEMU Guest Agent**.

## 2. Tailscale

```sh
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh
tailscale ip -4          # annota l'indirizzo 100.x.y.z: serve fra poco
```

`--ssh` fa gestire l'accesso SSH a Tailscale: si entra da qualsiasi macchina
del tailnet senza distribuire chiavi.

Nella console di amministrazione del tailnet servono due impostazioni, una
volta sola per tutto il tailnet:

- **MagicDNS** attivo
- **HTTPS Certificates** attivo (*Settings → Features*)

Senza la seconda, Caddy non ottiene il certificato e l'applicazione non parte
in HTTPS — cioè non parte affatto, perché senza HTTPS non c'è Service Worker.

## 3. Docker

```sh
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
docker compose version   # deve essere 2.24 o superiore
```

La versione minima non è pignoleria: `docker-compose.deploy.yml` usa il tag
`!reset` per togliere le porte pubblicate dal file di sviluppo, e prima di
quella versione Compose non lo conosce.

## 4. Il repository e le variabili

```sh
git clone <url-del-repo> ~/cardue
cd ~/cardue

cp .env.example .env
cp backend/.env.deploy.example backend/.env
```

Due file, con due ruoli diversi:

| file | chi lo legge | cosa contiene |
|---|---|---|
| `.env` (root) | Docker Compose, mentre interpreta i file | nome pubblico, indirizzo Tailscale, password del database di Keycloak, credenziali dell'amministratore |
| `backend/.env` | i container di backend e `keycloak-config` | database dell'app, client OIDC, URL pubblici |

Da riempire, in ordine:

```sh
# .env
PUBLIC_HOSTNAME=cardue-dev.<tailnet>.ts.net    # il nome esatto: `tailscale status`
TAILSCALE_IP=100.x.y.z                         # `tailscale ip -4`
KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -hex 24)
KEYCLOAK_DB_PASSWORD=$(openssl rand -hex 24)

# backend/.env
POSTGRES_PASSWORD=$(openssl rand -hex 24)
KEYCLOAK_CLIENT_SECRET=$(openssl rand -hex 32)
KEYCLOAK_ISSUER_URL=https://cardue-dev.<tailnet>.ts.net/idp/realms/cardue
APP_BASE_URL=https://cardue-dev.<tailnet>.ts.net
CARDUE_DEV_USER_PASSWORD=...                   # l'account con cui entrerai
```

Il nome di host compare in quattro punti — `PUBLIC_HOSTNAME`,
`KEYCLOAK_ISSUER_URL`, `APP_BASE_URL` e il certificato — e devono coincidere
tutti. Un `https://` di troppo in `PUBLIC_HOSTNAME`, o una barra finale in
`APP_BASE_URL`, si manifestano come un login che gira a vuoto.

`POSTGRES_PASSWORD` va scelta **prima del primo avvio**: cambiarla dopo non
tocca il volume già inizializzato, e il backend smette di connettersi.

## 5. Il deploy

```sh
./deploy/deploy.sh
```

Fa tre cose: `git pull --ff-only`, ricostruisce le immagini, e avvia lo stack.
Le migrazioni e la configurazione di Keycloak non sono passi separati da
ricordare — sono container che partono, fanno il loro lavoro ed escono:
`migrate` prima che il backend si avvii, `keycloak-config` appena Keycloak
risponde al proprio healthcheck.

Il primo avvio è lento (Keycloak costruisce la propria configurazione e crea lo
schema): due o tre minuti. Da lì in poi sono venti secondi.

Poi, da un dispositivo nel tailnet:

- l'applicazione su `https://cardue-dev.<tailnet>.ts.net`
- la console di Keycloak su `https://cardue-dev.<tailnet>.ts.net/idp/admin`,
  con le credenziali di `KEYCLOAK_ADMIN_*`

## 6. Invitare qualcuno

Non c'è auto-registrazione (ADR 0009) e **SMTP non è configurato**, quindi non
parte alcuna email: creare un account significa crearlo a mano nella console di
Keycloak, realm `cardue`, e comunicare la password fuori banda. Per la stessa
ragione «Password dimenticata» compare nella pagina di login ma non recapita
nulla.

Perché la persona possa arrivarci, deve essere nel tailnet: invito come utente
esterno dalla console di Tailscale, oppure condivisione della singola macchina.

## 7. Backup

Due livelli, e servono entrambi.

**La VM**, da Proxmox: `vzdump` schedulato dal datacenter. Rimette in piedi la
macchina, non garantisce la coerenza del database se preso a caldo.

**Il database**, con un dump vero:

```sh
# in crontab -e, ogni notte alle 3
0 3 * * * cd $HOME/cardue && docker compose -f docker-compose.yml -f docker-compose.deploy.yml \
  exec -T db pg_dump -U cardue cardue | gzip > $HOME/backup/cardue-$(date +\%F).sql.gz
```

Il realm di Keycloak sta in `keycloak-db` ed è ricostruibile da
`keycloak/realm-cardue.json` più `configure.sh`: l'unica cosa che si perde
rifacendolo sono gli account creati a mano. Se ce ne sono di importanti, va
aggiunto un `pg_dump` anche di quello.

Prima di ogni deploy che tocca le migrazioni conviene uno **snapshot** della VM
da Proxmox: è il rollback che comprende anche il database, cosa che un `git
revert` non fa.

## 8. Operazioni ricorrenti

```sh
cd ~/cardue
C="docker compose -f docker-compose.yml -f docker-compose.deploy.yml"

$C ps                                   # stato
$C logs -f backend                      # log di un servizio
$C restart web                          # dopo aver modificato deploy/Caddyfile
$C run --rm --no-deps migrate migration:show     # migrazioni applicate
$C run --rm --no-deps migrate migration:revert   # torna indietro di una
$C down                                 # ferma tutto, i dati restano
$C down -v                              # ferma tutto e cancella i volumi
```

`down -v` è anche l'unico modo di far rileggere `keycloak/realm-cardue.json`
dall'import: una volta che il realm esiste nel database, il file non viene più
guardato.

## 9. Quando qualcosa non va

**Il browser dice che il certificato non è valido.** Caddy non è riuscito a
chiedere il certificato a Tailscale. In ordine: HTTPS Certificates è attivo nel
tailnet? Il socket è montato (`ls -l /var/run/tailscale/tailscaled.sock`)?
`$C logs web` lo dice esplicitamente.

**Il login rimbalza o finisce su un indirizzo interno.** I quattro posti in cui
compare il nome di host non coincidono. `$C exec keycloak env | grep KC_HOSTNAME`
e confronta con `APP_BASE_URL` e `KEYCLOAK_ISSUER_URL` in `backend/.env`.

**Il backend non parte, «Identity provider unreachable».** Il backend chiama
Keycloak al suo indirizzo pubblico, e ci arriva perché quel nome, dentro la rete
Docker, è un alias del container `web`. Verifica con
`$C exec backend node -e "fetch(process.env.KEYCLOAK_ISSUER_URL+'/.well-known/openid-configuration').then(r=>console.log(r.status))"`.

**`migrate` fallisce e il backend non parte.** È il comportamento voluto: un
backend che gira su uno schema vecchio è peggio di un backend fermo.
`$C logs migrate` ha il motivo.

**Il Service Worker serve una versione vecchia.** `/sw.js` e `/index.html` sono
serviti con `Cache-Control: no-cache` proprio per evitarlo; se succede lo stesso,
è la cache del browser: *Applicazione → Service worker → Unregister*, poi
ricarica.

## Cosa cambierebbe per una produzione vera

Questo elenco è il debito che l'ambiente si porta dietro consapevolmente.

- **Le immagini si costruiscono sul server.** Va bene per una macchina sola;
  una produzione le prende da un registry, costruite dalla CI, così ciò che
  gira è esattamente ciò che è stato provato.
- **L'account di sviluppo esiste.** `CARDUE_DEV_USER_PASSWORD` va lasciata
  vuota altrove.
- **SMTP non è configurato**, quindi niente verifica dell'email né recupero
  della password.
- **Nessun rate limiting né firewall applicativo**: la difesa è che la macchina
  è raggiungibile solo dal tailnet.
- **I backup non escono dalla macchina.** Un `pg_dump` accanto al database che
  protegge vale finché il disco è sano.
