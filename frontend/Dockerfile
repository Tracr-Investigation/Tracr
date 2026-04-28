# syntax=docker/dockerfile:1.7

# Build Dependance
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci


# run
FROM node:20-alpine AS runtime

ENV NODE_ENV=development

RUN apk add --no-cache tini \
 && addgroup -S -g 1001 app \
 && adduser  -S -u 1001 -G app -h /app -s /sbin/nologin app

WORKDIR /app

# node_modules depuis deps 
COPY --from=deps --chown=app:app /app/node_modules /app/node_modules
COPY --chown=app:app . /app

USER app

EXPOSE 5173

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
