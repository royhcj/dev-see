# dev-see Desktop (Tauri)

This package wraps the UI in a macOS desktop shell using Tauri.

## Prerequisites

Run these once from the repo root:

```bash
pnpm install
cargo tauri -V
```

## Commands

Run from repo root (`/Users/roy/dev/projects/dev-see`):

| Command | What it does |
| --- | --- |
| `pnpm run dev:desktop` | Starts Tauri in development mode. It also starts the UI dev server automatically (`http://127.0.0.1:5173`) via Tauri `beforeDevCommand`, then opens the native desktop window. |
| `pnpm run build:desktop` | Builds the desktop app for production. It first builds UI assets (`apps/ui/dist`) via Tauri `beforeBuildCommand`, then bundles the desktop app. |

Run from desktop package folder (`/Users/roy/dev/projects/dev-see/apps/desktop`):

| Command | What it does |
| --- | --- |
| `pnpm dev` | Same as `cargo tauri dev`. Useful when working only in the desktop package. |
| `pnpm build` | Same as `cargo tauri build` (production-style bundle build). |
| `pnpm build:debug` | Same as `cargo tauri build --debug`. Produces debug bundles and is useful for faster local validation. |
| `cargo tauri dev` | Direct Tauri dev command (no pnpm wrapper). |
| `cargo tauri build` | Direct Tauri release bundle build command. |
| `cargo tauri build --debug` | Direct Tauri debug bundle build command. |

## Output Paths

Typical bundle outputs are under:

- `apps/desktop/src-tauri/target/release/bundle/` (release build)
- `apps/desktop/src-tauri/target/debug/bundle/` (debug build)

For macOS, this usually includes:

- `.app` bundle
- `.dmg` installer

## Notes

- Dev mode keeps processes running; use `Ctrl+C` to stop.
- UI build/run is triggered by Tauri config, so you do not need to start `apps/ui` manually for desktop commands.
