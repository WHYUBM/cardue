# Backend image, used both by the long-running service and by the one-shot
# migration container (ADR 0012). Two stages: the first has the toolchain and
# the dev dependencies, the second ships only what is needed to run.

FROM node:24-alpine AS build
WORKDIR /app

# Dependencies first, so a change to the sources does not reinstall them.
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app

# Read by NestJS and, above all, by cookies.ts: it is what turns on the
# `secure` flag of the session cookie. On HTTPS a cookie without it would
# travel in the clear the day the proxy is misconfigured.
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# `--omit=dev` leaves TypeORM in: it is a runtime dependency, and its CLI is
# what the migration container runs.
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Nothing here writes to disk; running as a non-root user costs nothing.
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
