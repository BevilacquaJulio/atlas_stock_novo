# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — build (Prisma generate + Nest build)
# Tem todas as dependencias (incl. devDeps e a CLI do Prisma).
# ============================================================
FROM node:24-alpine@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build          # "prisma generate && nest build"

# ============================================================
# Stage 2 — runtime de producao (apenas deps de producao)
# ============================================================
FROM node:24-alpine@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache wget

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /opt/yarn-v* \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/yarn /usr/local/bin/yarnpkg

# Client gerado (Prisma 7 gera fora de node_modules) + build + schema
COPY --from=build /app/generated ./generated
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health/ready || exit 1

CMD ["node", "dist/src/main.js"]
