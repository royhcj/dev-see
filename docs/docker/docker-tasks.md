# Docker Setup and Run Tasks

> Based on: `/Users/roy/dev/projects/dev-see/docs/docker/docker-plan.md`
> Last updated: 2026-02-22

## 0. Quick Answer

Yes, Docker is a good way to let users run this project without installing Node.js/pnpm on their host machine.  
They still must install Docker and Git.

Current repository status:

1. Docker runtime files are not in the repo yet (`compose.yaml`, Dockerfiles, `.dockerignore`).
2. You need to create them once using the steps below.

## 1. One-Time Prerequisites (User Machine)

- [x] Install Docker Desktop (macOS/Windows) or Docker Engine + Compose plugin (Linux).
- [x] Install Git.

Verify tools:

```bash
docker --version
docker compose version
git --version
```

What this does:

1. Confirms Docker CLI is installed.
2. Confirms Docker Compose is available.
3. Confirms Git is available for cloning the repo.

## 2. Get the Project

- [x] Clone and enter the repository.

```bash
git clone <repository-url>
cd dev-see
```

What this does:

1. Downloads the source code from your Git remote.
2. Moves terminal into the project root.

## 3. Create Docker Files for This Project (One-Time)

- [x] Create `.dockerignore`.

```bash
cat > .dockerignore <<'EOF'
.git
.github
node_modules
**/node_modules
dist
**/dist
.pnpm-store
pnpm-debug.log*
EOF
```

What this does:

1. Creates ignore rules so Docker builds do not send unnecessary files.
2. Speeds up builds and reduces image size.

- [x] Create backend Dockerfile.

```bash
cat > packages/server/Dockerfile <<'EOF'
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ui/package.json apps/ui/package.json
COPY packages/server/package.json packages/server/package.json

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 9090

CMD ["pnpm", "--filter", "server", "dev"]
EOF
```

What this does:

1. Uses Node 20 inside the container.
2. Installs dependencies with pnpm in container.
3. Starts backend in dev/watch mode.

- [x] Create frontend Dockerfile.

```bash
cat > apps/ui/Dockerfile <<'EOF'
FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ui/package.json apps/ui/package.json
COPY packages/server/package.json packages/server/package.json

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "--filter", "ui", "dev", "--host", "0.0.0.0", "--port", "5173"]
EOF
```

What this does:

1. Builds UI dev environment in container.
2. Runs Vite on `0.0.0.0` so host browser can access it.

- [x] Create compose file.

```bash
cat > compose.yaml <<'EOF'
services:
  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
    ports:
      - "9090:9090"
    environment:
      HOST: 0.0.0.0
      PORT: 9090
    volumes:
      - .:/app
      - server_node_modules:/app/node_modules

  ui:
    build:
      context: .
      dockerfile: apps/ui/Dockerfile
    ports:
      - "5173:5173"
    depends_on:
      - server
    environment:
      VITE_SERVER_URL: http://localhost:9090
      VITE_WS_URL: ws://localhost:9090/ws
    volumes:
      - .:/app
      - ui_node_modules:/app/node_modules

volumes:
  server_node_modules:
  ui_node_modules:
EOF
```

What this does:

1. Defines two services (`server`, `ui`).
2. Builds each from its Dockerfile.
3. Exposes ports to your host machine.
4. Mounts source code for live reload.

- [x] Validate compose config.

```bash
docker compose config
```

What this does:

1. Checks if `compose.yaml` is valid before running containers.

## 4. First Run with Docker

- [x] Build images and start server + UI.

```bash
docker compose up --build
```

What this does:

1. Reads the compose file.
2. Builds container images (because of `--build`).
3. Starts both backend and frontend containers.
4. Streams logs in your terminal.

Verify it works:

1. Open `http://localhost:5173` (UI).
2. Open `http://localhost:9090` (server).

## 5. Test the API Flow

- [x] Send a sample log to backend.

```bash
curl -X POST http://localhost:9090/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://api.example.com/users",
    "statusCode": 200,
    "duration": 150
  }'
```

What this does:

1. Sends a fake API log record into the backend.
2. Lets you confirm UI receives and displays the log.

## 6. Stop Services

- [x] Stop running containers.

If running in attached mode (`docker compose up` in foreground):

1. Press `Ctrl + C`.

Then clean up project containers/network:

```bash
docker compose down
```

What this does:

1. Stops and removes containers created by compose.
2. Removes the compose network.
3. Keeps cached images/volumes by default.

## 7. Daily Commands (After First Build)

- [x] Start services again:

```bash
docker compose up
```

What this does:

1. Reuses previously built images.
2. Starts services quickly.

- [x] Run in background:

```bash
docker compose up -d
```

What this does:

1. Starts containers in detached mode.
2. Returns terminal control immediately.

- [x] Watch logs:

```bash
docker compose logs -f
```

What this does:

1. Tails live logs from all services.

- [x] Restart one service only:

```bash
docker compose restart ui
docker compose restart server
```

What this does:

1. Restarts only the chosen service container.

## 8. Rebuild and Cleanup Commands

- [x] Rebuild after dependency changes:

```bash
docker compose up --build
```

What this does:

1. Rebuilds images to include dependency or Dockerfile changes.

- [x] Remove containers, networks, and volumes (full reset):

```bash
docker compose down --volumes --remove-orphans
```

What this does:

1. Removes containers and network.
2. Removes named volumes used by compose.
3. Removes orphan containers from old compose configs.

## 9. Optional Port Override

If port `5173` or `9090` is already used, change compose mapping:

```yaml
ports:
  - "5174:5173" # host:container
```

What this does:

1. Exposes UI on another host port (`http://localhost:5174`) while keeping container port unchanged.
