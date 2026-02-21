// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "dev-see-logger-moya",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .tvOS(.v15),
        .watchOS(.v8),
    ],
    products: [
        .library(
            name: "DevSeeLoggerMoya",
            targets: ["DevSeeLoggerMoya"]
        ),
    ],
    dependencies: [
        .package(path: "../dev-see-logger-swift"),
        .package(url: "https://github.com/Moya/Moya.git", from: "15.0.0"),
    ],
    targets: [
        .target(
            name: "DevSeeLoggerMoya",
            dependencies: [
                .product(name: "DevSeeLogger", package: "dev-see-logger-swift"),
                .product(name: "Moya", package: "Moya"),
            ]
        ),
        .testTarget(
            name: "DevSeeLoggerMoyaTests",
            dependencies: ["DevSeeLoggerMoya"]
        ),
    ]
)
