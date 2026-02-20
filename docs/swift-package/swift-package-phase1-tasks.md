# Swift Package Phase 1 Tasks

> Based on: `/Users/roy/dev/projects/dev-see/docs/swift-package/swift-package-phase1-plan.md`
> Last updated: 2026-02-20

## 0. Scope Lock (Do First)

- [ ] Confirm Phase 1 constraints are enforced:
  - hard-coded `serverURL` only
  - no server discovery
  - minimal manual logging API only
- [ ] Confirm out-of-scope items are excluded from implementation:
  - automatic interception
  - offline queue/retry
  - advanced metrics/redirect tracing
  - publishing to independent repo

## 1. Package Scaffold (Local Repo)

- [ ] Create local package directory: `/Users/roy/dev/projects/dev-see/packages/swift/dev-see-logger/`
- [ ] Create `Package.swift`.
- [ ] Add library target `DevSeeLogger`.
- [ ] Add test target `DevSeeLoggerTests`.
- [ ] Create source directories:
  - `Sources/DevSeeLogger/Models`
  - `Sources/DevSeeLogger/Networking`
  - `Sources/DevSeeLogger/Encoding`
- [ ] Create test directory: `Tests/DevSeeLoggerTests/`.

## 2. Minimal Public API

- [ ] Add `DevSeeLoggerConfiguration.swift` with:
  - `appId`
  - `serverURL` (user hard-coded)
  - `apiPath` (default `"/api/logs"`)
  - `maxBodyBytes`
- [ ] Add `DevSeeLogger.swift`.
- [ ] Implement async API:
  - `log(request: URLRequest, response: HTTPURLResponse?, responseBody: Data?, requestBody: Data? = nil, error: Error? = nil, startedAt: Date? = nil, endedAt: Date = Date())`
- [ ] Ensure API can be called manually after request completion.

## 3. Payload Model and Mapping

- [ ] Add `Models/ApiLogEvent.swift` matching log server contract for `POST /api/logs`.
- [ ] Map `URLRequest` fields:
  - method
  - url
  - request headers
  - request body (optional)
- [ ] Map `HTTPURLResponse` + `responseBody: Data?` fields:
  - statusCode
  - response headers
  - response body
- [ ] Map metadata fields:
  - timestamp
  - duration (from `startedAt`/`endedAt` when available)
  - appId
  - error string (if present)
- [ ] Normalize body encoding:
  - UTF-8 string when possible
  - fallback marker for non-UTF8/binary
- [ ] Enforce body truncation using `maxBodyBytes`.

## 4. Privacy and Redaction

- [ ] Add `Encoding/HeaderRedactor.swift`.
- [ ] Redact default sensitive headers:
  - `authorization`
  - `cookie`
  - `set-cookie`
  - `x-api-key`
- [ ] Ensure redaction applies to both request and response headers.

## 5. Transport

- [ ] Add `Networking/LogTransport.swift`.
- [ ] Build POST request to `serverURL + apiPath`.
- [ ] Set `Content-Type: application/json`.
- [ ] Encode and send payload JSON.
- [ ] Make sending non-blocking and non-fatal to app flow.
- [ ] On failure, avoid throwing into app call path (debug log only).

## 6. Unit Tests

- [ ] Create `Tests/DevSeeLoggerTests/DevSeeLoggerTests.swift`.
- [ ] Create `Tests/DevSeeLoggerTests/HeaderRedactorTests.swift`.
- [ ] Add mapping tests:
  - request method/url/header/body mapping
  - response status/header/body mapping
  - duration/timestamp mapping
- [ ] Add redaction tests:
  - default sensitive headers are masked
  - non-sensitive headers are preserved
- [ ] Add truncation tests:
  - body over limit is truncated
  - body under limit is unchanged
- [ ] Add transport request tests:
  - endpoint path is `/api/logs`
  - HTTP method is `POST`
  - JSON body is present

## 7. Integration Check (Manual)

- [ ] Add minimal usage snippet in package README.
- [ ] Run local dev-see log server.
- [ ] Integrate package into a small app/test harness with hard-coded server URL.
- [ ] Execute one successful request and call `log(...)`.
- [ ] Verify log appears in dev-see log viewer.
- [ ] Execute one failure request and verify partial/error log behavior.

## 8. Phase 1 Exit Checklist

- [ ] Logger initializes with hard-coded URL/port.
- [ ] Manual `log(...)` call works with `URLRequest + HTTPURLResponse? + Data?`.
- [ ] Server accepts payload at `POST /api/logs`.
- [ ] Sensitive headers are redacted by default.
- [ ] Core tests pass.
- [ ] Minimal README integration guide exists.

## 9. Post-Phase-1 Handoff Tasks (Do Not Start in Phase 1)

- [ ] Create independent git repo for the Swift package.
- [ ] Move package directory to new repo.
- [ ] Add dedicated Swift CI.
- [ ] Tag initial semver release.
