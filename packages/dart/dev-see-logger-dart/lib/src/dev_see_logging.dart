import 'dev_see_request_token.dart';

abstract interface class DevSeeLogging {
  DevSeeRequestToken beginRequest(Object request, {DateTime? at});

  void markRequestStarted(Object request, {DateTime? at});

  Future<void> log({
    required Object request,
    Object? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? startedAt,
    DateTime? endedAt,
  });

  Future<void> logCompleted({
    DevSeeRequestToken? token,
    required Object request,
    Object? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? endedAt,
  });

  void logCompletedDetached({
    DevSeeRequestToken? token,
    required Object request,
    Object? response,
    Object? responseBody,
    Object? requestBody,
    Object? error,
    DateTime? endedAt,
  });
}
