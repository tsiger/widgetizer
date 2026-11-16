# Running Widgetizer with Docker

This packages the **web app** (not the Electron desktop app) into a single
container. One Node process serves both the editor UI and the API on port
`3001`, and the export viewer on port `3002`. Your data (database, projects, uploads, installed themes) is kept in a
Docker **volume**, so it survives restarts and image rebuilds.

## What you need

Install **Docker Desktop** (Windows/Mac) or Docker Engine (Linux). You do not
need Node.js installed to run the container.

## Run it

From the project root:

```bash
docker compose up --build
```

Then open **http://localhost:3001**. **View** on the Export page opens the
export on **http://localhost:3002** (see [The export viewer](#the-export-viewer)).

- The first build takes a few minutes (installs dependencies and builds the
  frontend). Later runs are fast.
- Stop it with `Ctrl+C`.
- To run in the background: `docker compose up --build -d` (stop with
  `docker compose down`).

## Your data

Everything you create lives in a volume called `widgetizer-data`, mounted at
`/data` inside the container.

- It persists across `docker compose down` and image rebuilds.
- To start completely fresh (wipe all projects and the database):
  `docker compose down -v`.

## Hosting it on a server

Two things to change once it is not just on your own machine:

1. **`SERVER_URL`** in `docker-compose.yml`: set it to the address people use in
   the browser (e.g. `https://builder.example.com` or `http://<server-ip>:3001`).
   The live preview needs this to load images correctly.
2. **Port / HTTPS**: the `"3001:3001"` line maps host port to container port.
   For a real domain with HTTPS, put it behind a reverse proxy (nginx, Caddy or
   Traefik) that forwards to the container. Forward the export viewer too
   (below).

## The export viewer

**View** on the Export page shows an export on its own port, with the site's
address as the root, the way a static host serves it: links and assets that
start with `/` work, and a missing address shows the site's 404 page. The app
sends the browser there, so the viewer port must be reachable from the browser.

- **Which address.** The viewer's address is the one the browser used for the
  app, with the port **one above**: `http://localhost:3001` → `:3002`,
  `http://<server-ip>:8080` → `:8081`, `https://builder.example.com` (443) →
  `:444`. If you change the app's host port, change the viewer's to match:
  `"8080:3001"` goes with `"8081:3002"`.
- **A different address.** Set `EXPORT_VIEWER_URL` (e.g.
  `https://view.example.com`) when the viewer is reached some other way, such
  as a separate host behind the proxy. It must be an absolute `http://` or
  `https://` URL, and only its origin counts (any path, query or fragment is
  dropped, with a warning in the log, since the viewer serves the site from
  `/`). So the viewer needs its own host or port: a proxy that serves it under
  a path, such as `https://builder.example.com/view/`, can't work. Anything
  that isn't such a URL is ignored, with a warning in the log.
- **Updating an existing install.** A compose file or `docker run` line that
  publishes only `3001` must also publish `3002` after updating, or View leads
  to an address that doesn't answer.
- **Clearing between views.** Each view starts by clearing what earlier viewed
  sites stored in the browser (localStorage, sessionStorage, IndexedDB; not
  cookies). Browsers only do that on `localhost` or over HTTPS, so over plain
  HTTP on a LAN or server address nothing is cleared.

### Behind a reverse proxy

The proxy for the **app** must pass the browser's host and scheme, since the
viewer's address is worked out from that request (the image runs with
`NODE_ENV=production`, so the app reads the proxy's `X-Forwarded-*` headers).
Then forward the next port up to the container's `3002`.

nginx:

```nginx
server {
    listen 443 ssl;
    server_name builder.example.com;
    # ssl_certificate ... ;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 444 ssl;
    server_name builder.example.com;
    # ssl_certificate ... ;
    location / {
        proxy_pass http://127.0.0.1:3002;
    }
}
```

Without `proxy_set_header Host $http_host;` nginx sends its upstream name and
View goes to that name; without `X-Forwarded-Proto $scheme` the app takes
the request for plain HTTP on port 80, so View goes to `http://…:81`.

Caddy (passes both headers by default):

```caddy
builder.example.com {
    reverse_proxy 127.0.0.1:3001
}

builder.example.com:444 {
    reverse_proxy 127.0.0.1:3002
}
```

For a separate host instead (`view.example.com` → `3002`), set
`EXPORT_VIEWER_URL: https://view.example.com`. Give it HTTPS when the app is on
HTTPS: the app sends an HSTS header, so browsers turn a plain `http://`
viewer address on the same host (or one of its subdomains) into `https://`.

### Turning the viewer off (last resort)

`EXPORT_VIEWER_PORT: "off"` opens no viewer port, and View serves exports from
the app at `/api/export/view/…`, for a setup that can only expose one port.
There, links and assets starting with `/` break, every 404 page shows unstyled
with dead links, a missing address answers JSON instead of the 404 page, the
export's scripts run on the app's own address, and nothing a viewed site
stores is cleared between views. The exported files themselves are
unaffected; on a real host they work.

## Useful commands

| Command | What it does |
| --- | --- |
| `docker compose up --build` | Build (if needed) and start |
| `docker compose up -d` | Start in the background |
| `docker compose logs -f` | Watch the logs |
| `docker compose down` | Stop and remove the container (keeps your data) |
| `docker compose down -v` | Stop and delete your data too |
| `docker compose build --no-cache` | Rebuild from scratch |

## Without Compose (plain Docker)

```bash
docker build -t widgetizer .
docker run -p 3001:3001 -p 3002:3002 -v widgetizer-data:/data widgetizer
```

## How it works (for the curious)

- **Multi-stage build** (`Dockerfile`): the first stage installs everything and
  runs `npm run build`; the second stage copies only the built app plus
  production dependencies, so the final image has no build tools or dev
  dependencies.
- **Same-origin frontend**: the bundle is built with `VITE_API_URL=` empty, so
  it calls the API on whatever origin served it, with no hardcoded `localhost`.
- **`HOST=0.0.0.0`**: the server normally binds to loopback; the container sets
  this env var so the published port is reachable from the host.
- **`DATA_ROOT=/data`**: points the app's storage at the mounted volume.
