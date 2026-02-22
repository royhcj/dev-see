# Tauri Integration Folder Structure (Proposed)

> Last updated: 2026-02-22

## Goal

Add Tauri as a desktop shell while keeping existing web/frontend/backend flows intact.

---

## Proposed Monorepo Layout

```text
dev-see/
├── apps/
│   ├── ui/                          # existing Svelte app (unchanged core)
│   │   ├── src/
│   │   ├── dist/
│   │   └── package.json
│   └── desktop/                     # new Tauri app wrapper
│       ├── package.json             # tauri dev/build scripts
│       ├── src-tauri/
│       │   ├── Cargo.toml
│       │   ├── tauri.conf.json
│       │   ├── build.rs
│       │   ├── capabilities/
│       │   │   └── default.json
│       │   ├── entitlements/
│       │   │   └── macos.plist      # sandbox entitlements for App Store
│       │   ├── icons/
│       │   ├── src/
│       │   │   └── main.rs          # starts/stops sidecar lifecycle
│       │   ├── binaries/            # sidecar launch wrapper binaries/scripts
│       │   └── resources/
│       │       └── server/          # packaged Node server payload
│       │           ├── dist/        # built output from packages/server
│       │           ├── node/        # bundled Node runtime (if chosen strategy)
│       │           └── package.json
│       └── scripts/
│           ├── prepare-sidecar.sh   # build/copy server payload for desktop
│           └── verify-desktop.sh
├── packages/
│   └── server/                      # existing Node/Fastify backend source
│       ├── src/
│       ├── dist/
│       └── package.json
├── docs/
│   └── tauri/
│       ├── tauri-spec.md
│       ├── tauri-plan.md
│       ├── tauri-tasks.md
│       └── tauri-structure.md
├── package.json
└── pnpm-workspace.yaml
```

---

## Responsibilities by Folder

1. `apps/ui`: Web frontend source and web build output.
2. `packages/server`: Backend source of truth.
3. `apps/desktop/src-tauri`: Native shell, app metadata, signing/sandbox config.
4. `apps/desktop/src-tauri/resources/server`: Runtime payload consumed by sidecar.
5. `apps/desktop/scripts`: Deterministic desktop packaging helpers.

---

## Script Model (Recommended)

Root-level scripts (example intent):

1. `pnpm dev:ui` -> run browser UI only (existing).
2. `pnpm dev:server` -> run Node server only (existing).
3. `pnpm --filter desktop dev` -> run Tauri desktop in dev mode.
4. `pnpm --filter desktop build` -> build signed desktop artifact path.

Desktop prebuild flow:

1. Build `apps/ui`.
2. Build `packages/server`.
3. Copy server payload into `apps/desktop/src-tauri/resources/server`.
4. Run Tauri bundle/sign pipeline.

---

## Notes for App Store Path

1. Keep sandbox entitlements under `apps/desktop/src-tauri/entitlements`.
2. Keep sidecar startup code only in `apps/desktop/src-tauri/src/main.rs`.
3. Keep sidecar payload immutable at runtime (packaged resources only).
