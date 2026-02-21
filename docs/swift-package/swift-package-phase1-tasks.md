# Swift Package Phase 1 Tasks

> Based on: `/Users/roy/dev/projects/dev-see/docs/swift-package/swift-package-phase1-plan.md`
> Last updated: 2026-02-21

## 0. Scope Lock (Do First)

- [x] Confirm Phase 1 constraints are enforced:
  - hard-coded `serverURL` only
  - no server discovery
  - minimal manual logging API only
- [x] Confirm out-of-scope items are excluded from implementation:
  - automatic interception
  - offline queue/retry
  - advanced metrics/redirect tracing
  - publishing to independent repo

## 1. Package Scaffold (Local Repo)

- [x] Create local package directory: `/Users/roy/dev/projects/dev-see/packages/swift/dev-see-logger/`
- [x] Create `Package.swift`.
- [x] Add library target `DevSeeLogger`.
- [x] Add test target `DevSeeLoggerTests`.
- [x] Create source directories:
  - `Sources/DevSeeLogger/Models`
  - `Sources/DevSeeLogger/Networking`
  - `Sources/DevSeeLogger/Encoding`
- [x] Create test directory: `Tests/DevSeeLoggerTests/`.

## 2. Minimal Public API

- [x] Add `DevSeeLoggerConfiguration.swift` with:
  - `appId`
  - `serverURL` (user hard-coded)
  - `apiPath` (default `"/api/logs"`)
  - `maxBodyBytes`
- [x] Add `DevSeeLogger.swift`.
- [x] Implement async API:
  - `log(request: URLRequest, response: HTTPURLResponse?, responseBody: Data?, requestBody: Data? = nil, error: Error? = nil, startedAt: Date? = nil, endedAt: Date = Date())`
- [x] Ensure API can be called manually after request completion.

## 3. Payload Model and Mapping

- [x] Add `Models/ApiLogEvent.swift` matching log server contract for `POST /api/logs`.
- [x] Map `URLRequest` fields:
  - method
  - url
  - request headers
  - request body (optional)
- [x] Map `HTTPURLResponse` + `responseBody: Data?` fields:
  - statusCode
  - response headers
  - response body
- [x] Map metadata fields:
  - timestamp
  - duration (from `startedAt`/`endedAt` when available)
  - appId
  - error string (if present)
- [x] Normalize body encoding:
  - UTF-8 string when possible
  - fallback marker for non-UTF8/binary
- [x] Enforce body truncation using `maxBodyBytes`.

## 4. Privacy and Redaction

- [x] Add `Encoding/HeaderRedactor.swift`.
- [x] Redact default sensitive headers:
  - `authorization`
  - `cookie`
  - `set-cookie`
  - `x-api-key`
- [x] Ensure redaction applies to both request and response headers.

## 5. Transport

- [x] Add `Networking/LogTransport.swift`.
- [x] Build POST request to `serverURL + apiPath`.
- [x] Set `Content-Type: application/json`.
- [x] Encode and send payload JSON.
- [x] Make sending non-blocking and non-fatal to app flow.
- [x] On failure, avoid throwing into app call path (debug log only).

## 6. Unit Tests

- [x] Create `Tests/DevSeeLoggerTests/DevSeeLoggerTests.swift`.
- [x] Create `Tests/DevSeeLoggerTests/HeaderRedactorTests.swift`.
- [x] Add mapping tests:
  - request method/url/header/body mapping
  - response status/header/body mapping
  - duration/timestamp mapping
- [x] Add redaction tests:
  - default sensitive headers are masked
  - non-sensitive headers are preserved
- [x] Add truncation tests:
  - body over limit is truncated
  - body under limit is unchanged
- [x] Add transport request tests:
  - endpoint path is `/api/logs`
  - HTTP method is `POST`
  - JSON body is present

## 7. Integration Check (Manual)

- [x] Add minimal usage snippet in package README.
- [x] Run local dev-see log server.
- [x] Integrate package into a small app/test harness with hard-coded server URL.
- [x] Execute one successful request and call `log(...)`.
- [x] Verify log appears in dev-see log viewer.
- [x] Execute one failure request and verify partial/error log behavior.

## 8. Phase 1 Exit Checklist

- [x] Logger initializes with hard-coded URL/port.
- [x] Manual `log(...)` call works with `URLRequest + HTTPURLResponse? + Data?`.
- [ ] Server accepts payload at `POST /api/logs`.
- [x] Sensitive headers are redacted by default.
- [x] Core tests pass.
- [x] Minimal README integration guide exists.

## 9. Post-Phase-1 Handoff Tasks (Do Not Start in Phase 1)

- [x] Create independent git repo for the Swift package.
- [x] Move package directory to new repo.
- [ ] Add dedicated Swift CI.
- [x] Tag initial semver release.

## 10. Phase 1.1 Scope Lock (Integration Ergonomics)

- [ ] Confirm this milestone is additive and backward-compatible for existing `log(...)` callers.
- [ ] Confirm Moya remains an optional dependency (no Moya import/dependency in core package target).
- [ ] Confirm no automatic interception work is included.

## 11. Core: Center + Lifecycle APIs

- [ ] Add `DevSeeLoggerCenter` to core package.
- [ ] Add `DevSeeLoggerCenter.configure(_:)`.
- [ ] Add `DevSeeLoggerCenter.shared`.
- [ ] Add `DevSeeLoggerCenter.handleURL(_:)`.
- [ ] Add `DevSeeRequestToken` public type.
- [ ] Add `DevSeeLogger.beginRequest(_:, at:) -> DevSeeRequestToken`.
- [ ] Add `DevSeeLogger.logCompleted(token:request:response:responseBody:requestBody:error:endedAt:)`.
- [ ] Ensure lifecycle state is thread-safe and supports multiple concurrent identical requests.

## 12. Core: Request Body Fallback

- [ ] Update event mapping so request body resolution order is:
  - explicit `requestBody` argument
  - `request.httpBody`
  - `nil`
- [ ] Keep existing `log(...)` signature available.
- [ ] Document fallback behavior in API docs and README.

## 13. Adapter Packaging: Moya

- [ ] Create adapter package/product `DevSeeLoggerMoya`.
- [ ] Add dependency from adapter to `DevSeeLogger`.
- [ ] Add dependency from adapter to `Moya`.
- [ ] Implement `DevSeeLoggerMoyaPlugin` using `DevSeeLoggerCenter` + lifecycle APIs.
- [ ] Ensure plugin handles success and failure paths, including missing response cases.
- [ ] Ensure core target remains buildable without Moya.

## 14. Tests for Phase 1.1

- [ ] Add core tests for `DevSeeLoggerCenter` configure/shared behavior.
- [ ] Add core tests for lifecycle tracking (`beginRequest` + `logCompleted`).
- [ ] Add concurrency tests for identical in-flight request shapes.
- [ ] Add mapping tests for request body fallback precedence.
- [ ] Add adapter tests for `DevSeeLoggerMoyaPlugin` success flow.
- [ ] Add adapter tests for `DevSeeLoggerMoyaPlugin` failure flow.

## 15. Documentation + Migration

- [ ] Update spec doc with package split and optional dependency rationale.
- [ ] Add "Core-only" integration snippet.
- [ ] Add "Moya integration" snippet using `DevSeeLoggerMoyaPlugin`.
- [ ] Add deep-link setup snippet using `DevSeeLoggerCenter.handleURL`.
- [ ] Add migration guide from custom app plugin to package-provided plugin.

## 16. Exit Checklist for Phase 1.1

- [ ] Core package exposes center + lifecycle APIs.
- [ ] Moya adapter package is available and optional.
- [ ] Existing manual integration API still works.
- [ ] Tests pass for core and adapter modules.
- [ ] README/docs provide clear before/after integration examples.
