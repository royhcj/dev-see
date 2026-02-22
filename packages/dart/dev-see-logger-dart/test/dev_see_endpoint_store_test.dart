import 'dart:io';

import 'package:dev_see_logger/dev_see_logger.dart';
import 'package:test/test.dart';

void main() {
  late Directory tempDirectory;

  setUp(() {
    tempDirectory =
        Directory.systemTemp.createTempSync('dev-see-endpoint-store');
  });

  tearDown(() {
    if (tempDirectory.existsSync()) {
      tempDirectory.deleteSync(recursive: true);
    }
  });

  test('save and load round-trip', () {
    final store = DevSeeFileEndpointStore(
      appId: 'com.example.app',
      rootDirectory: tempDirectory,
    );
    const endpoint =
        DevSeeEndpoint(scheme: 'http', host: '192.168.0.50', port: 9090);

    store.saveEndpoint(endpoint);

    expect(store.loadEndpoint(), endpoint);
  });

  test('load with invalid port clears stored endpoint', () {
    final store = DevSeeFileEndpointStore(
      appId: 'com.example.app',
      rootDirectory: tempDirectory,
    );

    final file = File('${tempDirectory.path}/com.example.app.endpoint.json');
    file.writeAsStringSync('{"host":"qa-server.local","port":70000}');

    expect(store.loadEndpoint(), isNull);
    expect(file.existsSync(), isFalse);
  });

  test('appId namespaces values', () {
    final one = DevSeeFileEndpointStore(
      appId: 'com.example.one',
      rootDirectory: tempDirectory,
    );
    final two = DevSeeFileEndpointStore(
      appId: 'com.example.two',
      rootDirectory: tempDirectory,
    );

    one.saveEndpoint(
        const DevSeeEndpoint(scheme: 'http', host: '10.0.0.1', port: 8080));

    expect(
      one.loadEndpoint(),
      const DevSeeEndpoint(scheme: 'http', host: '10.0.0.1', port: 8080),
    );
    expect(two.loadEndpoint(), isNull);
  });
}
