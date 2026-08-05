FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --no-audit --no-fund \
  --fetch-retries=5 \
  --fetch-retry-mintimeout=20000 \
  --fetch-retry-maxtimeout=120000

FROM deps AS build

COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates dumb-init openssl postgresql-client \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 nestjs

COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist

RUN mkdir -p /app/uploads && chown nestjs:nodejs /app/uploads

# [PORTABILITÉ] Tourne en root sur l'hôte CapRover actuel : un précédent
# passage à `USER nestjs` a fait planter le conteneur silencieusement (aucun
# log exploitable). Hypothèse la plus probable : un volume/point de montage
# CapRover propre à cet hôte, avec des permissions incompatibles avec l'UID
# 1001 — l'upload d'images passe déjà entièrement par mémoire → S3
# (uploads.controller.ts), /app/uploads n'est donc plus réellement utilisé
# par le code applicatif. Avant de retenter `USER nestjs` : vérifier côté
# CapRover (Persistent Directories de l'app restodici-backend) si un volume
# est monté, et sur quel chemin/UID hôte, puis retester d'abord sur un
# environnement non critique (staging ou app CapRover dupliquée).
EXPOSE 3000

CMD ["dumb-init", "node", "dist/main.js"]
