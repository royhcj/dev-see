import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'api_log_event.dart';
import 'dev_see_connection_result.dart';
import 'dev_see_endpoint_store.dart';
import 'dev_see_logger_configuration.dart';
import 'dev_see_logging.dart';
import 'dev_see_request_token.dart';
import 'header_redactor.dart';
import 'log_snapshots.dart';
import 'log_transport.dart';

class DevSeeLogger implements DevSeeLogging {
  DevSeeLogger({
    required DevSeeLoggerConfiguration configuration,
    LogTransporting? transport,
    HeaderRedactor? redactor,
    DevSeeEndpointStore? endpointStore,
  })  : _redactor = redactor ?? HeaderRedactor(),
        _endpointStore = endpointStore ??
            DevSeeFileEndpointStore(appId: configuration.appId),
        _configuration = configuration {
    final resolved = _resolvedInitialConfiguration(
      from: configuration,
      endpointStore: _endpointStore,
    );

    _configuration = resolved;
    if (transport == null ||
        (transport is LogTransport && resolved != configuration)) {
      _transport = LogTransport(configuration: resolved);
    } else {
      _transport = transport;
    }
  }

  static const String _deepLinkSchemePrefix = 'dev-see-';
  static const String _deepLinkAction = 'connect';
  static const String _serverIPParam = 'server_ip';
  static const String _serverPortParam = 'server_port';

  DevSeeLoggerConfiguration _configuration;
  final HeaderRedactor _redactor;
  late LogTransporting _transport;
  final DevSeeEndpointStore _endpointStore;

  final Map<String, List<DateTime>> _startedAtsByRequestKey = {};
  final Map<DevSeeRequestToken, DateTime> _startedAtsByToken = {};

  int _tokenSeed = 0;

  Uri get currentServerUri => _configuration.serverUri;

  @override
  Future<void> log({
    required Object request,
    Object? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? startedAt,
    DateTime? endedAt,
  }) async {
    final requestSnapshot = DevSeeRequestSnapshot.fromObject(request);
    final responseSnapshot =
        response == null ? null : DevSeeResponseSnapshot.fromObject(response);

    final event = ApiLogEvent.from(
      request: requestSnapshot,
      response: responseSnapshot,
      responseBody: responseBody,
      requestBody: requestBody,
      error: error,
      startedAt: startedAt,
      endedAt: endedAt,
      configuration: _configuration,
      redactor: _redactor,
    );

    try {
      await _transport.send(event: event);
    } catch (transportError) {
      _debugPrint('DevSeeLogger send failed: $transportError');
    }
  }

  @override
  DevSeeRequestToken beginRequest(Object request, {DateTime? at}) {
    final startedAt = at ?? DateTime.now();
    final requestSnapshot = DevSeeRequestSnapshot.fromObject(request);
    final requestKey = _requestKeyForSnapshot(requestSnapshot);
    final token = DevSeeRequestToken(rawValue: _nextTokenValue());

    _startedAtsByRequestKey
        .putIfAbsent(requestKey, () => <DateTime>[])
        .add(startedAt);
    _startedAtsByToken[token] = startedAt;
    return token;
  }

  @override
  void markRequestStarted(Object request, {DateTime? at}) {
    final startedAt = at ?? DateTime.now();
    final requestSnapshot = DevSeeRequestSnapshot.fromObject(request);
    final requestKey = _requestKeyForSnapshot(requestSnapshot);
    _startedAtsByRequestKey
        .putIfAbsent(requestKey, () => <DateTime>[])
        .add(startedAt);
  }

  @override
  Future<void> logCompleted({
    DevSeeRequestToken? token,
    required Object request,
    Object? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? endedAt,
  }) async {
    final requestSnapshot = DevSeeRequestSnapshot.fromObject(request);
    final startedAt = _popStartedAt(token: token, request: requestSnapshot);

    await log(
      request: request,
      response: response,
      responseBody: responseBody,
      requestBody: requestBody,
      error: error,
      startedAt: startedAt,
      endedAt: endedAt,
    );
  }

  @override
  void logCompletedDetached({
    DevSeeRequestToken? token,
    required Object request,
    Object? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? endedAt,
  }) {
    unawaited(
      logCompleted(
        token: token,
        request: request,
        response: response,
        responseBody: responseBody,
        requestBody: requestBody,
        error: error,
        endedAt: endedAt,
      ),
    );
  }

  DevSeeConnectionResult handleUri(Uri uri) {
    final scheme = uri.scheme.toLowerCase();
    if (!scheme.startsWith(_deepLinkSchemePrefix)) {
      return const DevSeeConnectionResult.ignored();
    }

    if (_resolvedAction(uri) != _deepLinkAction) {
      return const DevSeeConnectionResult.ignored();
    }

    final hostValue = uri.queryParameters[_serverIPParam]?.trim();
    if (hostValue == null || hostValue.isEmpty) {
      return const DevSeeConnectionResult.failed(
        reason: 'Missing required query parameter: server_ip.',
      );
    }

    if (!_isSupportedHost(hostValue)) {
      return const DevSeeConnectionResult.failed(
        reason: 'Invalid host format in server_ip.',
      );
    }

    final portRaw = uri.queryParameters[_serverPortParam];
    if (portRaw == null || portRaw.isEmpty) {
      return const DevSeeConnectionResult.failed(
        reason: 'Missing required query parameter: server_port.',
      );
    }

    final port = int.tryParse(portRaw);
    if (port == null || port < 1 || port > 65535) {
      return const DevSeeConnectionResult.failed(
        reason: 'Invalid server_port. Use an integer between 1 and 65535.',
      );
    }

    final endpoint =
        DevSeeEndpoint(scheme: 'http', host: hostValue, port: port);
    final serverUri = endpoint.serverUri;
    if (serverUri == null) {
      return const DevSeeConnectionResult.failed(
        reason: 'Could not construct server endpoint.',
      );
    }

    _writeState(_configuration.replacingServerUri(serverUri));
    _endpointStore.saveEndpoint(endpoint);
    return DevSeeConnectionResult.connected(endpoint: endpoint);
  }

  DevSeeLoggerConfiguration _resolvedInitialConfiguration({
    required DevSeeLoggerConfiguration from,
    required DevSeeEndpointStore endpointStore,
  }) {
    final rememberedEndpoint = endpointStore.loadEndpoint();
    if (rememberedEndpoint == null) {
      return from;
    }

    final isValidPort =
        rememberedEndpoint.port >= 1 && rememberedEndpoint.port <= 65535;
    final rememberedUri = rememberedEndpoint.serverUri;
    if (!_isSupportedHost(rememberedEndpoint.host) ||
        !isValidPort ||
        rememberedUri == null) {
      endpointStore.clearEndpoint();
      return from;
    }

    return from.replacingServerUri(rememberedUri);
  }

  void _writeState(DevSeeLoggerConfiguration nextConfiguration) {
    _configuration = nextConfiguration;
    if (_transport is LogTransport) {
      _transport = LogTransport(configuration: nextConfiguration);
    }
  }

  DateTime? _popStartedAt({
    required DevSeeRequestToken? token,
    required DevSeeRequestSnapshot request,
  }) {
    final requestKey = _requestKeyForSnapshot(request);

    if (token != null && _startedAtsByToken.containsKey(token)) {
      final startedAt = _startedAtsByToken.remove(token);
      final queue = _startedAtsByRequestKey[requestKey];
      if (queue != null && queue.isNotEmpty) {
        queue.removeAt(0);
        if (queue.isEmpty) {
          _startedAtsByRequestKey.remove(requestKey);
        }
      }
      return startedAt;
    }

    final queue = _startedAtsByRequestKey[requestKey];
    if (queue == null || queue.isEmpty) {
      return null;
    }

    final startedAt = queue.removeAt(0);
    if (queue.isEmpty) {
      _startedAtsByRequestKey.remove(requestKey);
    }
    return startedAt;
  }

  String _requestKeyForSnapshot(DevSeeRequestSnapshot request) {
    final bodyBytes = _bodyToBytes(request.data);
    return '${request.method}|${request.uri}|${_hashBytes(bodyBytes)}';
  }

  int _hashBytes(List<int>? bytes) {
    if (bytes == null || bytes.isEmpty) {
      return 0;
    }

    var hash = 17;
    for (final byte in bytes.take(256)) {
      hash = (37 * hash + byte) & 0x7fffffff;
    }
    hash = (37 * hash + bytes.length) & 0x7fffffff;
    return hash;
  }

  List<int>? _bodyToBytes(Object? body) {
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

  String _nextTokenValue() {
    _tokenSeed += 1;
    final randomSuffix = Random().nextInt(0x7fffffff);
    return '${DateTime.now().microsecondsSinceEpoch}-$_tokenSeed-$randomSuffix';
  }

  String _resolvedAction(Uri uri) {
    final host = uri.host.toLowerCase();
    if (host.isNotEmpty) {
      return host;
    }

    return uri.path.replaceAll('/', '').toLowerCase();
  }

  bool _isSupportedHost(String host) {
    return _isIPv4Address(host) || _isHostname(host);
  }

  bool _isIPv4Address(String host) {
    final segments = host.split('.');
    if (segments.length != 4) {
      return false;
    }

    for (final segment in segments) {
      if (segment.isEmpty) {
        return false;
      }
      final value = int.tryParse(segment);
      if (value == null || value < 0 || value > 255) {
        return false;
      }
    }
    return true;
  }

  bool _isHostname(String host) {
    if (host.isEmpty || host.length > 253) {
      return false;
    }

    final labels = host.split('.');
    if (labels.any((label) => label.isEmpty)) {
      return false;
    }

    final allowed = RegExp(r'^[A-Za-z0-9-]+$');
    for (final label in labels) {
      if (label.length > 63) {
        return false;
      }
      if (!allowed.hasMatch(label)) {
        return false;
      }
      final first = label.codeUnitAt(0);
      final last = label.codeUnitAt(label.length - 1);
      final firstOk = _isLetterOrNumber(first);
      final lastOk = _isLetterOrNumber(last);
      if (!firstOk || !lastOk) {
        return false;
      }
    }

    return true;
  }

  bool _isLetterOrNumber(int codeUnit) {
    return (codeUnit >= 48 && codeUnit <= 57) ||
        (codeUnit >= 65 && codeUnit <= 90) ||
        (codeUnit >= 97 && codeUnit <= 122);
  }

  void _debugPrint(String message) {
    assert(() {
      // ignore: avoid_print
      print(message);
      return true;
    }());
  }
}
