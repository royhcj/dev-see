class DevSeeLoggerConfiguration {
  const DevSeeLoggerConfiguration({
    required this.appId,
    required this.serverUri,
    this.apiPath = '/api/logs',
    int maxBodyBytes = 64 * 1024,
  }) : maxBodyBytes = maxBodyBytes < 0 ? 0 : maxBodyBytes;

  final String appId;
  final Uri serverUri;
  final String apiPath;
  final int maxBodyBytes;

  Uri get resolvedLogsUri {
    var basePath = serverUri.path;
    if (basePath.endsWith('/')) {
      basePath = basePath.substring(0, basePath.length - 1);
    }

    final normalizedApiPath = apiPath.startsWith('/') ? apiPath : '/$apiPath';
    return serverUri.replace(path: '$basePath$normalizedApiPath');
  }

  DevSeeLoggerConfiguration replacingServerUri(Uri nextServerUri) {
    return DevSeeLoggerConfiguration(
      appId: appId,
      serverUri: nextServerUri,
      apiPath: apiPath,
      maxBodyBytes: maxBodyBytes,
    );
  }

  @override
  bool operator ==(Object other) {
    return other is DevSeeLoggerConfiguration &&
        other.appId == appId &&
        other.serverUri == serverUri &&
        other.apiPath == apiPath &&
        other.maxBodyBytes == maxBodyBytes;
  }

  @override
  int get hashCode => Object.hash(appId, serverUri, apiPath, maxBodyBytes);
}
