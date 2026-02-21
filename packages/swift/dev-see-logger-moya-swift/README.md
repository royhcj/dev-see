# DevSeeLoggerMoya

First-party Moya adapter for `DevSeeLogger`.

This package depends on:

1. `DevSeeLogger` for core logging behavior.
2. `Moya` for plugin integration.

## Usage

```swift
import DevSeeLogger
import DevSeeLoggerMoya
import Moya

DevSeeLoggerCenter.configure(
    DevSeeLoggerConfiguration(
        appId: Bundle.main.bundleIdentifier ?? "com.example.app",
        serverURL: URL(string: "http://127.0.0.1:9090")!
    )
)

let provider = MoyaProvider<MyAPI>(plugins: [DevSeeLoggerMoyaPlugin()])
```
