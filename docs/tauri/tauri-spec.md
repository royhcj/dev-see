# Tauri Desktop Wrap Spec (macOS App Store + Node Sidecar)

> Last updated: 2026-02-22

## 1. Goal

Wrap the existing web app into a Tauri desktop app for macOS that:

1. Runs the existing Svelte frontend in a native window.
2. Runs the existing Node.js backend as a bundled sidecar process.
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

1. Tauri shell launches the desktop window.
2. Tauri launches backend sidecar binary/script on app startup.
3. UI loads from built static assets (not remote URL).
4. UI talks to sidecar backend over localhost only.
5. Tauri shuts down sidecar on app exit.

Design choice:

1. Use sidecar for Node backend in v1 (do not rewrite backend in Rust now).
2. Constrain network scope to loopback for desktop local usage.

---

## 4. Why Sidecar Is Required Here

For this codebase, sidecar is the most practical path because:

1. Backend already exists in Node.js and should be reused.
2. Tauri main process is Rust; it cannot directly execute TypeScript/Fastify logic without another runtime.
3. Sidecar preserves backend behavior and speeds delivery.

Alternative (out of scope for v1):

1. Rewrite backend in Rust/Tauri commands.
2. Embed JS engine manually (high complexity, not needed now).

---

## 5. App Store Readiness Requirements

## 5.1 Packaging and Signing

1. Produce a proper macOS app bundle from Tauri.
2. Use Apple Developer certificates and provisioning for App Store distribution.
3. Archive and validate in Xcode/Transporter before submission.

## 5.2 Sandbox and Entitlements

1. Enable App Sandbox.
2. Add only minimal required entitlements.
3. Ensure sidecar execution strategy is compatible with App Sandbox constraints.

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
2. Backend sidecar starts automatically.
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
2. Validate any runtime args passed to sidecar.
3. Keep Tauri allowlist/capabilities minimal.
4. Avoid exposing arbitrary shell execution from frontend.

---

## 9. Scope

In scope:

1. Tauri project scaffold and integration in monorepo.
2. Frontend build wiring for Tauri.
3. Node backend sidecar packaging + startup/shutdown integration.
4. macOS signing/sandbox configuration for App Store submission flow.
5. Basic QA checklist and submission prep docs.

Out of scope:

1. Windows/Linux desktop packaging.
2. Backend rewrite from Node to Rust.
3. Advanced auto-update architecture for non-App-Store channels.

---

## 10. Acceptance Criteria

1. `pnpm` workflow can build a macOS app bundle containing UI + sidecar.
2. Packaged app starts sidecar and UI can interact with backend.
3. App runs with sandbox entitlements needed for App Store.
4. Signing/validation pipeline produces an artifact ready for App Store upload.
5. Smoke tests pass on Apple Silicon and Intel macOS targets (or universal build validation path is documented).
