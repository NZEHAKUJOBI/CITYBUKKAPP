# Chop City Bukka: one image with the API (CityBukka-Server) serving the built
# web app (CityBukka-Web) from the same origin.
#
#   docker build -t citybukka .
#   docker run -p 8080:8080 -e DATABASE_URL=postgres://... citybukka

ARG NODE_VERSION=24

# ---- 1. Build the web app (customer PWA + admin + rider) ------------------------
FROM node:${NODE_VERSION}-alpine AS web
WORKDIR /web
COPY CityBukka-Web/package.json CityBukka-Web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY CityBukka-Web/ ./
# Empty = call the API on the same origin, which is how this image serves it.
ENV VITE_API_BASE_URL=""
RUN npm run build

# ---- 2. Production dependencies for the API -------------------------------------
FROM node:${NODE_VERSION}-alpine AS server-deps
WORKDIR /app
COPY CityBukka-Server/package.json CityBukka-Server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- 3. Runtime ----------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine
# su-exec: drop from root to the unprivileged "node" user after fixing upload-dir ownership.
RUN apk add --no-cache su-exec
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    STATIC_DIR=/app/public \
    UPLOAD_DIR=/var/data/uploads

COPY --from=server-deps /app/node_modules ./node_modules
COPY CityBukka-Server/package.json ./
COPY CityBukka-Server/src ./src
COPY --from=web /web/dist ./public
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /var/data/uploads && chown -R node:node /var/data

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
