# Running Widgetizer with Docker

This packages the **web app** (not the Electron desktop app) into a single
container. One Node process serves both the editor UI and the API on port
`3001`. Your data (database, projects, uploads, installed themes) is kept in a
Docker **volume**, so it survives restarts and image rebuilds.

## What you need

Install **Docker Desktop** (Windows/Mac) or Docker Engine (Linux). You do not
need Node.js installed to run the container.

## Run it

From the project root:

```bash
docker compose up --build
```

Then open **http://localhost:3001**.

- The first build takes a few minutes (installs dependencies, builds the
  frontend, compiles the database module). Later runs are fast.
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
   Traefik) that forwards to the container.

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
docker run -p 3001:3001 -v widgetizer-data:/data widgetizer
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
