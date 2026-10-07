# syntax=docker/dockerfile:1

# ============================================================
# Stage 1 — build (Vite + React + TypeScript)
# VITE_API_URL e compilado AQUI (build-time). Nunca coloque
# segredo em VITE_*: ele fica embutido no bundle estatico.
# ============================================================
FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

ARG VITE_DEMO_ADMIN_EMAIL
ENV VITE_DEMO_ADMIN_EMAIL=$VITE_DEMO_ADMIN_EMAIL

ARG VITE_DEMO_ADMIN_PASSWORD
ENV VITE_DEMO_ADMIN_PASSWORD=$VITE_DEMO_ADMIN_PASSWORD

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build          # "tsc --noEmit && vite build"

# ============================================================
# Stage 2 — runtime estatico (Nginx)
# ============================================================
FROM nginx:alpine AS runtime

RUN apk add --no-cache wget

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
