import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_log_event.dart';
import 'dev_see_logger_configuration.dart';

abstract interface class LogTransporting {
  Future<void> send({required ApiLogEvent event});
}

class LogTransportRequest {
  const LogTransportRequest({
    required this.uri,
    required this.method,
    required this.headers,
    required this.bodyBytes,
  });

  final Uri uri;
  final String method;
  final Map<String, String> headers;
  final List<int> bodyBytes;
}

class LogTransport implements LogTransporting {
  LogTransport({
    required this.configuration,
    http.Client? client,
    JsonEncoder? encoder,
  })  : _client = client ?? http.Client(),
        _encoder = encoder ?? const JsonEncoder();

  final DevSeeLoggerConfiguration configuration;
  final http.Client _client;
  final JsonEncoder _encoder;

  @override
  Future<void> send({required ApiLogEvent event}) async {
    final request = makeRequest(event: event);
    await _client.post(
      request.uri,
      headers: request.headers,
      body: request.bodyBytes,
    );
  }

  LogTransportRequest makeRequest({required ApiLogEvent event}) {
    final payload = _encoder.convert(event.toJson());
    return LogTransportRequest(
      uri: configuration.resolvedLogsUri,
      method: 'POST',
      headers: const {'Content-Type': 'application/json'},
      bodyBytes: utf8.encode(payload),
    );
  }
}
