# Swift Package Phase 1 Plan (Minimal)

> Last updated: 2026-02-20

This plan defines the simplest possible Phase 1 for the Swift logging package.

---

## 1. Phase 1 Goal

Ship a working Swift Package that lets app developers log API calls to dev-see by passing:

1. `URLRequest`
2. `HTTPURLResponse?`
3. `responseBody: Data?`

The package sends logs to the log server via `POST /api/logs`.

---

## 2. Phase 1 Constraints

1. Server URL and port are hard-coded by the app developer.
2. No server discovery in Phase 1.
3. Keep API and implementation minimal.
4. Build package in local project directories first.
5. Move to independent git repo only after Phase 1 is stable.

---

## 3. In Scope (Phase 1)

1. Swift Package scaffold in this repo.
2. Public logger API for manual logging calls.
3. JSON payload mapping to current server contract.
4. Header redaction for sensitive headers.
5. Body truncation limit to avoid huge payloads.
6. Basic unit tests for mapping/redaction/transport request creation.
7. Simple usage documentation for app integration.

---

## 4. Out of Scope (Phase 1)

1. Automatic interception (`URLProtocol`, full `URLSession` delegate capture).
2. Bonjour or any dynamic server discovery.
3. Retry queues, offline storage, or guaranteed delivery.
4. Advanced metrics and redirect chain logging.
5. Publishing to standalone repo/package registry.

---

## 5. Local Directory Plan

Implement under this repo first:

```text
/Users/roy/dev/projects/dev-see/packages/swift/dev-see-logger/
```

Suggested structure:

```text
dev-see-logger/
  Package.swift
  Sources/
    DevSeeLogger/
      DevSeeLogger.swift
      DevSeeLoggerConfiguration.swift
      Models/ApiLogEvent.swift
      Networking/LogTransport.swift
      Encoding/HeaderRedactor.swift
  Tests/
    DevSeeLoggerTests/
      DevSeeLoggerTests.swift
      HeaderRedactorTests.swift
```

---

## 6. Implementation Steps

## Step 1: Scaffold package (local)

1. Create package directory and `Package.swift`.
2. Add one library target: `DevSeeLogger`.
3. Add one test target: `DevSeeLoggerTests`.

## Step 2: Minimal public API

1. Add `DevSeeLoggerConfiguration` with:
   - `appId`
   - `serverURL` (hard-coded by user, e.g. `http://192.168.1.20:9090`)
   - `apiPath` default `"/api/logs"`
   - `maxBodyBytes`
2. Add `DevSeeLogger.log(...)` async method.

## Step 3: Payload mapping + transport

1. Map `URLRequest` + `HTTPURLResponse?` + `responseBody: Data?` to server JSON payload.
2. Redact sensitive headers (`authorization`, `cookie`, `set-cookie`, `x-api-key`).
3. Truncate request/response body by configured limit.
4. POST JSON to `serverURL + apiPath`.
5. Fail silently by default (debug print only), so app flow is not blocked.

## Step 4: Tests

1. Verify payload fields are mapped correctly.
2. Verify header redaction behavior.
3. Verify body truncation behavior.
4. Verify transport builds request for `POST /api/logs`.

## Step 5: Integration check

1. Use a small sample app or test harness to call `log(...)`.
2. Confirm logs appear in dev-see viewer through local log server.
3. Document a short integration snippet in package README.

---

## 7. Acceptance Criteria (Phase 1 Done)

1. Developer can initialize logger with hard-coded URL/port.
2. Developer can call `log(...)` after any request completion.
3. Server receives valid payload at `POST /api/logs`.
4. Sensitive headers are redacted.
5. Tests pass for core mapping/redaction/truncation.
6. Minimal README usage example exists.

---

## 8. After Phase 1: Repo Extraction Plan

When acceptance criteria are met:

1. Create independent repo for the Swift package.
2. Move package directory as-is to new repo.
3. Preserve git history if desired (`git subtree` or equivalent).
4. Add dedicated CI for Swift tests.
5. Tag first semver release after migration.

This extraction is intentionally post-Phase-1 to keep initial delivery fast.

---

## 9. Risks and Mitigation

1. Risk: hard-coded `localhost` fails on physical device.
   Mitigation: require explicit host IP in docs for real-device testing.
2. Risk: logging introduces app latency.
   Mitigation: keep send async and non-blocking.
3. Risk: sensitive data leakage.
   Mitigation: enforce default header redaction and body truncation.
