# Tauri Desktop Wrap Implementation Plan

> Based on: `/Users/roy/dev/projects/dev-see/docs/tauri/tauri-spec.md`
> Last updated: 2026-02-22

## Overview

This plan introduces Tauri in beginner-friendly phases:

1. Start with a minimal app shell.
2. Integrate frontend build.
3. Integrate Node backend as sidecar.
4. Harden runtime behavior.
5. Complete macOS App Store packaging and validation.

---

## Phase 0: Prerequisites and Baseline

Objective:

1. Confirm local toolchain and repository baseline before Tauri changes.

Steps:

1. Verify Node.js/pnpm versions used by workspace.
2. Verify Rust toolchain and Tauri CLI installation path.
3. Verify Xcode + Apple developer signing prerequisites.
4. Record current app run/build commands for comparison.

Done when:

1. Local machine can build frontend/backend normally.
2. Team has a single checklist for required tools.

---

## Phase 1: Initialize Tauri Container

Objective:

1. Add Tauri project structure without changing business logic.

Steps:

1. Create Tauri app container (likely under `apps/desktop` or equivalent).
2. Configure Tauri window metadata (name, size, bundle identifiers).
3. Wire Tauri to frontend build output (`apps/ui/dist`).
4. Confirm a minimal desktop window launches successfully.

Done when:

1. `tauri dev` opens the app window with frontend content.

---

## Phase 2: Frontend Integration for Desktop Mode

Objective:

1. Make UI runtime deterministic for desktop packaging.

Steps:

1. Define desktop-safe API base URL strategy (localhost fixed port).
2. Add build-time/runtime config for web vs desktop modes.
3. Validate HTTP + WebSocket connections from packaged UI.
4. Ensure no dependency on external CDN or remote assets.

Done when:

1. Frontend works in both browser mode and Tauri mode with clear config separation.

---

## Phase 3: Node Backend Sidecar Integration

Objective:

1. Launch and manage backend as sidecar from Tauri lifecycle.

Steps:

1. Build backend (`packages/server/dist`) for distribution.
2. Decide sidecar runtime strategy:
   - bundle Node runtime + server entrypoint, or
   - bundle executable wrapper that launches Node server.
3. Configure Tauri sidecar declaration and startup arguments.
4. Implement startup health check and retry policy.
5. Implement graceful sidecar termination on app exit.

Done when:

1. Packaged app starts sidecar automatically and backend APIs respond.

---

## Phase 4: Runtime Hardening and Security

Objective:

1. Prepare production-safe behavior before App Store submission.

Steps:

1. Enforce localhost bind (`127.0.0.1`) for desktop profile.
2. Minimize Tauri permissions/capabilities.
3. Add explicit sidecar failure handling UI and logs.
4. Validate no prohibited dynamic code/download behavior.
5. Add regression smoke tests for startup/quit cycles.

Done when:

1. App remains stable across repeated launches and sidecar failures are user-visible.

---

## Phase 5: macOS Signing, Sandbox, and App Store Path

Objective:

1. Produce a submission-ready macOS artifact.

Steps:

1. Configure bundle metadata and versioning.
2. Configure signing identities and provisioning profiles.
3. Configure sandbox entitlements with least privilege.
4. Produce release archive and run validation (Xcode Organizer or Transporter).
5. Prepare App Store Connect metadata and review notes.

Done when:

1. Binary validates cleanly and can be submitted to App Store review.

---

## Phase 6: QA and Release Readiness

Objective:

1. Validate user journey and operational reliability.

Steps:

1. Run end-to-end smoke test: launch app -> sidecar up -> logs visible.
2. Verify common failure scenarios:
   - sidecar missing
   - sidecar start failure
   - port already in use
3. Validate upgrade/version behavior.
4. Freeze release checklist for repeatable submissions.

Done when:

1. Team can produce and validate release artifacts with documented repeatable steps.

---

## Risk Register

1. Sidecar + sandbox compatibility issues.
   Mitigation: test signing/sandbox early in Phase 3 instead of waiting for final release.
2. Packaging Node runtime complexity.
   Mitigation: choose one runtime strategy early and automate in scripts.
3. Port conflicts on user machine.
   Mitigation: deterministic fallback strategy and startup diagnostics.
4. App review rejection due to policy mismatch.
   Mitigation: keep review notes explicit about local developer-tool behavior and permissions.

---

## Definition of Done

1. Desktop app launches frontend and Node sidecar reliably.
2. Signed sandboxed macOS build passes validation for App Store submission.
3. Build/release process is documented for new team members.
4. QA checklist is complete and repeatable.
