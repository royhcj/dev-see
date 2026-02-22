# Tauri Desktop Wrap Tasks

> Based on: `/Users/roy/dev/projects/dev-see/docs/tauri/tauri-plan.md`
> Last updated: 2026-02-22

## 0. Prerequisites

- [ ] Confirm local Node.js and pnpm versions match project requirements.
- [ ] Install and verify Rust toolchain (`rustc`, `cargo`).
- [ ] Install and verify Tauri CLI.
- [ ] Confirm Xcode + command line tools are installed.
- [ ] Confirm Apple Developer certificates/profiles for App Store distribution are available.

## 1. Tauri Project Scaffold

- [ ] Create desktop app container and initialize Tauri project structure.
- [ ] Set app name, bundle identifier, and window defaults.
- [ ] Wire `dev` command to load frontend in desktop window.
- [ ] Wire `build` command to consume built frontend assets.
- [ ] Verify minimal Tauri shell launches locally.

## 2. Frontend Desktop Wiring

- [ ] Add desktop runtime config for API base URL and WebSocket URL.
- [ ] Ensure desktop mode points to localhost backend.
- [ ] Ensure web mode behavior remains unchanged.
- [ ] Verify frontend loads with no external runtime dependency (CDN-free packaged app).
- [ ] Smoke test core UI flow inside Tauri window.

## 3. Backend Build and Sidecar Packaging

- [ ] Add repeatable backend production build step (`packages/server`).
- [ ] Decide and document Node runtime bundling strategy for sidecar.
- [ ] Add sidecar artifact to Tauri bundle resources/binaries.
- [ ] Configure sidecar command and arguments in Tauri config.
- [ ] Implement sidecar startup on app launch.
- [ ] Implement sidecar shutdown on app quit.
- [ ] Add backend health-check handshake before marking app ready.

## 4. Runtime Reliability

- [ ] Handle sidecar start failure with user-visible error state.
- [ ] Add bounded retry behavior (no infinite loops).
- [ ] Handle "port already in use" with clear diagnostics.
- [ ] Add structured logs for startup and shutdown lifecycle.
- [ ] Validate multiple launch/quit cycles for zombie-process prevention.

## 5. Security and Sandbox

- [ ] Set desktop backend bind host to `127.0.0.1`.
- [ ] Minimize Tauri capabilities/permissions to least privilege.
- [ ] Review and remove unused filesystem/shell/network permissions.
- [ ] Configure App Sandbox entitlements required by runtime behavior.
- [ ] Verify sidecar execution under sandbox constraints.

## 6. macOS Signing and App Store Packaging

- [ ] Configure bundle metadata (version/build number/category).
- [ ] Configure signing identity for App Store distribution.
- [ ] Configure provisioning profile and entitlements for release build.
- [ ] Produce release archive.
- [ ] Validate archive (Xcode Organizer or Transporter).
- [ ] Resolve all signing/validation warnings and errors.

## 7. App Store Submission Prep

- [ ] Prepare App Store Connect app record and metadata.
- [ ] Prepare privacy details and permission rationale.
- [ ] Draft reviewer notes explaining localhost sidecar behavior.
- [ ] Upload validated build to App Store Connect.
- [ ] Complete internal QA and submit for review.

## 8. QA Checklist

- [ ] Fresh install launch test on clean macOS user account.
- [ ] Confirm sidecar starts and backend health endpoint responds.
- [ ] Confirm UI can send/receive logs via HTTP + WebSocket.
- [ ] Confirm graceful quit terminates sidecar.
- [ ] Confirm relaunch works after forced sidecar failure.
- [ ] Confirm no unexpected outbound network activity.

## 9. Documentation

- [ ] Add `docs/tauri/quickstart.md` with first-run commands.
- [ ] Add architecture diagram for Tauri + sidecar lifecycle.
- [ ] Add troubleshooting guide for signing/sandbox/sidecar failures.
- [ ] Add release runbook for repeatable App Store submissions.

## 10. Exit Criteria

- [ ] Team member new to Tauri can run documented steps end-to-end.
- [ ] Packaged app runs frontend + Node sidecar reliably.
- [ ] macOS archive validates and is uploadable to App Store Connect.
- [ ] Submission checklist is complete with no known blockers.
