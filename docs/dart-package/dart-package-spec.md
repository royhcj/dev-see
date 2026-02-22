# Dart Package Spec: Dio API Logger

> Last updated: 2026-02-21

This document defines the v1 baseline for Flutter/Dart logging support using Dio, with API and behavior parity goals aligned to:

1. `dev-see-logger-swift` (core logger behavior).
2. `dev-see-logger-moya-swift` (first-party framework adapter ergonomics).

---

## 1. Goals

1. Provide a reusable Dart package for Flutter apps to log HTTP request/response traffic to the dev-see server.
2. Provide a first-party Dio interceptor `DevSeeLoggerDioInterceptor` for low-friction integration.
3. Preserve a framework-agnostic core logger API for non-Dio/manual use.
4. Send normalized payloads to dev-see log server `POST /api/logs`.
5. Persist and restore the last successful DevSee endpoint (host + port) across app restarts.
6. Keep request logging non-blocking and non-fatal to host app networking behavior.

## 2. Non-Goals

1. Automatic interception of all networking stacks without integration.
2. Offline queueing/retry persistence.
3. Production telemetry/analytics replacement.
4. Multi-endpoint profile management and cloud sync.
5. Embedded log viewer UI in this package milestone.

---

## 3. Package Strategy

To mirror Swift package boundaries, Dart uses a core + adapter split:

1. Core package: `dev_see_logger` (no Dio dependency).
2. Dio adapter package: `dev_see_logger_dio` (depends on `dev_see_logger` + `dio`).
3. Repository folder for this milestone: `packages/dart/dev-see-logger-dio-dart/` (workspace naming convention).

Consumer impact:

1. Non-Dio apps can use core package only.
2. Dio apps add `dev_see_logger_dio` and register `DevSeeLoggerDioInterceptor`.

---

## 4. Public API

### 4.1 Core types

```dart
class DevSeeLoggerConfiguration {
  final String appId;
  final Uri serverUri;
  final String apiPath; // default "/api/logs"
  final int maxBodyBytes; // default 64 * 1024
}

class DevSeeRequestToken {
  final String rawValue; // UUID string
}
```

### 4.2 Logger and center

```dart
class DevSeeLogger {
  DevSeeLogger({required DevSeeLoggerConfiguration configuration});

  DevSeeRequestToken beginRequest(
    RequestOptions request, {
    DateTime? at,
  });

  void markRequestStarted(
    RequestOptions request, {
    DateTime? at,
  });

  Future<void> log({
    required RequestOptions request,
    Response<dynamic>? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? startedAt,
    DateTime? endedAt,
  });

  Future<void> logCompleted({
    DevSeeRequestToken? token,
    required RequestOptions request,
    Response<dynamic>? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? endedAt,
  });

  void logCompletedDetached({
    DevSeeRequestToken? token,
    required RequestOptions request,
    Response<dynamic>? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? endedAt,
  });

  DevSeeConnectionResult handleUri(Uri uri);
}

class DevSeeLoggerCenter {
  static void configure(DevSeeLoggerConfiguration configuration);
  static DevSeeLogger get shared;
  static bool handleUri(Uri uri);
}
```

### 4.3 Dio adapter API

```dart
class DevSeeLoggerDioInterceptor extends Interceptor {
  DevSeeLoggerDioInterceptor({DevSeeLogger? logger});
}
```

Integration modes:

1. Manual: call `DevSeeLogger.log(...)`.
2. Tokenized lifecycle: `beginRequest(...)` then `logCompleted(...)`.
3. Adapter: register `DevSeeLoggerDioInterceptor` in `Dio.interceptors`.

---

## 5. Connection Endpoint Persistence

1. SDK must support DevSee deep link parsing for connect URLs:
   1. scheme prefix: `dev-see-`.
   2. action: `connect`.
   3. required query params: `server_ip`, `server_port`.
2. On successful parse and validation, SDK updates in-memory server URI and persists endpoint.
3. Persisted endpoint storage must survive app restart (default `SharedPreferences` implementation).
4. Restore precedence:
   1. valid remembered endpoint.
   2. configured `serverUri`.
   3. package default `http://127.0.0.1:9090`.
5. Invalid stored values are ignored and cleared safely.
6. Only host + port are persisted (no auth tokens, no request/response payload data).

---

## 6. Wire Contract to Log Server

SDK sends JSON to `POST /api/logs`.

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

1. `method` from `request.method` (fallback `GET`).
2. `url` from `request.uri` (fallback `response.realUri`, then `about:blank`).
3. `statusCode` from `response.statusCode`, fallback `599`.
4. `duration` from `endedAt - startedAt`, fallback `0`.
5. Request body resolution order:
   1. explicit `requestBody` argument.
   2. `request.data`.
   3. `null`.
6. Body normalization:
   1. UTF-8 JSON/string when representable.
   2. `base64:<...>` for binary bytes.
   3. append `...[TRUNCATED]` when truncated.
7. Redact sensitive headers by default:
   1. `authorization`
   2. `cookie`
   3. `set-cookie`
   4. `x-api-key`

---

## 7. Dio Interceptor Behavior

1. `onRequest`:
   1. record start time via `markRequestStarted` (or token lifecycle).
2. `onResponse`:
   1. log success using `logCompletedDetached`.
   2. include `response.data` as response body.
3. `onError`:
   1. log failure using `logCompletedDetached`.
   2. include `error.response` when available.
4. Interceptor must not block/alter request flow and must always call handler continuation.
5. If logging fails internally, errors are swallowed (debug logging only).

---

## 8. File Organization

```text
packages/dart/dev-see-logger-dart/
  pubspec.yaml
  lib/
    dev_see_logger.dart
    src/
      dev_see_logger.dart
      dev_see_logger_center.dart
      dev_see_logger_configuration.dart
      dev_see_request_token.dart
      dev_see_connection_result.dart
      dev_see_endpoint_store.dart
      api_log_event.dart
      log_transport.dart
      header_redactor.dart
  test/
    dev_see_logger_test.dart
    dev_see_logger_center_test.dart
    dev_see_endpoint_store_test.dart
    header_redactor_test.dart

packages/dart/dev-see-logger-dio-dart/
  pubspec.yaml
  lib/
    dev_see_logger_dio.dart
    src/
      dev_see_logger_dio_interceptor.dart
  test/
    dev_see_logger_dio_interceptor_test.dart
```

---

## 9. Security and Privacy Requirements

1. Package is development/debug focused by default.
2. Sensitive headers must be redacted by default.
3. Body size truncation enforced by `maxBodyBytes`.
4. Endpoint persistence stores only minimal connection info.
5. Future option: opt-out body logging for stricter privacy requirements.

---

## 10. Testing Requirements

1. Unit tests for payload mapping and request body fallback precedence.
2. Unit tests for redaction and truncation.
3. Unit tests for lifecycle tracking with concurrent in-flight identical requests.
4. Unit tests for deep-link parsing and connect result states.
5. Unit tests for endpoint persistence restore/fallback behavior.
6. Integration test for `POST /api/logs`.
7. Dio adapter tests for success and failure paths.
