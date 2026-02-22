# QR Code Connection Tasks

> Based on: `/Users/roy/dev/projects/dev-see/docs/connection/qrcode-connection-plan.md`
> Last updated: 2026-02-20

## 0. Scope Lock

- [x] Confirm implementation follows explicit override strategy only (no Bonjour in this scope).
- [x] Confirm deep link contract is fixed to:
  - `dev-see-<bundle-id>://connect?server_ip=<ip-or-host>&server_port=<port>`
- [x] Confirm `server_ip` + `server_port` are required params.

## 1. Frontend: Connect App Entry

- [x] Add top-right `Connect App` button in frontend app shell.
- [x] Ensure button is visible on primary QA workflow screen.
- [x] Add open/close state for connection modal.

## 2. Frontend: Connect Modal and Validation

- [x] Build modal UI with:
  - bundle id input
  - readonly server host/IP
  - readonly server port
  - deep link preview
  - QR code area
- [x] Add bundle id validation (required, non-empty, supported characters).
- [x] Add server host/port validation guard before QR generation.
- [x] Add clear error messages for invalid inputs.
- [x] Add deep link copy button.

## 3. Frontend: Deep Link Builder + QR

- [x] Implement utility to build deep link string from `bundleId`, `serverHost`, and `serverPort`.
- [x] Ensure query values are URL-encoded.
- [x] Recompute link/QR reactively when values change.
- [x] Render QR from deep link text.
- [x] Add fallback UI if QR generation fails.

## 4. Swift Package: URL Handler API

- [x] Add public `handleUrl(_ url: URL) -> DevSeeConnectionResult`.
- [x] Add/confirm connection result model:
  - `.connected(endpoint:)`
  - `.ignored`
  - `.failed(reason:)`
- [x] Parse action `connect` from deep link.
- [x] Parse `server_ip` and `server_port` query params.
- [x] Validate port range `1...65535`.
- [x] Validate host presence and supported format.
- [x] Build endpoint and apply logger server override.
- [x] Ignore unsupported scheme/action safely.

## 5. Swift Package: Tests

- [x] Add test: valid deep link returns `.connected`.
- [x] Add test: missing `server_ip` returns `.failed`.
- [x] Add test: missing `server_port` returns `.failed`.
- [x] Add test: invalid port (`0`, `65536`, non-number) returns `.failed`.
- [x] Add test: wrong scheme/action returns `.ignored`.
- [x] Add test: endpoint override is applied after successful parse.

## 6. iOS App Integration

- [ ] Register URL scheme in `Info.plist`:
  - `dev-see-<actual-bundle-id>`
- [ ] Wire `scene(_:openURLContexts:)` to call package `handleUrl(_:)`.
- [ ] Wire `application(_:open:options:)` if needed for app lifecycle coverage.
- [ ] Map connection results to UX:
  - success confirmation
  - actionable failure message

## 7. Environment and Networking

- [ ] Ensure backend/log server listens on `0.0.0.0` (LAN reachable), not only `127.0.0.1`.
- [ ] Verify QA Mac firewall allows inbound on selected port.
- [ ] Verify iPhone and Mac are on same LAN.
- [ ] Verify ATS configuration allows selected protocol (`https` preferred or QA HTTP exception).

## 8. Manual QA Scenarios

- [ ] Happy path: generate QR, scan, app opens, endpoint connected.
- [ ] Send sample request and confirm backend receives log/API payload.
- [ ] Invalid bundle id input path in frontend.
- [ ] Invalid port deep link path in iOS.
- [ ] Missing params deep link path in iOS.
- [ ] Unreachable host path (connection fails with clear error).

## 9. Documentation Updates

- [ ] Add short integration snippet for iOS URL forwarding.
- [ ] Add QA quickstart steps (Mac + iPhone).
- [ ] Add troubleshooting section:
  - app not opening from QR
  - cannot reach backend
  - ATS/network permission issues

## 10. Exit Checklist

- [ ] QR connection flow works on real iPhone.
- [ ] Swift package `handleUrl(_:)` API is documented and tested.
- [ ] Backend receives traffic after deep link connection.
- [ ] Error states are user-readable and safe.
