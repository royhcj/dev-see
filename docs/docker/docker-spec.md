# Docker Development Runtime Spec

> Last updated: 2026-02-22

## 1. Goal

Enable contributors to run both backend and frontend with Docker, instead of installing Node.js, pnpm, and local toolchains on the host.

Target developer entrypoint:

```bash
docker compose up --build
```

## 2. Problem Statement

Current setup requires local toolchain installation:

1. Node.js
2. pnpm
3. Project dependencies

This creates onboarding friction, especially for first-time contributors.

## 3. Clarification: What Docker Solves

Docker solves most local toolchain issues, but not all prerequisites.

1. Users do not need host Node.js or host pnpm.
2. Users still need Docker (Docker Desktop on macOS/Windows, Docker Engine on Linux).
3. Users still need Git to clone the repository.
4. Users still need free ports `5173` (UI) and `9090` (server), or must remap ports.

## 4. Current Runtime

Today contributors run:

1. `pnpm dev:server` for backend (`packages/server`)
2. `pnpm dev:ui` for frontend (`apps/ui`)

Default ports:

1. Server: `http://localhost:9090`
2. UI: `http://localhost:5173`

## 5. Target Docker Runtime

Use Docker Compose to orchestrate two dev services:

1. `server` service:
   - Runs `packages/server` in watch mode.
   - Exposes port `9090`.
2. `ui` service:
   - Runs `apps/ui` Vite dev server in watch mode.
   - Exposes port `5173`.
   - Must bind Vite to `0.0.0.0` so browser access works from host.

Compose will provide:

1. Shared network between services.
2. Volume mounts for source code (hot reload).
3. Optional named volumes for dependency caches.

## 6. Scope

In scope:

1. Docker development workflow equivalent to current `pnpm dev:server` + `pnpm dev:ui`.
2. Beginner-friendly docs and commands.
3. Cross-platform usage (macOS, Windows, Linux) via Docker.

Out of scope:

1. Production deployment architecture.
2. Kubernetes/Swarm.
3. Replacing existing pnpm-based local workflow (Docker is an additional option).

## 7. Functional Requirements

1. `docker compose up --build` starts backend and frontend.
2. UI reachable at `http://localhost:5173`.
3. Server reachable at `http://localhost:9090`.
4. File changes in `apps/ui` and `packages/server` trigger hot reload/restart.
5. `docker compose down` cleanly stops services.

## 8. Non-Functional Requirements

1. First-run onboarding must be understandable for Docker beginners.
2. Re-run startup should be deterministic.
3. Implementation should avoid requiring privileged host changes.
4. Documentation should clearly explain what each command does.

## 9. Proposed Artifacts

1. Root compose file (`compose.yaml` or `docker-compose.yml`).
2. Dockerfiles for `server` and `ui` dev services.
3. `.dockerignore` for efficient builds.
4. `docs/docker/docker-tasks.md` runbook.

## 10. Risks and Mitigations

1. File watching may be slower in containers on macOS/Windows.
   - Mitigation: document fallback polling options if needed.
2. Port conflicts (`5173`, `9090`).
   - Mitigation: document port override examples.
3. First `docker compose up --build` may be slow.
   - Mitigation: keep layers/cache stable, use lockfile-aware dependency install.

## 11. Acceptance Criteria

1. A new user with only Docker + Git can run frontend/backend with documented commands.
2. No host Node.js/pnpm installation is required.
3. README/docs include copy-paste commands for setup, run, stop, and cleanup.
4. Docker workflow is verified on at least one macOS machine.
