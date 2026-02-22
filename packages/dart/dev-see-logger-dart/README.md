# dev_see_logger

Core logger package for sending API logs to a dev-see server.

## Configure

```dart
import 'package:dev_see_logger/dev_see_logger.dart';

DevSeeLoggerCenter.configure(
  DevSeeLoggerConfiguration(
    appId: 'com.example.app',
    serverUri: Uri.parse('http://127.0.0.1:9090'),
  ),
);
```

## Deep-Link / URI Connect

```dart
final handled = DevSeeLoggerCenter.handleUri(uri);
```

A successful connect URI updates and remembers endpoint host/port. The logger restores the remembered endpoint on next startup.

## Manual Logging

```dart
final logger = DevSeeLoggerCenter.shared;

final request = DevSeeRequestSnapshot(
  method: 'GET',
  uri: Uri.parse('https://api.example.com/users/42'),
);

final startedAt = DateTime.now();

try {
  // perform request
  await logger.log(
    request: request,
    response: const DevSeeResponseSnapshot(statusCode: 200),
    responseBody: '{"ok":true}',
    startedAt: startedAt,
  );
} catch (error) {
  await logger.log(
    request: request,
    error: error,
    startedAt: startedAt,
  );
}
```

## Lifecycle Helpers

```dart
final token = logger.beginRequest(request);
await logger.logCompleted(
  token: token,
  request: request,
  response: const DevSeeResponseSnapshot(statusCode: 200),
);
```

## Request Body Fallback

`requestBody` uses this precedence:

1. Explicit `requestBody` argument.
2. `request.data`.
3. `null`.
