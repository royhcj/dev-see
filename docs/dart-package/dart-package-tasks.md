# Dart Package Tasks: Core Logger + Dio Adapter

> Based on: `/Users/roy/dev/projects/dev-see/docs/dart-package/dart-package-plan.md`
> Last updated: 2026-02-21

## 0. Scope Lock (Do First)

- [x] Confirm milestone includes only core logger + Dio adapter.
- [x] Confirm out-of-scope items stay excluded:
  - offline queue/retry
  - embedded viewer UI
  - non-Dio adapters
  - endpoint profile switching

## 1. Package Scaffold

- [x] Create core package directory: `/Users/roy/dev/projects/dev-see/packages/dart/dev-see-logger-dart/`.
- [x] Create adapter package directory: `/Users/roy/dev/projects/dev-see/packages/dart/dev-see-logger-dio-dart/`.
- [x] Add `pubspec.yaml` for both packages.
- [x] Add SDK constraints and base dependencies.
- [x] Add package exports:
  - core: `lib/dev_see_logger.dart`
  - dio adapter: `lib/dev_see_logger_dio.dart`

## 2. Core Public API

- [x] Add `DevSeeLoggerConfiguration`:
  - `appId`
  - `serverUri`
  - `apiPath` default `/api/logs`
  - `maxBodyBytes`
- [x] Add `DevSeeRequestToken`.
- [x] Add `DevSeeConnectionResult` model (`connected`, `ignored`, `failed`).
- [x] Add `DevSeeLoggerCenter`:
  - `configure(...)`
  - `shared`
  - `handleUri(...)`
- [x] Add `DevSeeLogger` methods:
  - `log(...)`
  - `beginRequest(...)`
  - `markRequestStarted(...)`
  - `logCompleted(...)`
  - `logCompletedDetached(...)`
  - `handleUri(...)`

## 3. Payload Model + Mapping

- [x] Add `ApiLogEvent` model matching server contract for `POST /api/logs`.
- [x] Map request fields from `RequestOptions`:
  - method
  - URL
  - request headers
  - request body
- [x] Map response fields:
  - statusCode
  - response headers
  - response body
- [x] Map metadata:
  - timestamp
  - duration
  - appId
  - error string
- [x] Add body encoding rules:
  - UTF-8 string or JSON text when possible
  - `base64:<...>` for binary
  - truncation marker when bytes exceed `maxBodyBytes`
- [x] Implement request body precedence:
  - explicit `requestBody` argument
  - `request.data`
  - `null`

## 4. Privacy + Redaction

- [x] Add `HeaderRedactor`.
- [x] Redact default sensitive headers:
  - `authorization`
  - `cookie`
  - `set-cookie`
  - `x-api-key`
- [x] Ensure redaction applies to request and response headers.

## 5. Transport

- [x] Add `LogTransport` and interface abstraction.
- [x] Send JSON to `serverUri + apiPath`.
- [x] Set `Content-Type: application/json`.
- [x] Keep send errors non-fatal to app request flow.
- [x] Add unit-testable request construction path.

## 6. Request Lifecycle Tracking

- [x] Add request-key tracking map for started timestamps.
- [x] Add token-to-startedAt tracking map.
- [x] Implement token-first completion lookup.
- [x] Implement request-key FIFO fallback for completion lookup.
- [x] Ensure thread-safe/concurrency-safe access for async logging.

## 7. Endpoint Connect + Persistence

- [x] Add endpoint store abstraction (`load`, `save`, `clear`).
- [ ] Add default persisted store (SharedPreferences-backed).
- [x] Parse connect URI:
  - scheme prefix `dev-see-`
  - action `connect`
  - query params `server_ip`, `server_port`
- [x] Validate and apply endpoint host/port.
- [x] Persist endpoint only on successful connect.
- [x] Restore endpoint on logger/center bootstrap.
- [x] Apply precedence:
  - remembered endpoint
  - configured server URI
  - default `http://127.0.0.1:9090`
- [x] Ignore/clear malformed stored values safely.

## 8. Dio Adapter Package

- [x] Add dependency on core package + Dio.
- [x] Implement `DevSeeLoggerDioInterceptor`.
- [x] `onRequest`: call `markRequestStarted(...)`.
- [x] `onResponse`: call `logCompletedDetached(...)` with response data.
- [x] `onError`: call `logCompletedDetached(...)` with error/response fallback.
- [x] Ensure interceptor always continues handler chain.
- [x] Ensure adapter package exports only intended public symbols.

## 9. Tests: Core

- [x] Add `dev_see_logger_test.dart`.
- [x] Add `dev_see_logger_center_test.dart`.
- [x] Add `dev_see_endpoint_store_test.dart`.
- [x] Add `header_redactor_test.dart`.
- [x] Add mapping tests:
  - request + response field mapping
  - duration/timestamp behavior
  - status fallback `599`
- [x] Add request body fallback precedence tests.
- [x] Add truncation and binary-body encoding tests.
- [x] Add deep-link parser tests (`connected`, `ignored`, `failed`).
- [x] Add endpoint persistence restore/fallback tests.
- [x] Add concurrency tests for identical in-flight requests.

## 10. Tests: Dio Adapter

- [x] Add `dev_see_logger_dio_interceptor_test.dart`.
- [x] Test success response logging path.
- [x] Test failure response logging path.
- [x] Test failure without response fallback path.
- [x] Test request start tracking invocation.
- [x] Test interceptor preserves handler continuation.

## 11. Documentation

- [x] Add core package README with configure + manual log examples.
- [x] Add dio adapter README with interceptor example.
- [x] Add example Flutter integration snippet:
  - `DevSeeLoggerCenter.configure(...)`
  - `dio.interceptors.add(DevSeeLoggerDioInterceptor())`
  - URI/deep-link forwarding via `DevSeeLoggerCenter.handleUri(...)`
- [x] Document remembered endpoint behavior across app restart.
- [x] Document request body fallback behavior.

## 12. CI + Release

- [x] Add CI jobs for both packages (`dart analyze`, `dart test`).
- [ ] Validate package score checks before release.
- [x] Prepare changelog entries for initial versions.
- [ ] Publish `dev_see_logger` to pub.dev.
- [ ] Publish `dev_see_logger_dio` to pub.dev.

## 13. Exit Checklist

- [ ] Flutter app can integrate via pubspec and receive logs in dev-see.
- [x] Core package remains Dio-independent.
- [x] Dio interceptor package works for success and failure flows.
- [x] Endpoint persistence works after app restart.
- [x] Core and adapter tests pass.
- [x] Docs include copy-ready integration snippets.
