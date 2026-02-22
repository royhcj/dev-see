import 'dart:convert';

import 'package:dev_see_logger/dev_see_logger.dart';
import 'package:test/test.dart';

void main() {
  test('handleUri valid deep-link returns connected', () {
    final configuration = DevSeeLoggerConfiguration(
      appId: 'com.example.test',
      serverUri: Uri(scheme: 'http', host: 'localhost', port: 9090),
    );
    final endpointStore = InMemoryEndpointStore();
    final logger = DevSeeLogger(
      configuration: configuration,
      transport: TransportSpy(),
      endpointStore: endpointStore,
    );

    final result = logger.handleUri(
      Uri.parse(
          'dev-see-com.example.app://connect?server_ip=192.168.1.23&server_port=9090'),
    );

    expect(
      result,
      const DevSeeConnectionResult.connected(
        endpoint:
            DevSeeEndpoint(scheme: 'http', host: '192.168.1.23', port: 9090),
      ),
    );
  });

  test('handleUri missing server_ip returns failed', () {
    final logger = _makeLogger();

    final result = logger.handleUri(
      Uri.parse('dev-see-com.example.app://connect?server_port=9090'),
    );

    expect(
      result,
      const DevSeeConnectionResult.failed(
        reason: 'Missing required query parameter: server_ip.',
      ),
    );
  });

  test('handleUri missing server_port returns failed', () {
    final logger = _makeLogger();

    final result = logger.handleUri(
      Uri.parse('dev-see-com.example.app://connect?server_ip=qa-server.local'),
    );

    expect(
      result,
      const DevSeeConnectionResult.failed(
        reason: 'Missing required query parameter: server_port.',
      ),
    );
  });

  test('handleUri invalid host returns failed', () {
    final logger = _makeLogger();

    final result = logger.handleUri(
      Uri.parse(
          'dev-see-com.example.app://connect?server_ip=qa_server.local&server_port=9090'),
    );

    expect(
      result,
      const DevSeeConnectionResult.failed(
        reason: 'Invalid host format in server_ip.',
      ),
    );
  });

  test('handleUri invalid port returns failed', () {
    final logger = _makeLogger();

    for (final invalidUrl in [
      'dev-see-com.example.app://connect?server_ip=qa-server.local&server_port=0',
      'dev-see-com.example.app://connect?server_ip=qa-server.local&server_port=65536',
      'dev-see-com.example.app://connect?server_ip=qa-server.local&server_port=abc',
    ]) {
      final result = logger.handleUri(Uri.parse(invalidUrl));
      expect(
        result,
        const DevSeeConnectionResult.failed(
          reason: 'Invalid server_port. Use an integer between 1 and 65535.',
        ),
      );
    }
  });

  test('handleUri wrong scheme or action returns ignored', () {
    final logger = _makeLogger();

    final wrongScheme = logger.handleUri(
      Uri.parse('https://connect?server_ip=qa-server.local&server_port=9090'),
    );
    final wrongAction = logger.handleUri(
      Uri.parse(
          'dev-see-com.example.app://disconnect?server_ip=qa-server.local&server_port=9090'),
    );

    expect(wrongScheme, const DevSeeConnectionResult.ignored());
    expect(wrongAction, const DevSeeConnectionResult.ignored());
  });

  test('handleUri applies endpoint override after successful parse', () {
    final logger = _makeLogger();

    final result = logger.handleUri(
      Uri.parse(
          'dev-see-com.example.app://connect?server_ip=192.168.1.34&server_port=8081'),
    );

    expect(
      result,
      const DevSeeConnectionResult.connected(
        endpoint:
            DevSeeEndpoint(scheme: 'http', host: '192.168.1.34', port: 8081),
      ),
    );
    expect(logger.currentServerUri.toString(), 'http://192.168.1.34:8081');
  });

  test('handleUri persists endpoint and restores on next init', () {
    final configuration = DevSeeLoggerConfiguration(
      appId: 'com.example.test',
      serverUri: Uri(scheme: 'http', host: 'localhost', port: 9090),
    );
    final endpointStore = InMemoryEndpointStore();
    final logger = DevSeeLogger(
      configuration: configuration,
      transport: TransportSpy(),
      endpointStore: endpointStore,
    );

    final result = logger.handleUri(
      Uri.parse(
          'dev-see-com.example.app://connect?server_ip=172.20.0.10&server_port=9111'),
    );

    expect(
      result,
      const DevSeeConnectionResult.connected(
        endpoint:
            DevSeeEndpoint(scheme: 'http', host: '172.20.0.10', port: 9111),
      ),
    );
    expect(
      endpointStore.loadEndpoint(),
      const DevSeeEndpoint(scheme: 'http', host: '172.20.0.10', port: 9111),
    );

    final restarted = DevSeeLogger(
      configuration: configuration,
      transport: TransportSpy(),
      endpointStore: endpointStore,
    );

    expect(restarted.currentServerUri.toString(), 'http://172.20.0.10:9111');
  });

  test('ignored or failed handleUri does not overwrite remembered endpoint',
      () {
    const remembered =
        DevSeeEndpoint(scheme: 'http', host: '10.1.1.2', port: 8080);
    final endpointStore = InMemoryEndpointStore(endpoint: remembered);
    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: TransportSpy(),
      endpointStore: endpointStore,
    );

    final ignored = logger.handleUri(Uri.parse('https://example.com'));
    final failed = logger.handleUri(
      Uri.parse(
          'dev-see-com.example.app://connect?server_ip=10.1.1.99&server_port=99999'),
    );

    expect(ignored, const DevSeeConnectionResult.ignored());
    expect(
      failed,
      const DevSeeConnectionResult.failed(
        reason: 'Invalid server_port. Use an integer between 1 and 65535.',
      ),
    );
    expect(endpointStore.loadEndpoint(), remembered);
  });

  test('invalid remembered endpoint falls back to configured serverUri', () {
    final endpointStore = InMemoryEndpointStore(
      endpoint:
          const DevSeeEndpoint(scheme: 'http', host: 'bad_host', port: 9090),
    );

    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: TransportSpy(),
      endpointStore: endpointStore,
    );

    expect(logger.currentServerUri.toString(),
        _sampleConfiguration().serverUri.toString());
    expect(endpointStore.loadEndpoint(), isNull);
  });

  test('log maps request and response fields', () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    final request = DevSeeRequestSnapshot(
      method: 'POST',
      uri: Uri.parse('https://api.example.com/users?id=42'),
      headers: const {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret',
      },
    );

    final response = DevSeeResponseSnapshot(
      statusCode: 201,
      headers: const {
        'Content-Type': 'application/json',
        'Set-Cookie': 'session=abc',
      },
      data: const {'id': 42},
    );

    final startedAt = DateTime.fromMillisecondsSinceEpoch(1700000000000);
    final endedAt = startedAt.add(const Duration(milliseconds: 321));

    await logger.log(
      request: request,
      response: response,
      requestBody: const {'name': 'Roy'},
      responseBody: const {'id': 42},
      startedAt: startedAt,
      endedAt: endedAt,
    );

    final event = transportSpy.latestEvent;
    expect(event?.method, 'POST');
    expect(event?.url, 'https://api.example.com/users?id=42');
    expect(event?.statusCode, 201);
    expect(event?.duration, 321);
    expect(event?.timestamp, endedAt.millisecondsSinceEpoch);
    expect(event?.appId, 'com.example.test');
    expect(event?.requestBody, '{"name":"Roy"}');
    expect(event?.responseBody, '{"id":42}');
    expect(event?.requestHeaders?['Authorization'], '[REDACTED]');
    expect(event?.responseHeaders?['Set-Cookie'], '[REDACTED]');
    expect(event?.requestHeaders?['Content-Type'], 'application/json');
  });

  test('request body precedence uses request data when requestBody omitted',
      () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    final request = DevSeeRequestSnapshot(
      method: 'POST',
      uri: Uri.parse('https://api.example.com/fallback'),
      data: const {'from': 'request'},
    );

    await logger.log(request: request);

    expect(transportSpy.latestEvent?.requestBody, '{"from":"request"}');
  });

  test('request body precedence uses explicit requestBody over request data',
      () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    final request = DevSeeRequestSnapshot(
      method: 'POST',
      uri: Uri.parse('https://api.example.com/override'),
      data: const {'from': 'request'},
    );

    await logger.log(
      request: request,
      requestBody: const {'from': 'argument'},
    );

    expect(transportSpy.latestEvent?.requestBody, '{"from":"argument"}');
  });

  test('log includes error and status fallback 599', () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    await logger.log(
      request: DevSeeRequestSnapshot(
        method: 'GET',
        uri: Uri.parse('https://api.example.com/fail'),
      ),
      error: Exception('timed out'),
    );

    expect(transportSpy.latestEvent?.statusCode, 599);
    expect(transportSpy.latestEvent?.error, contains('timed out'));
  });

  test('body over limit is truncated', () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: DevSeeLoggerConfiguration(
        appId: 'com.example.test',
        serverUri: Uri(scheme: 'http', host: 'localhost', port: 9090),
        maxBodyBytes: 8,
      ),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    const oversizedBody = '0123456789ABCDEF';

    await logger.log(
      request: DevSeeRequestSnapshot(
        method: 'POST',
        uri: Uri.parse('https://api.example.com/large'),
      ),
      requestBody: oversizedBody,
      responseBody: oversizedBody,
    );

    expect(transportSpy.latestEvent?.requestBody, '01234567...[TRUNCATED]');
    expect(transportSpy.latestEvent?.responseBody, '01234567...[TRUNCATED]');
  });

  test('binary body encodes as base64 with truncation marker', () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: DevSeeLoggerConfiguration(
        appId: 'com.example.test',
        serverUri: Uri(scheme: 'http', host: 'localhost', port: 9090),
        maxBodyBytes: 3,
      ),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    await logger.log(
      request: DevSeeRequestSnapshot(
        method: 'POST',
        uri: Uri.parse('https://api.example.com/binary'),
      ),
      requestBody: <int>[0xff, 0xfe, 0xfd, 0xfc],
    );

    expect(
      transportSpy.latestEvent?.requestBody,
      'base64:${base64Encode(<int>[0xff, 0xfe, 0xfd])}...[TRUNCATED]',
    );
  });

  test('logCompleted uses tracked startedAt', () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    final request = DevSeeRequestSnapshot(
      method: 'GET',
      uri: Uri.parse('https://api.example.com/timed'),
    );

    final startedAt = DateTime.fromMillisecondsSinceEpoch(1700000000000);
    final endedAt = startedAt.add(const Duration(milliseconds: 250));

    logger.markRequestStarted(request, at: startedAt);

    await logger.logCompleted(
      request: request,
      endedAt: endedAt,
    );

    expect(transportSpy.latestEvent?.duration, 250);
  });

  test('logCompleted uses token startedAt', () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    final request = DevSeeRequestSnapshot(
      method: 'GET',
      uri: Uri.parse('https://api.example.com/token'),
    );

    final startedAt = DateTime.fromMillisecondsSinceEpoch(1700000000000);
    final endedAt = startedAt.add(const Duration(milliseconds: 123));

    final token = logger.beginRequest(request, at: startedAt);

    await logger.logCompleted(
      token: token,
      request: request,
      endedAt: endedAt,
    );

    expect(transportSpy.latestEvent?.duration, 123);
  });

  test('concurrency fallback for identical in-flight requests is FIFO',
      () async {
    final transportSpy = TransportSpy();
    final logger = DevSeeLogger(
      configuration: _sampleConfiguration(),
      transport: transportSpy,
      endpointStore: InMemoryEndpointStore(),
    );

    final request = DevSeeRequestSnapshot(
      method: 'GET',
      uri: Uri.parse('https://api.example.com/same'),
    );

    final firstStart = DateTime.fromMillisecondsSinceEpoch(1700000000000);
    final secondStart = firstStart.add(const Duration(milliseconds: 50));

    logger.markRequestStarted(request, at: firstStart);
    logger.markRequestStarted(request, at: secondStart);

    await logger.logCompleted(
      request: request,
      endedAt: firstStart.add(const Duration(milliseconds: 100)),
    );
    await logger.logCompleted(
      request: request,
      endedAt: secondStart.add(const Duration(milliseconds: 200)),
    );

    expect(transportSpy.events[0].duration, 100);
    expect(transportSpy.events[1].duration, 200);
  });

  test('transport builds post request with default path and JSON body', () {
    final configuration = DevSeeLoggerConfiguration(
      appId: 'com.example.test',
      serverUri: Uri(scheme: 'http', host: 'localhost', port: 9090),
    );

    final transport = LogTransport(configuration: configuration);
    final request = transport.makeRequest(event: _sampleEvent());

    expect(request.uri.path, '/api/logs');
    expect(request.method, 'POST');
    expect(request.headers['Content-Type'], 'application/json');
    expect(request.bodyBytes, isNotEmpty);
  });
}

DevSeeLoggerConfiguration _sampleConfiguration() {
  return DevSeeLoggerConfiguration(
    appId: 'com.example.test',
    serverUri: Uri(scheme: 'http', host: 'localhost', port: 9090),
  );
}

DevSeeLogger _makeLogger() {
  return DevSeeLogger(
    configuration: _sampleConfiguration(),
    transport: TransportSpy(),
    endpointStore: InMemoryEndpointStore(),
  );
}

ApiLogEvent _sampleEvent() {
  return const ApiLogEvent(
    type: 'api_log',
    appId: 'com.example.test',
    method: 'GET',
    url: 'https://api.example.com/users',
    statusCode: 200,
    duration: 42,
    timestamp: 1700000000000,
    requestHeaders: {'Accept': 'application/json'},
    responseHeaders: {'Content-Type': 'application/json'},
    responseBody: '{"ok":true}',
  );
}

class TransportSpy implements LogTransporting {
  final List<ApiLogEvent> events = <ApiLogEvent>[];

  ApiLogEvent? get latestEvent => events.isEmpty ? null : events.last;

  @override
  Future<void> send({required ApiLogEvent event}) async {
    events.add(event);
  }
}

class InMemoryEndpointStore implements DevSeeEndpointStore {
  InMemoryEndpointStore({DevSeeEndpoint? endpoint}) : _endpoint = endpoint;

  DevSeeEndpoint? _endpoint;

  @override
  DevSeeEndpoint? loadEndpoint() => _endpoint;

  @override
  void saveEndpoint(DevSeeEndpoint endpoint) {
    _endpoint = endpoint;
  }

  @override
  void clearEndpoint() {
    _endpoint = null;
  }
}
