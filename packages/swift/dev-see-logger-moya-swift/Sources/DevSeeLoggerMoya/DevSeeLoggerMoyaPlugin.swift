import DevSeeLogger
import Foundation
import Moya

public final class DevSeeLoggerMoyaPlugin: PluginType {
    private let logger: DevSeeLogger

    public init(logger: DevSeeLogger = DevSeeLoggerCenter.shared) {
        self.logger = logger
    }

    public func willSend(_ request: RequestType, target: TargetType) {
        guard let request = request.request else { return }
        logger.markRequestStarted(request)
    }

    public func didReceive(_ result: Result<Moya.Response, MoyaError>, target: TargetType) {
        switch result {
        case .success(let response):
            guard let request = response.request else { return }
            logger.logCompletedDetached(
                request: request,
                response: response.response,
                responseBody: response.data
            )

        case .failure(let error):
            let request = error.response?.request ?? makeFallbackRequest(for: target)
            let response = error.response?.response
            let responseBody = error.response?.data
            logger.logCompletedDetached(
                request: request,
                response: response,
                responseBody: responseBody,
                error: error
            )
        }
    }
}

extension DevSeeLoggerMoyaPlugin {
    func makeFallbackRequest(for target: TargetType) -> URLRequest {
        let normalizedPath = target.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let url = target.baseURL.appendingPathComponent(normalizedPath)

        var request = URLRequest(url: url)
        request.httpMethod = target.method.rawValue
        target.headers?.forEach {
            request.setValue($0.value, forHTTPHeaderField: $0.key)
        }
        return request
    }
}
