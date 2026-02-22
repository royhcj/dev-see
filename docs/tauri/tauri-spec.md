# Tauri Desktop Wrap Spec (macOS App Store + Official Node Sidecar)

> Last updated: 2026-02-22
> Official reference: https://v2.tauri.app/learn/sidecar-nodejs/

## 1. Goal

Wrap the existing web app into a Tauri desktop app for macOS that:

1. Runs the existing Svelte frontend in a native window.
2. Runs the existing Node.js backend using Tauri v2 official sidecar method.
3. Is designed to pass macOS App Store review requirements.

---

## 2. Current Architecture (Input)

Monorepo modules in scope:

1. Frontend: `apps/ui` (Svelte + Vite).
2. Backend: `packages/server` (Node.js + Fastify + TypeScript).

Current runtime behavior:

1. Backend listens on `HOST`/`PORT` (defaults `0.0.0.0:9090`).
2. Frontend connects to backend over HTTP + WebSocket.

---

## 3. Target Desktop Architecture (v1)

Runtime inside packaged macOS app:

1. Tauri shell launches desktop window.
2. Tauri launches Node backend as a sidecar executable.
3. UI loads from built static assets (not remote URL).
4. UI talks to backend over localhost only.
5. Tauri shuts down sidecar on app exit.

Design choice:

1. Use sidecar for Node backend in v1 (do not rewrite backend in Rust now).
2. Follow official Tauri Node sidecar flow end-to-end.
3. Constrain network scope to loopback for desktop local usage.

---

## 4. Official Node Sidecar Contract (Required)

The desktop implementation must follow the official pattern from Tauri v2 docs.

## 4.1 Build the Node Backend as an Executable

1. Build TypeScript backend output first (`packages/server/dist`).
2. Package backend into executable(s) via `pkg`.
3. Produce architecture-specific binaries for macOS:
   - `aarch64-apple-darwin`
   - `x86_64-apple-darwin`

## 4.2 Place Sidecar in `src-tauri/binaries` with Target Suffix

1. Rename/copy `pkg` output into:
   - `apps/desktop/src-tauri/binaries/dev-see-server-aarch64-apple-darwin`
   - `apps/desktop/src-tauri/binaries/dev-see-server-x86_64-apple-darwin`
2. Use a deterministic script (for example `apps/desktop/scripts/rename-sidecar.mjs`) to avoid manual renaming mistakes.

## 4.3 Register Sidecar in Tauri Config

1. `apps/desktop/src-tauri/tauri.conf.json` must include:
   - `bundle.externalBin: ["binaries/dev-see-server"]`
2. The base name in `externalBin` must match runtime `Command.sidecar(...)` name.

## 4.4 Allow Execution via Capabilities (Least Privilege)

1. Add `shell:allow-execute` permission in `apps/desktop/src-tauri/capabilities/default.json`.
2. Allow only this sidecar:
   - `name: "binaries/dev-see-server"`
   - `sidecar: true`
3. Do not allow arbitrary shell execution.

## 4.5 Run Sidecar with Shell Plugin API

1. Install and initialize `tauri-plugin-shell` in Rust app setup.
2. Use `Command.sidecar("binaries/dev-see-server", args)` for launch.
3. Capture stdout/stderr and exit status for diagnostics.

## 4.6 Explicit Non-Goal for v1

1. Do not ship a separate ad-hoc Node runtime under `resources/node` for production sidecar execution.
2. Do not use non-sidecar shell execution paths from frontend.

---

## 5. App Store Readiness Requirements

## 5.1 Packaging and Signing

1. Produce a proper macOS app bundle from Tauri.
2. Use Apple Developer certificates and provisioning for App Store distribution.
3. Archive and validate in Xcode/Transporter before submission.

## 5.2 Sandbox and Entitlements

1. Enable App Sandbox.
2. Add only minimal required entitlements.
3. Ensure official sidecar launch works under sandbox constraints.

## 5.3 Privacy and Policy

1. Declare only permissions actually used.
2. Ensure no hidden auto-update or downloader behavior for App Store build.
3. Keep network behavior transparent and limited to declared needs.

## 5.4 Operational Behavior

1. No crashes if sidecar fails to start (show clear user-facing error).
2. Graceful shutdown of sidecar on quit.
3. Clear logs for diagnostics (without leaking sensitive data).

---

## 6. Functional Requirements (v1)

1. App launches and opens main UI window.
2. Backend sidecar starts automatically via `Command.sidecar`.
3. UI can call backend endpoints and WebSocket stream.
4. App works offline for localhost-only flow.
5. Startup check detects backend health and surfaces failures.

---

## 7. Non-Functional Requirements

1. Startup target: desktop ready in <= 5 seconds on typical developer Mac.
2. Sidecar restart policy: no infinite crash loop; bounded retries.
3. Deterministic ports and host strategy for packaged app.
4. Reproducible build and release scripts in CI.

---

## 8. Security Baseline

1. Default backend bind should be `127.0.0.1` in desktop mode.
2. Validate runtime args passed to sidecar.
3. Keep capabilities minimal (`core:default` + explicit sidecar execute only).
4. Avoid exposing arbitrary shell execution from frontend.

---

## 9. Scope

In scope:

1. Tauri project scaffold and integration in monorepo.
2. Frontend build wiring for Tauri.
3. Official Node sidecar packaging + startup/shutdown integration.
4. macOS signing/sandbox configuration for App Store submission flow.
5. Basic QA checklist and submission prep docs.

Out of scope:

1. Windows/Linux desktop packaging.
2. Backend rewrite from Node to Rust.
3. Advanced auto-update architecture for non-App-Store channels.

---

## 10. Acceptance Criteria

1. `pnpm` workflow can build macOS app bundle containing UI + official sidecar binaries.
2. Packaged app starts sidecar and UI can interact with backend.
3. `tauri.conf.json` uses `bundle.externalBin` with sidecar base name.
4. Capabilities include `shell:allow-execute` for sidecar only.
5. Signing/validation pipeline produces an artifact ready for App Store upload.
6. Smoke tests pass on Apple Silicon and Intel macOS targets (or universal build validation path is documented).
