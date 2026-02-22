enum DevSeeConnectionResultType {
  connected,
  ignored,
  failed,
}

class DevSeeEndpoint {
  const DevSeeEndpoint({
    required this.scheme,
    required this.host,
    required this.port,
  });

  final String scheme;
  final String host;
  final int port;

  Uri? get serverUri {
    try {
      return Uri(scheme: scheme, host: host, port: port);
    } catch (_) {
      return null;
    }
  }

  @override
  bool operator ==(Object other) {
    return other is DevSeeEndpoint &&
        other.scheme == scheme &&
        other.host == host &&
        other.port == port;
  }

  @override
  int get hashCode => Object.hash(scheme, host, port);
}

class DevSeeConnectionResult {
  const DevSeeConnectionResult._({
    required this.type,
    this.endpoint,
    this.reason,
  });

  const DevSeeConnectionResult.connected({required DevSeeEndpoint endpoint})
      : this._(type: DevSeeConnectionResultType.connected, endpoint: endpoint);

  const DevSeeConnectionResult.ignored()
      : this._(type: DevSeeConnectionResultType.ignored);

  const DevSeeConnectionResult.failed({required String reason})
      : this._(type: DevSeeConnectionResultType.failed, reason: reason);

  final DevSeeConnectionResultType type;
  final DevSeeEndpoint? endpoint;
  final String? reason;

  bool get isIgnored => type == DevSeeConnectionResultType.ignored;

  @override
  bool operator ==(Object other) {
    return other is DevSeeConnectionResult &&
        other.type == type &&
        other.endpoint == endpoint &&
        other.reason == reason;
  }

  @override
  int get hashCode => Object.hash(type, endpoint, reason);
}
