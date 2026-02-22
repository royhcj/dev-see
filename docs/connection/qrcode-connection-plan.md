# QR Code Connection Implementation Plan

> Based on: `/Users/roy/dev/projects/dev-see/docs/connection/qrcode-connection-spec.md`
> Last updated: 2026-02-20

## Overview

Implement a QR-based connection flow so QA can configure iOS app -> QA Mac backend endpoint with one scan.

Primary strategy: explicit endpoint override via deep link.

---

## Scope

In scope:

1. Frontend connect modal and QR generation.
2. Deep link data contract.
3. Swift package URL handler for endpoint update.
4. iOS app integration glue for URL forwarding.
5. Validation and user-facing error states.

Out of scope:

1. Bonjour discovery.
2. Secure signing/crypto verification of deep link payload.
3. Remote tunnel support.

---

## Implementation Strategy

Deliver in small, testable phases:

1. Deep link schema and shared validation rules.
2. Frontend `Connect App` UX + QR generation.
3. Swift package `handleUrl(_:)` and endpoint update path.
4. iOS host app wiring for URL callbacks.
5. Manual QA validation on real device and regression checks.

---

## Proposed Touchpoints

Likely frontend areas:

1. Top action/header component where `Connect App` will live.
2. Modal/dialog component for bundle id + QR.
3. Connection utility module to build deep link string.

Likely Swift package areas:

1. `EndpointResolver` and config model.
2. Public logger API surface for URL handling.
3. Unit tests for parsing and validation.

Likely iOS app areas:

1. `Info.plist` URL scheme registration.
2. Scene/app delegate URL open callbacks.
3. UX handler for success/failure messaging.

---

## Phase Plan

## Phase 1: Contract + Validation Rules

Tasks:

1. Finalize deep link format:
   - `dev-see-<bundle-id>://connect?server_ip=<ip-or-host>&server_port=<port>`
2. Define strict validation rules:
   - non-empty bundle id
   - host required
   - port integer `1...65535`
3. Define parsing behavior for unsupported links (`ignored` vs `failed`).

Done when:

1. One canonical contract exists in docs and tests.

## Phase 2: Frontend Connect UI + QR

Tasks:

1. Add `Connect App` button in top-right.
2. Implement modal with:
   - bundle id input
   - resolved server host and port display
   - deep link preview + copy
   - QR code render
3. Add client-side validation and friendly error text.
4. Recompute deep link/QR on input change.

Done when:

1. User can generate valid deep link QR in < 10 seconds.
2. Invalid input never generates malformed deep link.

## Phase 3: Swift Package URL Handling

Tasks:

1. Add public `handleUrl(_:)` entry point.
2. Parse and validate incoming deep link.
3. Resolve endpoint and update logger target.
4. Return typed result:
   - connected
   - ignored
   - failed(reason)
5. Add unit tests for valid/invalid/unsupported links.

Done when:

1. Package can consume the QR deep link end-to-end in tests.

## Phase 4: iOS App Wiring

Tasks:

1. Register custom scheme in `Info.plist`.
2. Wire URL callbacks to package `handleUrl(_:)`.
3. Show user-visible success/failure feedback.
4. Optionally persist chosen endpoint for next app launch.

Done when:

1. Real-device scan launches app and endpoint config is applied.

## Phase 5: QA Validation + Hardening

Tasks:

1. Run manual same-LAN test (Mac + iPhone).
2. Verify at least one request/log reaches QA Mac backend.
3. Verify error scenarios:
   - invalid port
   - missing params
   - unreachable host
   - ATS HTTP block
4. Add troubleshooting section to docs.

Done when:

1. Acceptance criteria in spec are satisfied on a real iPhone.

---

## Risks and Mitigation

1. Risk: URL scheme mismatch between QR and app registration.
   Mitigation: derive scheme from exact entered bundle id and display copyable preview.
2. Risk: backend not reachable from phone.
   Mitigation: explicit LAN instructions (`0.0.0.0`, firewall, same Wi-Fi).
3. Risk: HTTP blocked by ATS.
   Mitigation: document QA ATS exceptions or move to HTTPS.
4. Risk: malformed or unexpected deep links.
   Mitigation: strict parser + safe failure path + structured error.

---

## Definition of Done

1. Frontend generates QR for validated deep link.
2. iOS app launches from QR scan and forwards URL.
3. Swift package parses URL and updates endpoint.
4. Logger traffic reaches QA Mac backend from physical device.
5. Tests cover core parser/validator behaviors.
6. Docs include setup and troubleshooting notes.
