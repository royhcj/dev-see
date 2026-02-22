import 'package:dev_see_logger/dev_see_logger.dart';
import 'package:dio/dio.dart';

class DevSeeLoggerDioInterceptor extends Interceptor {
  DevSeeLoggerDioInterceptor({DevSeeLogging? logger})
      : _logger = logger ?? DevSeeLoggerCenter.shared;

  final DevSeeLogging _logger;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    try {
      _logger.markRequestStarted(options);
    } catch (_) {
      // Keep logging failures non-fatal to request flow.
    }
    handler.next(options);
  }

  @override
  void onResponse(
      Response<dynamic> response, ResponseInterceptorHandler handler) {
    try {
      _logger.logCompletedDetached(
        request: response.requestOptions,
        response: response,
        responseBody: response.data,
      );
    } catch (_) {
      // Keep logging failures non-fatal to request flow.
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    try {
      _logger.logCompletedDetached(
        request: err.response?.requestOptions ?? err.requestOptions,
        response: err.response,
        responseBody: err.response?.data,
        error: err,
      );
    } catch (_) {
      // Keep logging failures non-fatal to request flow.
    }
    handler.next(err);
  }
}
