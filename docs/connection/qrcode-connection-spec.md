# QR Code App Connection Spec (iOS + QA Mac)

> Last updated: 2026-02-20

## 1. Feasibility

This approach is feasible and practical for QA testing.

It uses explicit endpoint configuration (recommended in `EndpointResolver` strategy) and avoids fragile auto-discovery dependencies.

---

## 2. Goal

Allow a QA tester to:

1. Run backend/log server on their Mac.
2. Scan a QR code from the frontend app.
3. Launch the iOS app via deep link.
4. Auto-configure the app to send logs/API traffic to the QA Mac backend.

---

## 3. Scope (v1)

In scope:

1. Frontend "Connect App" flow and QR code generation.
2. Deep link contract with host/port payload.
3. Swift package API: `handleUrl(_:)` to parse and apply endpoint config.
4. Validation, error handling, and success/failure UX.

Out of scope:

1. Bonjour/mDNS discovery.
2. Authentication/encryption of deep link payload.
3. Multi-endpoint profiles and long-term config sync.

---

## 4. End-to-End User Flow

1. User clicks `Connect App` in frontend (top-right action).
2. Popup prompts for iOS app bundle id (example: `com.example.app`).
3. Frontend builds deep link:
   - `dev-see-com.example.app://connect?server_ip=[SERVER_IP]&server_port=[PORT]`
4. Frontend renders QR code from this deep link.
5. QA scans QR with iPhone Camera (or QR scanner app).
6. iOS app opens from deep link.
7. App calls Swift package `handleUrl(_:)`.
8. Package validates data, resolves server URL, and updates logger endpoint.
9. App displays result to user (connected or error).

---

## 5. Deep Link Contract

## 5.1 URL format

```text
dev-see-<bundle-id>://connect?server_ip=<ip-or-host>&server_port=<port>
```

Example:

```text
dev-see-com.example.app://connect?server_ip=192.168.1.23&server_port=9090
```

## 5.2 Rules

1. Scheme is `dev-see-` + bundle id entered by user.
2. Path/host action is `connect`.
3. Required query params:
   - `server_ip`
   - `server_port`
4. `server_port` must be integer `1...65535`.
5. `server_ip` accepts IPv4 or hostname for v1.

## 5.3 iOS registration requirement

The iOS app must register matching custom URL scheme in `Info.plist`:

1. `CFBundleURLTypes`
2. `CFBundleURLSchemes` includes `dev-see-<actual-bundle-id>`

---

## 6. Frontend Requirements

1. Add top-right `Connect App` button.
2. Show modal with:
   - bundle id input (required)
   - readonly detected server host/IP
   - readonly server port
   - generated deep link preview
   - QR code output
3. Validate bundle id before generating deep link.
4. Allow regenerate when host/port or bundle id changes.
5. Show copy button for deep link text.
6. Show helper text:
   - iPhone must be on same LAN as QA Mac.
   - backend must listen on LAN interface (`0.0.0.0`), not only `127.0.0.1`.

---

## 7. Swift Package Requirements

Add API:

```swift
public func handleUrl(_ url: URL) -> DevSeeConnectionResult
```

Supporting types (suggested):

```swift
public struct DevSeeEndpoint {
    public let scheme: String
    public let host: String
    public let port: Int
}

public enum DevSeeConnectionResult {
    case connected(endpoint: DevSeeEndpoint)
    case ignored
    case failed(reason: String)
}
```

Behavior:

1. Ignore URLs with unsupported scheme/action.
2. Parse `server_ip` and `server_port`.
3. Validate and create endpoint (`http` default for v1).
4. Update logger configuration in memory.
5. Return structured result for app UI/telemetry.

---

## 8. App Integration Requirements (iOS host app)

1. Forward incoming URLs to Swift package:
   - `scene(_:openURLContexts:)` and/or `application(_:open:options:)`
2. On `.connected`, show confirmation (toast/banner/screen).
3. On `.failed`, show actionable error text.
4. Persist endpoint if app wants connection to survive relaunch (app-level decision).

---

## 9. Backend/Environment Requirements

1. Backend/log server listens on QA Mac LAN-reachable interface.
2. QA Mac firewall allows incoming traffic on selected port.
3. iPhone and Mac are on same network segment.
4. ATS config supports chosen transport:
   - `https` preferred, or
   - explicit `http` exception for QA environment.

---

## 10. Error Handling

Frontend errors:

1. Empty/invalid bundle id.
2. Missing server host/port.
3. QR generation failure.

iOS/package errors:

1. Deep link missing required params.
2. Invalid port.
3. Invalid host.
4. Unsupported action/path.

Runtime connection errors:

1. Backend unreachable.
2. Timeout/refused connection.
3. ATS blocked cleartext HTTP.

---

## 11. Acceptance Criteria

1. User can generate QR from bundle id in frontend.
2. Scanning QR opens target iOS app.
3. iOS app calls package `handleUrl(_:)`.
4. Package resolves endpoint and updates logger target.
5. App can send at least one log/API payload to QA Mac backend after connection.
6. Invalid deep links fail safely with clear error messaging.

---

## 12. Future Enhancements (Post-v1)

1. Add optional signature token in deep link to reduce tampering.
2. Add HTTPS and certificate pinning options.
3. Add "Test Connection" ping step after deep link handling.
4. Add recent endpoint history + quick switch UI.
