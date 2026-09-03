# Frontend image (ADR 0012). The build produces static files, so the final
# stage is not a Node server but Caddy, which serves them and is at the same
# time the reverse proxy of the whole stack. One container instead of two, and
# one less hop between the browser and the API.
#
# The Caddyfile is not copied in: it is mounted from deploy/Caddyfile, so
# changing a route does not mean rebuilding the frontend.

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# `tsc -b && vite build`: the type check is part of the build on purpose, so a
# broken model never reaches the server.
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
