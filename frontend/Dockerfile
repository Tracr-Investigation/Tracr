# syntax=docker/dockerfile:1.7

# ── Stage 1 : deps ─────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Installation reproductible (npm ci) : nécessite package-lock.json
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci


# ── Stage 2 : runtime (dev server Vite) ────────────────────────────
FROM node:20-alpine AS runtime

ENV NODE_ENV=development

# tini pour PID 1 + signaux propres
RUN apk add --no-cache tini \
 && addgroup -S -g 1001 app \
 && adduser  -S -u 1001 -G app -h /app -s /sbin/nologin app

WORKDIR /app

# node_modules depuis l'étape deps + sources
COPY --from=deps --chown=app:app /app/node_modules /app/node_modules
COPY --chown=app:app . /app

USER app

EXPOSE 5173

ENTRYPOINT ["/sbin/tini", "--"]
# --host 0.0.0.0 pour que le dev server soit accessible depuis l'hôte
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
