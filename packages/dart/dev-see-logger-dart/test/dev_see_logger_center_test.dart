import 'package:dev_see_logger/dev_see_logger.dart';
import 'package:test/test.dart';

void main() {
  late InMemoryEndpointStore endpointStore;

  setUp(() {
    DevSeeLoggerCenter.resetForTesting();
    endpointStore = InMemoryEndpointStore();
    DevSeeLoggerCenter.setEndpointStoreFactoryForTesting((_) => endpointStore);
  });

  tearDown(() {
    DevSeeLoggerCenter.resetForTesting();
  });

  test('configure updates shared logger', () {
    final configuration = DevSeeLoggerConfiguration(
      appId: 'com.example.center',
      serverUri: Uri(scheme: 'http', host: 'localhost', port: 9099),
    );

    DevSeeLoggerCenter.configure(configuration);

    expect(DevSeeLoggerCenter.shared.currentServerUri.toString(),
        'http://localhost:9099');
  });

  test('handleUri returns false for unrelated URI', () {
    final handled =
        DevSeeLoggerCenter.handleUri(Uri.parse('https://example.com'));
    expect(handled, isFalse);
  });

  test('handleUri returns true for valid dev-see URI', () {
    DevSeeLoggerCenter.configure(
      DevSeeLoggerConfiguration(
        appId: 'com.example.center',
        serverUri: Uri(scheme: 'http', host: 'localhost', port: 9099),
      ),
    );

    final handled = DevSeeLoggerCenter.handleUri(
      Uri.parse(
          'dev-see-com.example.app://connect?server_ip=192.168.1.44&server_port=9090'),
    );

    expect(handled, isTrue);
    expect(DevSeeLoggerCenter.shared.currentServerUri.toString(),
        'http://192.168.1.44:9090');
  });

  test('configure uses remembered endpoint when available', () {
    endpointStore.saveEndpoint(
      const DevSeeEndpoint(scheme: 'http', host: '10.10.10.5', port: 10080),
    );

    DevSeeLoggerCenter.configure(
      DevSeeLoggerConfiguration(
        appId: 'com.example.center',
        serverUri: Uri(scheme: 'http', host: 'localhost', port: 9099),
      ),
    );

    expect(DevSeeLoggerCenter.shared.currentServerUri.toString(),
        'http://10.10.10.5:10080');
  });

  test('handleUri persists endpoint for next center bootstrap', () {
    final configuration = DevSeeLoggerConfiguration(
      appId: 'com.example.center',
      serverUri: Uri(scheme: 'http', host: 'localhost', port: 9099),
    );

    DevSeeLoggerCenter.configure(configuration);

    final handled = DevSeeLoggerCenter.handleUri(
      Uri.parse(
          'dev-see-com.example.app://connect?server_ip=172.16.0.2&server_port=8088'),
    );

    expect(handled, isTrue);

    DevSeeLoggerCenter.resetForTesting();
    DevSeeLoggerCenter.setEndpointStoreFactoryForTesting((_) => endpointStore);
    DevSeeLoggerCenter.configure(configuration);

    expect(DevSeeLoggerCenter.shared.currentServerUri.toString(),
        'http://172.16.0.2:8088');
  });
}

class InMemoryEndpointStore implements DevSeeEndpointStore {
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
