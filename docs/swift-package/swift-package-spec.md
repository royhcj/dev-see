# Swift Package Spec: API Call Logger

> Last updated: 2026-02-21

This document defines the v1 baseline plus the v1.1 integration ergonomics update for the DevSee Swift SDK.

---

## 1. Goals

1. Provide a reusable Swift Package that logs HTTP traffic from iOS/macOS apps.
2. Keep integration code in host apps minimal and framework-specific glue optional.
3. Keep core package free of non-essential dependencies (for example, Moya).
4. Send normalized log payloads to the dev-see log server (`POST /api/logs`).
5. Persist the last successful connection endpoint (IP + port) and restore it after app restart.

## 2. Non-Goals

1. Full automatic interception of all networking stacks without integration work.
2. Persisting logs locally when offline.
3. Production analytics/telemetry replacement.
4. Multi-endpoint profile management or endpoint sync across devices.

---

## 3. Core Inputs and Feasibility

Short answer: `URLRequest` + `HTTPURLResponse?` + body `Data?` is enough for v1 baseline logging.

### 3.1 What these inputs provide

1. Method, URL, request headers.
2. Response status and headers.
3. Request and response body bytes.
4. App-supplied timing and errors.

### 3.2 What they do not provide by themselves

1. Start time unless explicitly tracked.
2. Redirect chain details.
3. Metrics unless separately captured.

### 3.3 Spec decision

1. `responseBody` remains explicit.
2. `requestBody` is optional override and defaults to `request.httpBody` when omitted.
3. If response/responseBody is missing (for example, transport failure), logger still emits a partial valid event.

---

## 4. Public API

### 4.1 Core types

```swift
public struct DevSeeLoggerConfiguration {
    public let appId: String
    public let serverURL: URL
    public let apiPath: String // default "/api/logs"
    public let maxBodyBytes: Int // default 64 * 1024
}

public struct DevSeeRequestToken: Hashable, Sendable {
    public let rawValue: UUID
}
```

### 4.2 Logger and center

```swift
public final class DevSeeLogger {
    public init(configuration: DevSeeLoggerConfiguration)

    public func beginRequest(_ request: URLRequest, at: Date = Date()) -> DevSeeRequestToken

    public func log(
        request: URLRequest,
        response: HTTPURLResponse?,
        responseBody: Data? = nil,
        requestBody: Data? = nil, // if nil, fallback to request.httpBody
        error: Error? = nil,
        startedAt: Date? = nil,
        endedAt: Date = Date()
    ) async

    public func logCompleted(
        token: DevSeeRequestToken?,
        request: URLRequest,
        response: HTTPURLResponse?,
        responseBody: Data? = nil,
        requestBody: Data? = nil,
        error: Error? = nil,
        endedAt: Date = Date()
    ) async

    @discardableResult
    public func handleURL(_ url: URL) -> DevSeeConnectionResult
}

public enum DevSeeLoggerCenter {
    public static func configure(_ configuration: DevSeeLoggerConfiguration)
    public static var shared: DevSeeLogger { get }
    @discardableResult public static func handleURL(_ url: URL) -> Bool
}
```

### 4.3 Integration modes

1. Manual mode: app calls `log(...)` directly.
2. Tokenized lifecycle mode: integration calls `beginRequest` and then `logCompleted`.
3. Adapter mode: package-provided plugin/wrapper for specific networking frameworks.

### 4.4 Connection endpoint persistence

1. On successful `handleURL(_:)` connection parsing, the SDK must persist endpoint host and port.
2. Persisted endpoint storage must survive app restart (default implementation: `UserDefaults`).
3. On logger initialization (`DevSeeLoggerCenter.shared` and `configure(_:)`), the SDK must restore persisted endpoint when available and valid.
4. Restore precedence:
   1. valid persisted endpoint from last successful connection.
   2. configured `serverURL` fallback.
   3. package default server URL fallback (`http://127.0.0.1:9090`).
5. If persisted data is missing/invalid/corrupted, SDK must ignore it and continue with fallback URL without throwing.
6. Endpoint persistence is limited to host/port for DevSee connection use-cases (no auth/token persistence).

---

## 5. Adapter Packaging and Optional Dependencies

### 5.1 Dependency rule

1. `DevSeeLogger` core must not depend on Moya.
2. Moya integration ships as a separate adapter package/product.

### 5.2 Package split

1. Core: `DevSeeLogger` (no Moya dependency).
2. Adapter: `DevSeeLoggerMoya` (depends on `DevSeeLogger` + `Moya`).

### 5.3 Consumer impact

1. Projects not using Moya import only `DevSeeLogger`.
2. Projects using Moya optionally add `DevSeeLoggerMoya` and use `DevSeeLoggerMoyaPlugin`.

---

## 6. Wire Contract to Log Server

SDK posts JSON to `POST /api/logs`.

### 6.1 Payload shape

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

### 6.2 Mapping rules

1. `method` from `request.httpMethod` (fallback `"GET"`).
2. `url` from `request.url` if present, else `response.url`.
3. `statusCode` from `response.statusCode`, fallback `599` when unavailable.
4. `duration` from `endedAt - startedAt`, fallback `0`.
5. Request body resolution order:
   1. explicit `requestBody` argument.
   2. `request.httpBody`.
   3. `nil`.
6. Bodies are UTF-8 strings when possible; otherwise `base64:<...>`.
7. Truncate request/response bodies to `maxBodyBytes`.
8. Redact sensitive headers by default (`authorization`, `cookie`, `set-cookie`, `x-api-key`).

---

## 7. Reference Moya Integration

1. App configures shared center once:

```swift
DevSeeLoggerCenter.configure(
    DevSeeLoggerConfiguration(
        appId: Bundle.main.bundleIdentifier ?? "com.example.app",
        serverURL: URL(string: "http://127.0.0.1:9090")!
    )
)
```

2. App creates provider with package plugin:

```swift
let provider = MoyaProvider<MyAPI>(plugins: [DevSeeLoggerMoyaPlugin()])
```

3. App deep-link handling:

```swift
if DevSeeLoggerCenter.handleURL(url) {
    return true
}
```

---

## 8. File Organization

```text
DevSeeLogger/
  Package.swift
  Sources/DevSeeLogger/
    DevSeeLogger.swift
    DevSeeLoggerCenter.swift
    DevSeeEndpointStore.swift
    DevSeeRequestTracker.swift
    DevSeeLoggerConfiguration.swift
    Models/ApiLogEvent.swift
    Networking/LogTransport.swift
    Encoding/HeaderRedactor.swift
  Tests/DevSeeLoggerTests/
    DevSeeLoggerTests.swift
    DevSeeRequestTrackerTests.swift
    HeaderRedactorTests.swift

DevSeeLoggerMoya/
  Package.swift
  Sources/DevSeeLoggerMoya/
    DevSeeLoggerMoyaPlugin.swift
  Tests/DevSeeLoggerMoyaTests/
    DevSeeLoggerMoyaPluginTests.swift
```

---

## 9. Security and Privacy Requirements

1. SDK is development/debug-focused by default.
2. Sensitive headers are redacted by default.
3. Body size is truncated using `maxBodyBytes`.
4. Body logging can be disabled in future if required by adopters.

---

## 10. Testing Requirements

1. Unit tests for payload mapping and body fallback (`requestBody ?? request.httpBody`).
2. Unit tests for header redaction and truncation.
3. Unit tests for lifecycle tracking (`beginRequest` + `logCompleted`).
4. Concurrency tests for multiple in-flight identical requests.
5. Integration test for `POST /api/logs`.
6. Adapter tests for `DevSeeLoggerMoyaPlugin`.

---

## 11. Open Questions

1. Should we also ship `DevSeeLoggerAlamofire` in v1.2?
2. Should the center support multiple named logger instances for multi-environment apps?
3. Should non-UTF8 request/response bodies be dropped instead of Base64 encoded?
