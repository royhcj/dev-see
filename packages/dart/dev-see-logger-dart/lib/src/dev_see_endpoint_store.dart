import 'dart:convert';
import 'dart:io';

import 'dev_see_connection_result.dart';

abstract interface class DevSeeEndpointStore {
  DevSeeEndpoint? loadEndpoint();
  void saveEndpoint(DevSeeEndpoint endpoint);
  void clearEndpoint();
}

class DevSeeNoopEndpointStore implements DevSeeEndpointStore {
  const DevSeeNoopEndpointStore();

  @override
  DevSeeEndpoint? loadEndpoint() => null;

  @override
  void saveEndpoint(DevSeeEndpoint endpoint) {}

  @override
  void clearEndpoint() {}
}

class DevSeeFileEndpointStore implements DevSeeEndpointStore {
  DevSeeFileEndpointStore({
    required String appId,
    Directory? rootDirectory,
  })  : _appId = appId.trim().isEmpty ? 'default' : appId.trim(),
        _rootDirectory = rootDirectory ??
            Directory('${Directory.systemTemp.path}/dev_see_logger');

  final String _appId;
  final Directory _rootDirectory;

  @override
  DevSeeEndpoint? loadEndpoint() {
    final file = _file;
    if (!file.existsSync()) {
      return null;
    }

    try {
      final decoded = jsonDecode(file.readAsStringSync());
      if (decoded is! Map) {
        clearEndpoint();
        return null;
      }

      final host = '${decoded['host'] ?? ''}'.trim();
      final rawPort = decoded['port'];
      final port = rawPort is int ? rawPort : int.tryParse('$rawPort');
      if (host.isEmpty || port == null || port < 1 || port > 65535) {
        clearEndpoint();
        return null;
      }

      return DevSeeEndpoint(scheme: 'http', host: host, port: port);
    } catch (_) {
      clearEndpoint();
      return null;
    }
  }

  @override
  void saveEndpoint(DevSeeEndpoint endpoint) {
    _rootDirectory.createSync(recursive: true);
    final content = jsonEncode({
      'host': endpoint.host,
      'port': endpoint.port,
    });
    _file.writeAsStringSync(content);
  }

  @override
  void clearEndpoint() {
    final file = _file;
    if (file.existsSync()) {
      file.deleteSync();
    }
  }

  File get _file {
    final normalized = _appId.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
    return File('${_rootDirectory.path}/$normalized.endpoint.json');
  }
}
