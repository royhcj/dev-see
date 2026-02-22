# Dart Package Plan: Core Logger + Dio Adapter

> Last updated: 2026-02-21

This plan delivers Flutter/Dart logging parity with existing Swift packages:

1. Core logger parity with `dev-see-logger-swift`.
2. First-party Dio adapter parity with `dev-see-logger-moya-swift`.

---

## 1. Milestone Goal

Ship Dart packages that let Flutter apps log API traffic with minimal setup:

1. Configure once via `DevSeeLoggerCenter`.
2. Add `DevSeeLoggerDioInterceptor` to Dio.
3. Receive logs at dev-see server `POST /api/logs`.
4. Preserve endpoint connect state across app restart.

## 2. Problems to Solve

1. Flutter teams currently lack a first-party DevSee logger package.
2. Dio integrations require repeated app-specific interception and timing logic.
3. Apps need consistent payload shape across iOS Swift and Flutter Dart.
4. Endpoint reconnect state should survive restart without app-owned persistence code.

---

## 3. Scope

1. Create `dev_see_logger` core package.
2. Create `dev_see_logger_dio` adapter package with `DevSeeLoggerDioInterceptor`.
3. Support manual logging API and lifecycle helper API.
4. Implement deep-link style endpoint parsing and persistent endpoint restore.
5. Add tests, docs, and example usage for Flutter apps.

## 4. Out of Scope

1. Automatic interception outside Dio.
2. Offline queue/retry storage.
3. Embedded viewer UI.
4. Non-Dio adapters in same milestone (`http`, `chopper`, `graphql`).
5. Multi-endpoint profile switching UX.

---

## 5. Architecture and Packaging

1. Core package (`dev_see_logger`):
   1. Logger, center singleton, config, mapping, transport, redaction, endpoint store.
   2. No dependency on Dio.
2. Adapter package (`dev_see_logger_dio`):
   1. `DevSeeLoggerDioInterceptor`.
   2. Depends on core package + Dio.
3. Both packages live in monorepo and are published independently to pub.dev.

---

## 6. Implementation Steps

## Step 1: Scaffold packages

1. Create package folders and `pubspec.yaml`.
2. Define minimum Dart/Flutter SDK constraints.
3. Add baseline CI/test scripts for both packages.

## Step 2: Build core public API

1. Add `DevSeeLoggerConfiguration`.
2. Add `DevSeeRequestToken`.
3. Add `DevSeeLogger` with:
   1. `log(...)`.
   2. `beginRequest(...)`.
   3. `markRequestStarted(...)`.
   4. `logCompleted(...)`.
   5. `logCompletedDetached(...)`.
   6. `handleUri(...)`.
4. Add `DevSeeLoggerCenter` with `configure`, `shared`, and `handleUri`.

## Step 3: Payload mapping + transport

1. Add `ApiLogEvent` model and JSON encoding.
2. Implement request/response/body normalization rules.
3. Implement truncation and header redaction.
4. Implement `LogTransport` HTTP POST send to `/api/logs`.
5. Ensure logger send failures do not break app networking flow.

## Step 4: Request lifecycle tracking

1. Track started-at times keyed by request signature and optional token.
2. Resolve completion started-at via token first, fallback to request-key queue.
3. Validate concurrency handling for identical in-flight requests.

## Step 5: Endpoint connect + persistence

1. Parse DevSee connect URI (`server_ip`, `server_port`).
2. Validate host and port range.
3. Persist valid endpoint to storage.
4. Restore remembered endpoint at center/logger startup.
5. Enforce precedence and invalid-value fallback rules.

## Step 6: Dio adapter

1. Implement `DevSeeLoggerDioInterceptor`.
2. Hook request start in `onRequest`.
3. Hook success/failure logging in `onResponse`/`onError`.
4. Provide fallback request extraction for error edge cases.
5. Keep interceptor transparent to existing handler chain.

## Step 7: Docs + examples

1. Add README for both packages.
2. Add Flutter integration examples:
   1. center configure.
   2. Dio interceptor registration.
   3. URI/deep-link handling hook.
3. Add migration notes for manual app-specific interceptors.

---

## 7. Acceptance Criteria

1. Flutter app can add package(s) via pubspec and compile successfully.
2. `DevSeeLoggerDioInterceptor` captures success and error responses.
3. Core package compiles and functions without Dio dependency.
4. Log payload contract matches Swift field semantics.
5. Request body fallback precedence works (`requestBody` arg, then `request.data`).
6. Sensitive headers are redacted by default.
7. Endpoint connect state persists and restores after app restart.
8. Unit tests pass for core and adapter packages.

---

## 8. Risks and Mitigation

1. Risk: Flutter persistence plugin introduces platform constraints.
   Mitigation: keep endpoint store behind interface and support in-memory fallback for tests/non-Flutter.
2. Risk: Request identity mismatch in concurrent Dio calls.
   Mitigation: maintain token-based primary path and request-key queue fallback with dedicated tests.
3. Risk: Payload inconsistencies versus Swift packages.
   Mitigation: keep explicit contract table and parity tests with fixture snapshots.
4. Risk: Interceptor side effects on app flow.
   Mitigation: fail-open behavior and strict handler continuation in all branches.

---

## 9. Milestone Exit and Next Step

When acceptance criteria are met:

1. Publish initial package versions to pub.dev.
2. Add CI matrix for Flutter stable + latest.
3. Evaluate next adapter package priority (`http` middleware) based on adopter usage.
