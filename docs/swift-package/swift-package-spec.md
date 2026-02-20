# Swift Package Spec: API Call Logger

> Last updated: 2026-02-19

This document defines the v1 spec for a Swift Package that captures HTTP request/response data from an app and sends logs to a dev-see log server.

---

## 1. Goals

1. Provide a reusable Swift Package that logs HTTP traffic from iOS/macOS apps.
2. Accept `URLRequest` and `HTTPURLResponse` as primary input types.
3. Send normalized log payloads to the dev-see log server (`POST /api/logs`).
4. Make server endpoint discovery configurable and practical for Simulator + real devices.

## 2. Non-Goals (v1)

1. Full automatic interception of all networking stacks (Alamofire, gRPC, etc.) without integration work.
2. Persisting logs locally when offline.
3. Production analytics/telemetry replacement.

---

## 3. Feasibility: Is `HTTPURLResponse` + `Data` Enough?

Short answer: yes, `HTTPURLResponse` paired with response `Data` is feasible and appropriate for v1 baseline logging.

### 3.1 What `HTTPURLResponse` + response `Data` gives us

1. `statusCode`
2. `allHeaderFields`
3. Response URL (final URL after redirects)
4. MIME type / expected content length metadata
5. Response body bytes via `Data`

### 3.2 What this pair does **not** give us

1. Request start/end timing by itself
2. Transport errors (`URLError`) without separate `Error`
3. Redirect chain details (without extra instrumentation)
4. Request body bytes unless captured separately

### 3.3 Spec decision

1. The logger API will accept `URLRequest`, `HTTPURLResponse?`, and `responseBody: Data?` as core inputs, with `responseBody` expected whenever a response exists.
2. The logger API will also accept optional contextual inputs: `requestBody`, `error`, `startedAt`, `endedAt`, and `taskMetrics`.
3. If the response or response body is unavailable (for example, transport failure), logger still sends a partial-but-valid log.

---

## 4. Package API (v1)

### 4.1 Public surface

```swift
public struct DevSeeLoggerConfiguration {
    public let appId: String
    public let serverURL: URL
    public let apiPath: String // default "/api/logs"
    public let timeout: TimeInterval // default 2s
    public let maxBodyBytes: Int // default 64 * 1024
    public let redactedHeaders: Set<String>
}

public final class DevSeeLogger {
    public init(configuration: DevSeeLoggerConfiguration)

    public func log(
        request: URLRequest,
        response: HTTPURLResponse?,
        requestBody: Data? = nil,
        responseBody: Data? = nil,
        error: Error? = nil,
        startedAt: Date? = nil,
        endedAt: Date = Date(),
        taskMetrics: URLSessionTaskMetrics? = nil
    ) async
}
```

### 4.2 Integration modes

1. Manual mode: call `log(...)` after each request completes.
2. URLSession wrapper mode: optional helper that wraps `URLSession` and logs automatically.
3. Delegate mode (optional in v1.1): use `URLSessionDataDelegate` to collect response body incrementally.

---

## 5. Wire Contract to Log Server

The package POSTs JSON to `POST /api/logs`.

### 5.1 Payload shape

```json
{
  "type": "api_log",
  "appId": "com.example.myapp",
  "method": "GET",
  "url": "https://api.example.com/users/42",
  "statusCode": 200,
  "duration": 124,
  "timestamp": 1760000000123,
  "requestHeaders": {"Accept": "application/json"},
  "requestBody": "{\"id\":42}",
  "responseHeaders": {"content-type": "application/json"},
  "responseBody": "{\"name\":\"Roy\"}",
  "error": null
}
```

### 5.2 Mapping rules

1. `method` from `request.httpMethod` (fallback `"GET"`).
2. `url` from `request.url` if present, else `response.url`.
3. `statusCode` from `response.statusCode`, fallback `0` when unavailable.
4. `duration` from `endedAt - startedAt`; fallback to metrics if provided; fallback `0`.
5. Bodies are UTF-8 strings when possible; otherwise Base64 with a marker (e.g., `"base64:<...>"`).
6. Truncate body content to `maxBodyBytes`.
7. Redact configured sensitive headers (e.g., Authorization, Cookie, Set-Cookie).

---

## 6. Server Discovery: How app finds log server URL + port

## 6.1 Recommended strategy (priority order)

1. Explicit config override (recommended): app passes full server URL at startup.
2. Build-configuration defaults (`DEBUG`): values from xcconfig or scheme env vars.
3. Bonjour discovery (optional): discover `_devsee._tcp` service on local network.
4. Final fallback: `http://localhost:9090` (Simulator only; usually wrong on physical devices).

### 6.2 Why this strategy

1. Explicit config is deterministic and easy to debug.
2. Bonjour is useful but requires iOS local-network permissions and more moving parts.
3. `localhost` only works when app and server share host network namespace (typical in Simulator, not real phone).

### 6.3 Required config fields

```swift
public struct DevSeeEndpoint {
    public let scheme: String // "http" | "https"
    public let host: String
    public let port: Int
}
```

The package should expose a single resolved `serverURL` and log a warning if discovery fails.

---

## 7. File Organization (inside Swift package)

```text
DevSeeLogger/
  Package.swift
  Sources/
    DevSeeLogger/
      DevSeeLogger.swift
      DevSeeLoggerConfiguration.swift
      EndpointResolver.swift
      Models/
        ApiLogEvent.swift
      Encoding/
        LogPayloadEncoder.swift
        HeaderRedactor.swift
      Networking/
        LogTransport.swift
      Utils/
        BodyFormatter.swift
  Tests/
    DevSeeLoggerTests/
      DevSeeLoggerTests.swift
      HeaderRedactorTests.swift
      EndpointResolverTests.swift
      Fixtures/
        sample-request.json
```

Organization principles:

1. Keep transport and model encoding separate from public API.
2. Keep endpoint discovery logic isolated (`EndpointResolver`) so discovery strategies can evolve independently.
3. Keep redaction logic centralized and heavily tested.

---

## 8. Repo Strategy: same repo vs separate repo

Recommendation: use a **separate git repository** for the Swift package.

### 8.1 Why separate repo is better here

1. Independent release/versioning for Swift Package Manager tags.
2. Cleaner CI matrix (Xcode tests) decoupled from this project's Node/Tauri CI.
3. Easier external adoption as a standalone SDK.
4. Lower risk of unrelated changes breaking package releases.

### 8.2 Practical transition plan

1. Start implementation quickly in this repo under `packages/swift/dev-see-logger` if you want fast iteration.
2. Extract to dedicated repo before first public/semver release.
3. Keep server API contract docs in this repo and mirror key parts into SDK repo README.

---

## 9. Security and Privacy Requirements

1. Default redaction list includes `authorization`, `cookie`, `set-cookie`, `x-api-key`.
2. Body logging can be disabled globally (`logBodies = false`).
3. Optional allowlist for domains so only selected hosts are logged.
4. SDK must be clearly marked for development/debug use by default.

---

## 10. Testing Requirements (v1)

1. Unit tests for payload mapping from `URLRequest` + `HTTPURLResponse`.
2. Unit tests for header redaction and body truncation.
3. Unit tests for endpoint resolution priority.
4. Integration test that posts to a mock `POST /api/logs` endpoint and validates JSON payload.

---

## 11. Open Questions

1. Should v1 include automatic `URLProtocol` interception, or only manual/wrapper APIs?
2. Should binary bodies be dropped by default instead of Base64 encoding?
3. Should the SDK queue logs when server is temporarily unavailable?
