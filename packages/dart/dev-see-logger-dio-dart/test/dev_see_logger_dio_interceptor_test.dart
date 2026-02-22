import 'package:dev_see_logger/dev_see_logger.dart';
import 'package:dev_see_logger_dio/dev_see_logger_dio.dart';
import 'package:dio/dio.dart';
import 'package:test/test.dart';

void main() {
  test('onRequest tracks request start and continues handler chain', () {
    final logger = LoggerSpy();
    final interceptor = DevSeeLoggerDioInterceptor(logger: logger);
    final options = RequestOptions(path: '/users', method: 'GET');
    final handler = TrackingRequestInterceptorHandler();

    interceptor.onRequest(options, handler);

    expect(logger.markedRequests.length, 1);
    expect(logger.markedRequests.single, same(options));
    expect(handler.nextCalled, isTrue);
  });

  test('onResponse logs success path and continues handler chain', () {
    final logger = LoggerSpy();
    final interceptor = DevSeeLoggerDioInterceptor(logger: logger);

    final options = RequestOptions(path: '/users', method: 'GET');
    final response = Response<dynamic>(
      requestOptions: options,
      data: const {'ok': true},
      statusCode: 200,
    );
    final handler = TrackingResponseInterceptorHandler();

    interceptor.onResponse(response, handler);

    expect(logger.completedCalls.length, 1);
    final call = logger.completedCalls.single;
    expect(call.request, same(options));
    expect(call.response, same(response));
    expect(call.responseBody, const {'ok': true});
    expect(call.error, isNull);
    expect(handler.nextCalled, isTrue);
  });

  test('onError logs failure response path and continues handler chain', () {
    final logger = LoggerSpy();
    final interceptor = DevSeeLoggerDioInterceptor(logger: logger);

    final options = RequestOptions(path: '/users', method: 'GET');
    final response = Response<dynamic>(
      requestOptions: options,
      data: const {'message': 'failed'},
      statusCode: 500,
    );
    final error = DioException(
      requestOptions: options,
      response: response,
      type: DioExceptionType.badResponse,
    );
    final handler = TrackingErrorInterceptorHandler();

    interceptor.onError(error, handler);

    expect(logger.completedCalls.length, 1);
    final call = logger.completedCalls.single;
    expect(call.request, same(options));
    expect(call.response, same(response));
    expect(call.responseBody, const {'message': 'failed'});
    expect(call.error, same(error));
    expect(handler.nextCalled, isTrue);
  });

  test('onError without response uses request fallback path', () {
    final logger = LoggerSpy();
    final interceptor = DevSeeLoggerDioInterceptor(logger: logger);

    final options = RequestOptions(path: '/users', method: 'GET');
    final error = DioException(
      requestOptions: options,
      type: DioExceptionType.connectionError,
      error: Exception('network down'),
    );

    final handler = TrackingErrorInterceptorHandler();
    interceptor.onError(error, handler);

    expect(logger.completedCalls.length, 1);
    final call = logger.completedCalls.single;
    expect(call.request, same(options));
    expect(call.response, isNull);
    expect(call.responseBody, isNull);
    expect(call.error, same(error));
    expect(handler.nextCalled, isTrue);
  });
}

class LoggerSpy implements DevSeeLogging {
  final List<Object> markedRequests = <Object>[];
  final List<CompletedCall> completedCalls = <CompletedCall>[];

  @override
  DevSeeRequestToken beginRequest(Object request, {DateTime? at}) {
    return const DevSeeRequestToken(rawValue: 'token');
  }

  @override
  Future<void> log({
    required Object request,
    Object? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? startedAt,
    DateTime? endedAt,
  }) async {}

  @override
  Future<void> logCompleted({
    DevSeeRequestToken? token,
    required Object request,
    Object? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? endedAt,
  }) async {}

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
    completedCalls.add(
      CompletedCall(
        request: request,
        response: response,
        responseBody: responseBody,
        error: error,
      ),
    );
  }

  @override
  void markRequestStarted(Object request, {DateTime? at}) {
    markedRequests.add(request);
  }
}

class CompletedCall {
  CompletedCall({
    required this.request,
    required this.response,
    required this.responseBody,
    required this.error,
  });

  final Object request;
  final Object? response;
  final Object? responseBody;
  final Object? error;
}

class TrackingRequestInterceptorHandler extends RequestInterceptorHandler {
  bool nextCalled = false;

  @override
  void next(RequestOptions requestOptions) {
    nextCalled = true;
  }
}

class TrackingResponseInterceptorHandler extends ResponseInterceptorHandler {
  bool nextCalled = false;

  @override
  void next(Response<dynamic> response) {
    nextCalled = true;
  }
}

class TrackingErrorInterceptorHandler extends ErrorInterceptorHandler {
  bool nextCalled = false;

  @override
  void next(DioException error) {
    nextCalled = true;
  }
}
