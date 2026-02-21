import DevSeeLogger
import Foundation
import Moya
import XCTest
@testable import DevSeeLoggerMoya

private enum MockTarget: TargetType {
    case users

    var baseURL: URL { URL(string: "https://api.example.com")! }
    var path: String { "/v1/users" }
    var method: Moya.Method { .post }
    var sampleData: Data { Data() }
    var task: Task { .requestPlain }
    var headers: [String: String]? {
        [
            "Accept": "application/json",
            "X-Request-ID": "abc123",
        ]
    }
}

final class DevSeeLoggerMoyaPluginTests: XCTestCase {
    func testMakeFallbackRequestMapsTargetFields() {
        let logger = DevSeeLogger(
            configuration: DevSeeLoggerConfiguration(
                appId: "com.example.test",
                serverURL: URL(string: "http://localhost:9090")!
            )
        )
        let plugin = DevSeeLoggerMoyaPlugin(logger: logger)

        let request = plugin.makeFallbackRequest(for: MockTarget.users)

        XCTAssertEqual(request.url?.absoluteString, "https://api.example.com/v1/users")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/json")
        XCTAssertEqual(request.value(forHTTPHeaderField: "X-Request-ID"), "abc123")
    }
}
