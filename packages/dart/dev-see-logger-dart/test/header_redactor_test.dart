import 'package:dev_see_logger/dev_see_logger.dart';
import 'package:test/test.dart';

void main() {
  test('default sensitive headers are redacted', () {
    final redactor = HeaderRedactor();

    final redacted = redactor.redact(const {
      'Authorization': 'Bearer secret',
      'Cookie': 'session=abc',
      'Set-Cookie': 'id=123',
      'X-API-Key': 'api-key',
      'Accept': 'application/json',
    });

    expect(redacted?['Authorization'], '[REDACTED]');
    expect(redacted?['Cookie'], '[REDACTED]');
    expect(redacted?['Set-Cookie'], '[REDACTED]');
    expect(redacted?['X-API-Key'], '[REDACTED]');
    expect(redacted?['Accept'], 'application/json');
  });

  test('non sensitive headers stay unchanged', () {
    final redactor = HeaderRedactor();

    final redacted = redactor.redact(const {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    });

    expect(redacted?['Accept'], 'application/json');
    expect(redacted?['Content-Type'], 'application/json');
  });
}
