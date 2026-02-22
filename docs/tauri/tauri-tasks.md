# Tauri Desktop Wrap Tasks

> Based on: `/Users/roy/dev/projects/dev-see/docs/tauri/tauri-plan.md`
> Last updated: 2026-02-22

## 0. Prerequisites

- [x] Confirm local Node.js and pnpm versions match project requirements.
- [x] Install and verify Rust toolchain (`rustc`, `cargo`).
- [x] Install and verify Tauri CLI.
- [x] Confirm Xcode + command line tools are installed.
- [x] Confirm Apple Developer certificates/profiles for App Store distribution are available.

Manual setup and verification commands:

```bash
# 1) Confirm Node.js + pnpm (project currently pins pnpm in packages/server/package.json)
node -v
pnpm -v
cat /Users/roy/dev/projects/dev-see/packages/server/package.json | rg packageManager

# 2) Install Rust toolchain (rustc + cargo)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"
rustc -V
cargo -V

# 3) Install and verify Tauri CLI
cargo install tauri-cli --locked
cargo tauri -V

# 4) Confirm Xcode + command line tools
xcodebuild -version
xcode-select -p
pkgutil --pkg-info=com.apple.pkg.CLTools_Executables

# 5) Confirm Apple certificates + provisioning profiles
security find-identity -v -p codesigning
ls -la "$HOME/Library/MobileDevice/Provisioning Profiles"
```

## 1. Tauri Project Scaffold

- [x] Create desktop app container and initialize Tauri project structure.
- [x] Set app name, bundle identifier, and window defaults.
- [x] Wire `dev` command to load frontend in desktop window.
- [x] Wire `build` command to consume built frontend assets.
- [x] Verify minimal Tauri shell launches locally.

## 2. Frontend Desktop Wiring

- [x] Add desktop runtime config for API base URL and WebSocket URL.
- [x] Ensure desktop mode points to localhost backend.
- [x] Ensure web mode behavior remains unchanged.
- [x] Verify frontend loads with no external runtime dependency (CDN-free packaged app).
- [ ] Smoke test core UI flow inside Tauri window.

Verification notes (2026-02-22):

- Desktop runtime env wiring validated via `cargo tauri build --debug --bundles app` (Tauri `beforeBuildCommand` injects `VITE_RUNTIME_TARGET=desktop`, desktop API URL, and desktop WS URL).
- UI runtime behavior validated with `pnpm --filter ui test --run` (`src/lib/config.test.ts` covers desktop localhost defaults and unchanged web behavior).
- Desktop dev launch smoke validated via `timeout 35 pnpm --filter desktop dev` (process reached `Running target/debug/app` before timeout).
- Interactive in-window core flow (tab switching, live logs, spec viewer actions) remains a manual check.

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
