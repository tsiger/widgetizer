# syntax=docker/dockerfile:1

# Widgetizer: web-mode container image.
#
# The app runs as a SINGLE Node process: Express serves the JSON API AND the
# built React editor (dist/) on one port. SQLite, uploaded files and installed
# themes all live under /data, which is a mounted volume so they survive
# restarts and image rebuilds. (This does NOT package the Electron desktop app.)

# ---------------------------------------------------------------------------
# Stage 1 (build): install every dependency and compile the frontend bundle.
# ---------------------------------------------------------------------------
# Both stages use the floating Node 24 tag on purpose: whoever builds the image
# gets the newest Node 24 release and its security fixes, with no pin to bump.
# Keep the two stages on the same tag so the native modules installed here match
# the runtime. (The node-brotli-usage rule wants a pinned patch release; the
# floating tag is the deliberate choice, and it resolves to a fixed release.)
# nosemgrep: node-brotli-usage
FROM node:24-slim AS builder
WORKDIR /app

# Copy only the manifests first so the `npm ci` layer stays cached until a
# dependency actually changes. This is an npm-workspaces monorepo, so every
# workspace package.json must exist before install.
# (Adding a new package under packages/? Add a matching COPY line here.)
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/render-engine/package.json ./packages/render-engine/
COPY packages/builder-server/package.json ./packages/builder-server/
COPY packages/editor-ui/package.json ./packages/editor-ui/
COPY packages/adapters-local/package.json ./packages/adapters-local/

# better-sqlite3 and sharp ship prebuilt Linux binaries, so nothing is compiled
# and no install script is needed: --ignore-scripts keeps npm from running
# better-sqlite3's node-gyp step anyway (it builds nothing, but node-gyp needs
# Python and make just to start), so the image needs no build tools at all.
# On dependency upgrades, check for new install steps (a package's own install
# scripts, an implicit node-gyp build from a binding.gyp, workspace hooks), then
# verify the frontend build and that SQLite and Sharp load after the prune.
RUN npm ci --ignore-scripts

# Copy the rest of the source (node_modules, dist, data, .env* are excluded via
# .dockerignore so host artifacts never leak in).
COPY . .

# Build the frontend with an EMPTY api base so the bundle talks to whatever
# origin served it (same-origin), instead of a baked-in http://localhost:3001.
RUN printf 'VITE_API_URL=\n' > .env.production \
  && npm run build

# Drop devDependencies (electron, vite, vitest, ...) while keeping the
# native modules' binaries. This is what makes the runtime image small.
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# Stage 2 (runtime): just Node + the built app. No build tools, no dev deps.
# ---------------------------------------------------------------------------
# Same floating tag as the build stage (see the note there).
# nosemgrep: node-brotli-usage
FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
# Listen on all interfaces so the published container port is reachable.
ENV HOST=0.0.0.0
ENV PORT=3001
# Everything persistent (SQLite DB, projects, uploads, installed themes) lives here.
ENV DATA_ROOT=/data

# Bring the built app over, owned by the unprivileged 'node' user that ships
# with the base image (--chown avoids a second, image-doubling copy layer).
COPY --from=builder --chown=node:node /app ./

RUN mkdir -p /data && chown node:node /data
USER node

EXPOSE 3001
VOLUME ["/data"]

# Liveness probe against the built-in health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
