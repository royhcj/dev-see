# Docker Development Runtime Plan

> Based on: `/Users/roy/dev/projects/dev-see/docs/docker/docker-spec.md`
> Last updated: 2026-02-22

## Overview

Roll out Docker support in small phases:

1. Prepare container definitions.
2. Validate local developer flow.
3. Document beginner run steps.

## Phase 0: Baseline and Constraints

Objective:

1. Confirm current non-Docker workflow and runtime assumptions.

Steps:

1. Confirm server and UI default ports (`9090`, `5173`).
2. Confirm `pnpm dev:server` and `pnpm dev:ui` behavior.
3. Confirm required environment variables for local development.

Done when:

1. Team has a short baseline checklist for expected runtime behavior.

## Phase 1: Compose and Dockerfile Scaffolding

Objective:

1. Add Docker assets for server and UI development.

Steps:

1. Add root compose file with `server` + `ui` services.
2. Add Dockerfile for server dev runtime.
3. Add Dockerfile for UI dev runtime.
4. Add `.dockerignore` to reduce build context size.
5. Ensure UI container runs Vite with `--host 0.0.0.0`.

Done when:

1. `docker compose config` resolves correctly.

## Phase 2: Developer Experience and Hot Reload

Objective:

1. Make Docker flow comfortable for active development.

Steps:

1. Add bind mounts for source code.
2. Add named volumes for dependency cache/node_modules where needed.
3. Confirm server reload on `packages/server` changes.
4. Confirm UI reload on `apps/ui` changes.

Done when:

1. Code edit loops are reliable in both services.

## Phase 3: Validation and Troubleshooting

Objective:

1. Ensure workflow is stable for first-time users.

Steps:

1. Validate startup: `docker compose up --build`.
2. Validate shutdown: `docker compose down`.
3. Validate attached logs and detached mode behavior.
4. Validate recovery from common issues:
   - port already in use
   - stale cache
   - image rebuild after dependency changes

Done when:

1. Core commands work end-to-end on a clean machine with only Docker installed.

## Phase 4: Documentation Rollout

Objective:

1. Publish beginner-friendly Docker guide with command explanations.

Steps:

1. Add setup/run/stop/cleanup commands to `/Users/roy/dev/projects/dev-see/docs/docker/docker-tasks.md`.
2. Add short "what each step does" explanation under each command block.
3. Add quick pointer from top-level docs/README to Docker docs.

Done when:

1. A new user can copy commands and understand each step.

## Risks

1. Containerized file watching can be slower on macOS/Windows.
2. First image build time may feel long to new users.
3. Compose service naming may drift from package naming.

## Definition of Done

1. Docker-based dev runtime works for UI + server.
2. Node.js/pnpm are not required on host.
3. Documentation is clear for Docker beginners.
