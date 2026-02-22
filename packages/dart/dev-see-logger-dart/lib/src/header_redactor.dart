class HeaderRedactor {
  HeaderRedactor({Set<String>? sensitiveHeaders})
      : _sensitiveHeaders = sensitiveHeaders == null
            ? defaultSensitiveHeaders
            : {
                for (final header in sensitiveHeaders) header.toLowerCase(),
              };

  static const Set<String> defaultSensitiveHeaders = {
    'authorization',
    'cookie',
    'set-cookie',
    'x-api-key',
  };

  final Set<String> _sensitiveHeaders;

  Map<String, String>? redact(Map<String, String>? headers) {
    if (headers == null || headers.isEmpty) {
      return null;
    }

    return {
      for (final entry in headers.entries)
        entry.key: _sensitiveHeaders.contains(entry.key.toLowerCase())
            ? '[REDACTED]'
            : entry.value,
    };
  }
}
