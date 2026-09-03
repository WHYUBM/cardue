#!/usr/bin/env bash
#
# Deploys the current state of the repository onto the development server
# (ADR 0012). Run it *on the server*, from anywhere:
#
#   ~/cardue/deploy/deploy.sh
#
# It is deliberately short and repeatable: everything that has to be true after
# a deploy — the schema migrated, Keycloak configured — is a container that
# runs and exits, not a step someone has to remember.

set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.deploy.yml)

echo "==> aggiorno il codice"
# --ff-only: a deploy must never produce a merge commit on the server. If it
# refuses, someone has committed here, and that is worth finding out about.
git pull --ff-only

echo "==> ricostruisco e avvio"
# `up` also runs the one-shot containers: `migrate` before the backend, and
# `keycloak-config` as soon as Keycloak answers its healthcheck.
"${COMPOSE[@]}" up -d --build --remove-orphans

echo "==> migrazioni applicate"
"${COMPOSE[@]}" run --rm --no-deps migrate migration:show || true

echo "==> immagini non più referenziate"
docker image prune -f >/dev/null

echo
"${COMPOSE[@]}" ps
