import 'dev_see_connection_result.dart';
import 'dev_see_endpoint_store.dart';
import 'dev_see_logger.dart';
import 'dev_see_logger_configuration.dart';

class DevSeeLoggerCenter {
  static final Uri defaultServerUri = Uri.parse('http://127.0.0.1:9090');

  static DevSeeLogger? _sharedLogger;
  static DevSeeLoggerConfiguration? _sharedConfiguration;

  static DevSeeEndpointStore Function(String appId) _endpointStoreFactory =
      (appId) => DevSeeFileEndpointStore(appId: appId);

  static void configure(DevSeeLoggerConfiguration configuration) {
    if (_sharedConfiguration == configuration && _sharedLogger != null) {
      return;
    }

    _sharedConfiguration = configuration;
    _sharedLogger = DevSeeLogger(
      configuration: configuration,
      endpointStore: _endpointStoreFactory(configuration.appId),
    );
  }

  static DevSeeLogger get shared {
    final logger = _sharedLogger;
    if (logger != null) {
      return logger;
    }

    final configuration = _defaultConfiguration();
    final created = DevSeeLogger(
      configuration: configuration,
      endpointStore: _endpointStoreFactory(configuration.appId),
    );
    _sharedConfiguration = configuration;
    _sharedLogger = created;
    return created;
  }

  static bool handleUri(Uri uri) {
    final result = shared.handleUri(uri);
    return result.type != DevSeeConnectionResultType.ignored;
  }

  static void resetForTesting() {
    _sharedConfiguration = null;
    _sharedLogger = null;
    _endpointStoreFactory = (appId) => DevSeeFileEndpointStore(appId: appId);
  }

  static void setEndpointStoreFactoryForTesting(
    DevSeeEndpointStore Function(String appId) factory,
  ) {
    _endpointStoreFactory = factory;
  }

  static DevSeeLoggerConfiguration _defaultConfiguration() {
    return DevSeeLoggerConfiguration(
      appId: 'dev.see.app',
      serverUri: defaultServerUri,
    );
  }
}
