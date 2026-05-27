FROM node:20-alpine

RUN apk add --no-cache tini \
 && addgroup -S -g 1001 app \
 && adduser  -S -u 1001 -G app -h /app -s /sbin/nologin app

WORKDIR /app

COPY --chown=app:app package.json ./
RUN --mount=type=cache,target=/root/.npm npm install --omit=dev

COPY --chown=app:app server.js ./

USER app

EXPOSE 1234

ENV HOST=0.0.0.0
ENV PORT=1234

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
