# dev_see_logger_dio

Dio interceptor package for `dev_see_logger`.

## Usage

```dart
import 'package:dev_see_logger/dev_see_logger.dart';
import 'package:dev_see_logger_dio/dev_see_logger_dio.dart';
import 'package:dio/dio.dart';

DevSeeLoggerCenter.configure(
  DevSeeLoggerConfiguration(
    appId: 'com.example.app',
    serverUri: Uri.parse('http://127.0.0.1:9090'),
  ),
);

final dio = Dio();
dio.interceptors.add(DevSeeLoggerDioInterceptor());
```

Forward deep-link/URI connect events:

```dart
DevSeeLoggerCenter.handleUri(uri);
```
