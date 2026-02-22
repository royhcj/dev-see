class DevSeeRequestSnapshot {
  const DevSeeRequestSnapshot({
    required this.method,
    required this.uri,
    this.headers,
    this.data,
  });

  factory DevSeeRequestSnapshot.fromObject(Object request) {
    if (request is DevSeeRequestSnapshot) {
      return request;
    }

    final dynamic value = request;
    final rawMethod = _tryRead<String>(() => value.method) ?? 'GET';

    return DevSeeRequestSnapshot(
      method: rawMethod.toUpperCase(),
      uri: _resolveRequestUri(value),
      headers: _normalizeHeaders(_tryRead<Object?>(() => value.headers)),
      data: _tryRead<Object?>(() => value.data),
    );
  }

  final String method;
  final Uri uri;
  final Map<String, String>? headers;
  final Object? data;
}

class DevSeeResponseSnapshot {
  const DevSeeResponseSnapshot({
    this.statusCode,
    this.realUri,
    this.headers,
    this.data,
  });

  factory DevSeeResponseSnapshot.fromObject(Object response) {
    if (response is DevSeeResponseSnapshot) {
      return response;
    }

    final dynamic value = response;
    return DevSeeResponseSnapshot(
      statusCode: _toInt(_tryRead<Object?>(() => value.statusCode)),
      realUri: _resolveResponseUri(value),
      headers: _normalizeHeaders(_tryRead<Object?>(() => value.headers)),
      data: _tryRead<Object?>(() => value.data),
    );
  }

  final int? statusCode;
  final Uri? realUri;
  final Map<String, String>? headers;
  final Object? data;
}

Map<String, String>? _normalizeHeaders(Object? rawHeaders) {
  Object? normalized = rawHeaders;
  final dynamic dynamicHeaders = rawHeaders;
  normalized ??= _tryRead<Object?>(() => dynamicHeaders.map);

  if (normalized is! Map || normalized.isEmpty) {
    return null;
  }

  final result = <String, String>{};
  for (final entry in normalized.entries) {
    final key = '${entry.key}';
    final value = entry.value;
    if (value is Iterable) {
      result[key] = value.map((item) => '$item').join(',');
    } else {
      result[key] = '$value';
    }
  }

  return result.isEmpty ? null : result;
}

Uri _resolveRequestUri(dynamic request) {
  final direct = _coerceUri(_tryRead<Object?>(() => request.uri));
  if (direct != null) {
    return direct;
  }

  final urlString = _tryRead<Object?>(() => request.url);
  final fromString = _coerceUri(urlString);
  if (fromString != null) {
    return fromString;
  }

  return Uri.parse('about:blank');
}

Uri? _resolveResponseUri(dynamic response) {
  final realUri = _coerceUri(_tryRead<Object?>(() => response.realUri));
  if (realUri != null) {
    return realUri;
  }

  final requestOptions = _tryRead<Object?>(() => response.requestOptions);
  if (requestOptions != null) {
    final dynamic value = requestOptions;
    final uri = _coerceUri(_tryRead<Object?>(() => value.uri));
    if (uri != null) {
      return uri;
    }
  }

  return null;
}

Uri? _coerceUri(Object? raw) {
  if (raw == null) {
    return null;
  }
  if (raw is Uri) {
    return raw;
  }
  if (raw is String && raw.isNotEmpty) {
    return Uri.tryParse(raw);
  }
  return Uri.tryParse('$raw');
}

int? _toInt(Object? raw) {
  if (raw == null) {
    return null;
  }
  if (raw is int) {
    return raw;
  }
  return int.tryParse('$raw');
}

T? _tryRead<T>(T Function() reader) {
  try {
    return reader();
  } catch (_) {
    return null;
  }
}
