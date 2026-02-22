# Tauri Integration Folder Structure (Official Node Sidecar)

> Last updated: 2026-02-22
> Official sidecar reference: https://v2.tauri.app/learn/sidecar-nodejs/

## Goal

Add Tauri as a desktop shell while keeping existing web/frontend/backend flows intact, using official sidecar binary flow (`pkg` + `src-tauri/binaries` + `Command.sidecar`).

---

## Proposed Monorepo Layout

```text
dev-see/
├── apps/
│   ├── ui/                                   # existing Svelte app (unchanged core)
│   │   ├── src/
│   │   ├── dist/
│   │   └── package.json
│   └── desktop/                              # Tauri app wrapper
│       ├── package.json                      # tauri dev/build scripts
│       ├── scripts/
│       │   ├── rename-sidecar.mjs            # rename pkg output to Tauri target naming
│       │   └── verify-desktop.sh
│       └── src-tauri/
│           ├── Cargo.toml
│           ├── tauri.conf.json               # bundle.externalBin includes binaries/dev-see-server
│           ├── build.rs
│           ├── capabilities/
│           │   └── default.json              # includes shell:allow-execute sidecar rule
│           ├── entitlements/
│           │   └── macos.plist               # sandbox entitlements for App Store
│           ├── icons/
│           ├── binaries/
│           │   ├── dev-see-server-aarch64-apple-darwin
│           │   └── dev-see-server-x86_64-apple-darwin
│           ├── resources/                    # optional app assets (not Node runtime for sidecar launch)
│           └── src/
│               ├── lib.rs                    # registers shell plugin + sidecar lifecycle
│               └── main.rs
├── packages/
│   └── server/                               # Node/Fastify backend source + sidecar build config
│       ├── src/
│       ├── dist/
│       └── package.json                      # includes build + pkg scripts
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
2. `packages/server`: Backend source of truth and sidecar executable build definition.
3. `apps/desktop/src-tauri`: Native shell, app metadata, capabilities, signing/sandbox config.
4. `apps/desktop/src-tauri/binaries`: Target-suffixed sidecar executables used by Tauri bundling.
5. `apps/desktop/scripts`: Deterministic sidecar rename/validation helpers.

---

## Script Model (Recommended)

Root-level scripts (example intent):

1. `pnpm dev:ui` -> run browser UI only (existing).
2. `pnpm dev:server` -> run Node server only (existing).
3. `pnpm --filter desktop dev` -> run Tauri desktop in dev mode.
4. `pnpm --filter desktop build` -> build desktop artifact.

Desktop prebuild flow (official sidecar adaptation):

1. Build `apps/ui`.
2. Build and package `packages/server` with `pkg`.
3. Run `apps/desktop/scripts/rename-sidecar.mjs` to place target binaries in `apps/desktop/src-tauri/binaries`.
4. Run Tauri bundle/sign pipeline (`bundle.externalBin` picks up sidecar).

---

## Notes for App Store Path

1. Keep sandbox entitlements under `apps/desktop/src-tauri/entitlements`.
2. Keep sidecar startup code in `apps/desktop/src-tauri/src/lib.rs`/`main.rs`.
3. Keep capabilities tight: only explicit sidecar execute permission.
4. Keep sidecar payload immutable at runtime (packaged binary only).
