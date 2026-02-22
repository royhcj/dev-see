import 'dart:convert';

import 'dev_see_logger_configuration.dart';
import 'header_redactor.dart';
import 'log_snapshots.dart';

class ApiLogEvent {
  const ApiLogEvent({
    required this.type,
    required this.appId,
    required this.method,
    required this.url,
    required this.statusCode,
    required this.duration,
    required this.timestamp,
    this.requestHeaders,
    this.requestBody,
    this.responseHeaders,
    this.responseBody,
    this.error,
  });

  factory ApiLogEvent.from({
    required DevSeeRequestSnapshot request,
    DevSeeResponseSnapshot? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? startedAt,
    DateTime? endedAt,
    required DevSeeLoggerConfiguration configuration,
    required HeaderRedactor redactor,
  }) {
    final finishedAt = endedAt ?? DateTime.now();
    final resolvedRequestBody = requestBody ?? request.data;
    final encodedRequestBody = _encodeBody(
      resolvedRequestBody,
      maxBodyBytes: configuration.maxBodyBytes,
    );
    final encodedResponseBody = _encodeBody(
      responseBody ?? response?.data,
      maxBodyBytes: configuration.maxBodyBytes,
    );

    return ApiLogEvent(
      type: 'api_log',
      appId: configuration.appId,
      method: request.method,
      url: request.uri.toString().isEmpty
          ? (response?.realUri?.toString() ?? 'about:blank')
          : request.uri.toString(),
      statusCode: response?.statusCode ?? 599,
      duration:
          _durationMilliseconds(startedAt: startedAt, endedAt: finishedAt),
      timestamp: finishedAt.millisecondsSinceEpoch,
      requestHeaders: redactor.redact(request.headers),
      requestBody: encodedRequestBody,
      responseHeaders: redactor.redact(response?.headers),
      responseBody: encodedResponseBody,
      error: error?.toString(),
    );
  }

  final String type;
  final String appId;
  final String method;
  final String url;
  final int statusCode;
  final int duration;
  final int timestamp;
  final Map<String, String>? requestHeaders;
  final String? requestBody;
  final Map<String, String>? responseHeaders;
  final String? responseBody;
  final String? error;

  Map<String, Object?> toJson() {
    return {
      'type': type,
      'appId': appId,
      'method': method,
      'url': url,
      'statusCode': statusCode,
      'duration': duration,
      'timestamp': timestamp,
      'requestHeaders': requestHeaders,
      'requestBody': requestBody,
      'responseHeaders': responseHeaders,
      'responseBody': responseBody,
      'error': error,
    };
  }

  static int _durationMilliseconds({
    required DateTime? startedAt,
    required DateTime endedAt,
  }) {
    if (startedAt == null) {
      return 0;
    }

    final difference = endedAt.difference(startedAt).inMilliseconds;
    return difference < 0 ? 0 : difference;
  }

  static String? _encodeBody(Object? body, {required int maxBodyBytes}) {
    final bytes = _bodyToBytes(body);
    if (bytes == null) {
      return null;
    }

    final safeLimit = maxBodyBytes < 0 ? 0 : maxBodyBytes;
    final isTruncated = bytes.length > safeLimit;
    final candidate = isTruncated ? bytes.sublist(0, safeLimit) : bytes;

    try {
      final text = utf8.decode(candidate);
      if (!isTruncated) {
        return text;
      }
      return text.isEmpty ? '[TRUNCATED]' : '$text...[TRUNCATED]';
    } catch (_) {
      final base64 = 'base64:${base64Encode(candidate)}';
      return isTruncated ? '$base64...[TRUNCATED]' : base64;
    }
  }

  static List<int>? _bodyToBytes(Object? body) {
    if (body == null) {
      return null;
    }

    if (body is List<int>) {
      return body;
    }

    if (body is String) {
      return utf8.encode(body);
    }

    if (body is bool || body is num || body is Map || body is List) {
      return utf8.encode(jsonEncode(body));
    }

    return utf8.encode(body.toString());
  }
}
