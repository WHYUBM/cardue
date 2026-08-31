#!/usr/bin/env bash
#
# Brings a Keycloak instance to the configuration Cardue expects, and does so
# in a way that is safe to repeat: running it again on an already configured
# realm changes nothing.
#
# It exists because part of the configuration cannot live in the versioned
# realm file (ADR 0009):
#
#   * redirect URIs differ per environment — localhost in development, the real
#     domain in production;
#   * the client secret and the Google credentials are secrets, and a file in
#     the repository is the wrong place for them;
#   * the development account must not exist anywhere else. Keeping it in the
#     realm file would have meant the first deploy creating it on the server:
#     the point is not that its password is hidden — it is that without the
#     variable the account is never created at all.
#
# So the realm file stays declarative and public, and everything that depends
# on the environment is applied here from variables.
#
# Runs inside the Keycloak image, which ships `kcadm.sh` and bash but no curl.

set -euo pipefail

KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
KEYCLOAK_ADMIN_USER="${KEYCLOAK_ADMIN_USER:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM="${KEYCLOAK_REALM:-cardue}"
REALM_FILE="${REALM_FILE:-/config/realm-cardue.json}"

CLIENT_ID="${KEYCLOAK_CLIENT_ID:-cardue-backend}"
CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-}"
APP_BASE_URL="${APP_BASE_URL:-}"

GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-}"

# Development account. Deliberately without a default: an unset variable means
# no account, which is what must happen on a server.
DEV_USER_PASSWORD="${CARDUE_DEV_USER_PASSWORD:-}"
DEV_USER_NAME="${CARDUE_DEV_USER_NAME:-andrea}"
DEV_USER_EMAIL="${CARDUE_DEV_USER_EMAIL:-andrea.rossi@example.com}"
# First and last name are not decoration: without them Keycloak greets the
# first sign-in with its VERIFY_PROFILE required action, and the flow stops on
# a form instead of coming back to the application.
DEV_USER_FIRST_NAME="${CARDUE_DEV_USER_FIRST_NAME:-$DEV_USER_NAME}"
DEV_USER_LAST_NAME="${CARDUE_DEV_USER_LAST_NAME:-Sviluppo}"

KCADM=/opt/keycloak/bin/kcadm.sh

log() { printf '[configure] %s\n' "$*"; }
fail() { printf '[configure] ERRORE: %s\n' "$*" >&2; exit 1; }

[ -n "$CLIENT_SECRET" ] || fail "KEYCLOAK_CLIENT_SECRET non impostata"
[ -n "$APP_BASE_URL" ] || fail "APP_BASE_URL non impostata"

# --- 1. Attendere che Keycloak risponda -------------------------------------
# The script may start before the server is up: a deploy has no guarantee about
# ordering beyond what it is told, and a healthcheck is not always available.
log "attendo $KEYCLOAK_URL"
for attempt in $(seq 1 60); do
  if $KCADM config credentials \
      --server "$KEYCLOAK_URL" --realm master \
      --user "$KEYCLOAK_ADMIN_USER" --password "$KEYCLOAK_ADMIN_PASSWORD" \
      >/dev/null 2>&1; then
    log "autenticato come $KEYCLOAK_ADMIN_USER"
    break
  fi
  [ "$attempt" -eq 60 ] && fail "Keycloak non raggiungibile dopo 60 tentativi"
  sleep 2
done

# --- 2. Il realm ------------------------------------------------------------
# Created from the versioned file when missing. Doing it here rather than only
# through `--import-realm` means one mechanism instead of two, and it also
# covers a deploy whose database already exists.
if $KCADM get "realms/$REALM" >/dev/null 2>&1; then
  log "realm '$REALM' già presente"
else
  log "realm '$REALM' assente, lo creo da $REALM_FILE"
  [ -f "$REALM_FILE" ] || fail "file del realm non trovato: $REALM_FILE"
  $KCADM create realms -f "$REALM_FILE"
fi

# --- 3. Il client dell'applicazione ----------------------------------------
# Redirect URIs are derived from APP_BASE_URL: they are the address the
# *browser* comes back to, which is the application, not Keycloak.
REDIRECT_URI="$APP_BASE_URL/api/auth/callback"

client_uuid="$($KCADM get clients -r "$REALM" -q "clientId=$CLIENT_ID" \
  --fields id --format csv --noquotes 2>/dev/null | tr -d '\r' | head -1)"

if [ -z "$client_uuid" ]; then
  log "creo il client '$CLIENT_ID'"
  client_uuid="$($KCADM create clients -r "$REALM" -i \
    -s "clientId=$CLIENT_ID" \
    -s 'protocol=openid-connect' \
    -s 'publicClient=false' \
    -s 'standardFlowEnabled=true' \
    -s 'serviceAccountsEnabled=false')"
fi

# Sent as one JSON document rather than as a list of `-s key=value` pairs:
# `kcadm` reads a dot in a key as nesting, so `attributes.post.logout.redirect.uris`
# becomes four nested objects instead of one key that happens to contain dots,
# and the command fails with an unhelpful "Cannot parse the JSON".
log "allineo il client '$CLIENT_ID' su $REDIRECT_URI"
$KCADM update "clients/$client_uuid" -r "$REALM" -f - <<JSON
{
  "secret": "$CLIENT_SECRET",
  "redirectUris": ["$REDIRECT_URI"],
  "webOrigins": ["$APP_BASE_URL"],
  "publicClient": false,
  "standardFlowEnabled": true,
  "attributes": { "post.logout.redirect.uris": "$APP_BASE_URL/*" }
}
JSON

# --- 4. Google, solo se ci sono le credenziali ------------------------------
# Absent by default: a deploy without Google credentials must still work, with
# email and password only, rather than fail.
if [ -n "$GOOGLE_CLIENT_ID" ] && [ -n "$GOOGLE_CLIENT_SECRET" ]; then
  if $KCADM get "identity-provider/instances/google" -r "$REALM" >/dev/null 2>&1; then
    log "aggiorno l'identity provider Google"
    $KCADM update "identity-provider/instances/google" -r "$REALM" \
      -s 'enabled=true' \
      -s "config.clientId=$GOOGLE_CLIENT_ID" \
      -s "config.clientSecret=$GOOGLE_CLIENT_SECRET"
  else
    log "collego l'identity provider Google"
    $KCADM create identity-provider/instances -r "$REALM" \
      -s 'alias=google' \
      -s 'providerId=google' \
      -s 'enabled=true' \
      -s 'trustEmail=true' \
      -s "config.clientId=$GOOGLE_CLIENT_ID" \
      -s "config.clientSecret=$GOOGLE_CLIENT_SECRET"
  fi
else
  log "credenziali Google assenti: accesso solo con email e password"
fi

# --- 5. L'utente di sviluppo, solo se richiesto esplicitamente --------------
# Guarded by the presence of the password and nothing else. There is no
# fallback value on purpose: a default here would put the account back on every
# machine that ran the script, which is exactly what this avoids.
if [ -n "$DEV_USER_PASSWORD" ]; then
  dev_uuid="$($KCADM get users -r "$REALM" -q "username=$DEV_USER_NAME" --fields id \
    --format csv --noquotes 2>/dev/null | tr -d '\r' | head -1)"

  if [ -z "$dev_uuid" ]; then
    log "creo l'utente di sviluppo '$DEV_USER_NAME'"
    # `emailVerified` matters beyond appearances: the backend only adopts an
    # existing account by email when the provider vouches for it.
    dev_uuid="$($KCADM create users -r "$REALM" -i \
      -s "username=$DEV_USER_NAME" \
      -s "email=$DEV_USER_EMAIL" \
      -s "firstName=$DEV_USER_FIRST_NAME" \
      -s "lastName=$DEV_USER_LAST_NAME" \
      -s 'enabled=true' \
      -s 'emailVerified=true')"
  else
    log "utente di sviluppo '$DEV_USER_NAME' già presente"
  fi

  $KCADM set-password -r "$REALM" --userid "$dev_uuid" \
    --new-password "$DEV_USER_PASSWORD"
else
  log "nessun utente di sviluppo richiesto"
fi

# --- 6. Le impostazioni che devono restare vere -----------------------------
# Reapplied every run: someone may have changed them by hand in the console,
# and these are the ones the application depends on (ADR 0009).
log "riapplico le impostazioni del realm"
$KCADM update "realms/$REALM" \
  -s 'registrationAllowed=false' \
  -s 'registrationEmailAsUsername=false' \
  -s 'resetPasswordAllowed=true' \
  -s 'bruteForceProtected=true' \
  -s 'loginWithEmailAllowed=true' \
  -s 'duplicateEmailsAllowed=false'

log "configurazione completata"
