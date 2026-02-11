# dev-see Tech Stack

> Last updated: 2026-02-12

This document outlines the technology choices for dev-see, a debugging tool for monitoring mobile API traffic. dev-see runs in two modes: as a standalone desktop application, or embedded directly inside mobile apps for in-app debugging.

---

## 📋 Stack Overview

| Layer | Technologies |
|-------|-------------|
| **Desktop App** | Tauri |
| **Embedded Mode** | WKWebView (iOS), WebView (Android) |
| **Frontend** | Vite, Svelte, TypeScript |
| **Backend** | Node.js, Fastify, TypeScript (desktop mode only) |
| **Storage** | SQLite (persistent), In-memory ring buffer (real-time) |
| **Transport** | WebSocket (desktop), JavaScript Bridge (embedded) |
| **Mobile Web** | PWA → Capacitor (optional) |

---

## 🎯 Deployment Modes

dev-see supports **two deployment architectures** to maximize flexibility for different use cases:

### 1. Desktop Mode (Primary)
**Architecture**: Standalone desktop application

```
┌─────────────────┐
│  Mobile App     │
│  (iOS/Android)  │
└────────┬────────┘
         │ WebSocket/HTTP
         │ (sends logs over network)
         ▼
┌─────────────────┐
│   dev-see       │
│ Desktop App     │
│ (Tauri)         │
│                 │
│ • Fastify       │
│ • SQLite        │
│ • Svelte UI     │
└─────────────────┘
```

**Use Cases**:
- Developers at their desk
- Debugging on simulator/emulator
- Reviewing historical logs
- Multiple devices connecting to one viewer

**Benefits**:
- Full desktop experience (keyboard shortcuts, multiple windows)
- Unlimited storage
- Better performance for large datasets
- Screen real estate for complex UIs

---

### 2. Embedded Mode (In-App Viewer)
**Architecture**: Svelte UI embedded in mobile app via WebView

```
┌─────────────────────────────┐
│     Mobile App              │
│  ┌───────────────────────┐  │
│  │  dev-see Embedded     │  │
│  │  (WKWebView/WebView)  │  │
│  │                       │  │
│  │  • Svelte UI          │  │
│  │  • In-memory storage  │  │
│  │  • JS Bridge ←→ Native│  │
│  └───────────────────────┘  │
│         ▲                    │
│         │ (direct access)    │
│         │                    │
│  ┌──────┴───────┐            │
│  │  Log Store   │            │
│  │  (in-memory) │            │
│  └──────────────┘            │
└─────────────────────────────┘
```

**Use Cases**:
- QA testers on physical devices
- Beta testers in the field
- Internal debug builds (TestFlight, Firebase App Distribution)
- No network setup required

**Benefits**:
- Zero configuration - works offline
- No separate app installation needed
- Instant access via shake gesture or debug menu
- Perfect for on-device testing

**Access Pattern**:
```swift
// iOS: Triple tap or shake to open
class DebugMenu {
    static func show() {
        let devSee = DevSeeViewController()
        UIApplication.topViewController()?.present(devSee, animated: true)
    }
}
```

---

### Shared Component Architecture

Both modes use the **same Svelte UI components**:

```
packages/
├── ui-core/              # Shared Svelte components
│   ├── LogList.svelte
│   ├── LogDetail.svelte
│   ├── JsonViewer.svelte
│   ├── SearchBar.svelte
│   └── Timeline.svelte
│
├── desktop/              # Desktop mode
│   ├── src-tauri/        # Rust + Fastify
│   └── src/              # Svelte app (imports ui-core)
│
└── embedded/             # Embedded mode
    ├── src/              # Svelte app (imports ui-core)
    ├── dist/             # Built bundle for mobile
    ├── ios/              # WKWebView bridge
    └── android/          # WebView bridge
```

**Data Source Abstraction**:
```typescript
// Adapter pattern: Switch data source based on mode
interface LogDataSource {
  subscribe(callback: (logs: ApiLog[]) => void): void;
  search(query: string): ApiLog[];
  export(format: 'json' | 'har'): Blob;
}

// Desktop mode: WebSocket to Fastify server
class WebSocketDataSource implements LogDataSource { }

// Embedded mode: JavaScript bridge to native
class NativeBridgeDataSource implements LogDataSource { }
```

---

## 🎨 Frontend (Viewer UI)

### Core Framework
- **Vite** – Lightning-fast dev server and optimized production builds
- **Svelte** – Reactive UI framework with minimal runtime overhead
- **TypeScript** – Type safety and better developer experience

**Why Svelte?**
- Smaller bundle size than React/Vue
- Built-in reactivity (no virtual DOM overhead)
- Excellent performance for real-time data updates
- Simple syntax, great for rapid prototyping

### State Management
- **Svelte stores** – Built-in reactive stores for shared state
- **Context API** – For component tree state
- Keep it simple: use local component state by default, stores only when needed

### Real-time Communication
- **Native WebSocket API** – Primary transport for live API log streaming
- **Server-Sent Events (SSE)** – Optional fallback for read-only scenarios
- **Reconnection logic** – Exponential backoff with jitter

### Data Visualization

**JSON Rendering**
- **[@uiw/json-view](https://www.npmjs.com/package/@uiw/json-view)** – Lightweight, customizable JSON tree viewer
- Alternative: **svelte-json-view**

**Diff Visualization**
- **[jsondiffpatch](https://github.com/benjamine/jsondiffpatch)** – For comparing request/response over time
- Visual diff for debugging payload changes

**Syntax Highlighting**
- **[Shiki](https://shiki.style/)** – Accurate syntax highlighting using VSCode themes
- Alternative: **highlight.js** (smaller, simpler)
- Support: JSON, XML, cURL, HTTP headers

**Traffic Visualization**
- **[Apache ECharts](https://echarts.apache.org/)** – For timeline charts and performance metrics
- Lightweight alternative: **uPlot** for simpler graphs

### Styling
- **Tailwind CSS** – Utility-first CSS, rapid prototyping
- **CSS Variables** – For status colors and theme support
  - Success: `--color-success`
  - Error: `--color-error`
  - Warning: `--color-warning`
- **Dark mode first** – Use Tailwind's dark mode classes

### Additional Frontend Libraries
- **[date-fns](https://date-fns.org/)** – Lightweight date formatting
- **[Fuse.js](https://fusejs.io/)** – Fuzzy search for filtering logs
- **[file-saver](https://github.com/eligrey/FileSaver.js/)** – For exporting logs (JSON, HAR, CSV)

---

## 🧠 Backend (Log Collector Server)

### Core Runtime
- **Node.js** (v20+ LTS)
- **TypeScript** – Strict mode enabled

**Why Node.js?**
- Excellent WebSocket ecosystem
- Easy to bundle with Tauri
- Fast prototyping with strong typing
- Future migration path to Rust if needed

### Web Framework
- **[Fastify](https://fastify.dev/)** – Fast, low-overhead web framework

**Why Fastify?**
- 2-3x faster than Express
- First-class TypeScript support
- Built-in schema validation
- Excellent WebSocket plugin support
- Request/response logging out of the box

### Key Fastify Plugins
- **[@fastify/websocket](https://github.com/fastify/fastify-websocket)** – WebSocket support
- **[@fastify/cors](https://github.com/fastify/fastify-cors)** – CORS handling for local network access
- **[@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit)** – Prevent abuse in multi-client scenarios

### Transport & Protocol

**HTTP Endpoint**
- `POST /api/logs` – Accept individual API log entries
- JSON body with request/response data

**WebSocket Endpoint**
- `WS /ws` – Live streaming of API logs
- Binary protocol: **MessagePack** for efficient serialization
- Fallback: JSON for debugging

### Data Storage

**In-Memory (Ring Buffer)**
- **[Circular Buffer](https://www.npmjs.com/package/circular-buffer)** implementation
- Keep last 10,000 requests by default
- Configurable size
- Instant access for UI

**Persistent Storage**
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** – Fast, synchronous SQLite
- Store all logs with option to clear
- Enable replay of past sessions
- Full-text search on request/response bodies

**Schema**
```sql
CREATE TABLE api_logs (
  id INTEGER PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  status_code INTEGER,
  request_headers TEXT,
  request_body TEXT,
  response_headers TEXT,
  response_body TEXT,
  duration_ms INTEGER,
  app_id TEXT,
  session_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

### Data Validation
- **[Zod](https://zod.dev/)** – Runtime schema validation
- Validate incoming log payloads
- Type-safe configuration

### Logging & Observability
- **[pino](https://getpino.io/)** – Fast JSON logger (pairs well with Fastify)
- Log levels: debug, info, warn, error
- Pretty-print in development, JSON in production

### Export Formats
- **JSON** – Raw structured data
- **[HAR](http://www.softwareishard.com/blog/har-12-spec/)** (HTTP Archive) – Standard format for HTTP traffic
- **CSV** – For spreadsheet analysis
- **cURL** – Copy as cURL command for replay

---

## 🖥 Desktop Application

### Framework
- **[Tauri](https://tauri.app/)** v2+

**Why Tauri?**
- 10-20x smaller than Electron (~5MB vs 50MB+ installer)
- Uses native system WebView (WebKit on macOS, WebView2 on Windows)
- Written in Rust – memory safe, fast
- Better security model (no Node.js in renderer)
- Smaller memory footprint
- Native system tray, menu bar, notifications
- Auto-updater built-in

### Tauri Capabilities
- **Window management** – Multiple windows, always-on-top mode
- **System tray** – Quick access, minimize to tray
- **Native dialogs** – File picker for export
- **Auto-updates** – GitHub Releases integration
- **Deep links** – `devsee://` protocol for SDK configuration

### Bundling
- Frontend (Vite build) → Tauri embed
- Backend (Fastify server) → Runs as part of Tauri backend (Rust can spawn Node.js)
- SQLite database → Store in app data directory

**Important**: The Fastify server **only runs in desktop mode**. Embedded mode does not include or need a Node.js server.

### Distribution
- **macOS**: `.dmg` + notarization
- **Windows**: `.msi` installer + code signing
- **Linux**: `.deb`, `.AppImage`

---

## 📱 Embedded Mobile Viewer

### Overview
The **embedded mode** allows dev-see to run directly inside mobile apps as an in-app debug viewer. Perfect for QA testers and beta testers who need to inspect API logs on physical devices without a desktop computer.

**⚠️ Important**: Embedded mode does **NOT** run a Node.js server inside the mobile app. Instead:
- Logs are stored in **native Swift/Kotlin in-memory storage**
- Svelte UI runs in a **WebView** (uses JavaScriptCore/WebKit, which is allowed by Apple)
- Communication happens via **JavaScript bridge** (native ↔ web)
- **No network server**, no Fastify, no Node.js runtime
- 100% App Store compliant

### Why This Approach is App Store Safe

**What Apple Allows:**
✅ **WKWebView with bundled HTML/JS** – Standard webview component using system WebKit
✅ **JavaScript executed by JavaScriptCore** – Apple's built-in JavaScript engine
✅ **Native ↔ JS bridges** – Standard `WKScriptMessageHandler` API
✅ **Bundled static assets** – HTML, CSS, JS files in app bundle

**What Apple Prohibits:**
❌ **Embedded runtimes** (Node.js, Python, Ruby via nodejs-mobile, etc.)
❌ **Downloading and executing code** from remote servers
❌ **Interpreters that execute arbitrary code** (unless sandboxed like JavaScriptCore)

**Our Approach:**
- Svelte compiles to plain JavaScript (just like any web app)
- WKWebView executes this JavaScript using Apple's own JavaScriptCore
- No different from apps like **Basecamp, Hey, or any hybrid app**
- Same technology used by React Native WebView components

**Similar Approved Apps:**
- Expo Go (React Native)
- Ionic apps
- Cordova/PhoneGap apps
- Any app with embedded documentation viewer

---

### iOS Implementation

**Technology**: WKWebView + Swift

```swift
// DevSeeViewController.swift
import WebKit

public class DevSeeViewController: UIViewController {
    private var webView: WKWebView!
    private let logStore: DevSeeLogStore

    public init(logStore: DevSeeLogStore = .shared) {
        self.logStore = logStore
        super.init(nibName: nil, bundle: nil)
    }

    public override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        setupBridge()
        loadUI()
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)
    }

    private func setupBridge() {
        // JavaScript → Native bridge
        webView.configuration.userContentController.add(
            self,
            name: "devSeeBridge"
        )
    }

    private func loadUI() {
        // Load bundled Svelte app
        if let htmlPath = Bundle.main.url(
            forResource: "devsee-embedded/index",
            withExtension: "html"
        ) {
            webView.loadFileURL(htmlPath, allowingReadAccessTo: htmlPath.deletingLastPathComponent())
        }
    }
}

// WKScriptMessageHandler implementation
extension DevSeeViewController: WKScriptMessageHandler {
    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "devSeeBridge" else { return }

        // Handle JS → Native calls
        if let body = message.body as? [String: Any],
           let action = body["action"] as? String {
            switch action {
            case "getLogs":
                sendLogsToJS()
            case "clearLogs":
                logStore.clear()
            case "export":
                exportLogs(format: body["format"] as? String ?? "json")
            default:
                break
            }
        }
    }

    private func sendLogsToJS() {
        let logs = logStore.getAllLogs()
        let json = try? JSONSerialization.data(withJSONObject: logs.map { $0.toDictionary() })
        if let jsonString = String(data: json ?? Data(), encoding: .utf8) {
            webView.evaluateJavaScript("window.receiveNativeLogs(\(jsonString))")
        }
    }
}
```

**Integration Example**:
```swift
// In your app - Add debug menu trigger
#if DEBUG
import DevSeeSDK

// Trigger via shake gesture
class AppDelegate: UIResponder, UIApplicationDelegate {
    override func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
        if motion == .motionShake {
            showDevSee()
        }
    }

    func showDevSee() {
        let devSee = DevSeeViewController()
        UIApplication.shared.topViewController()?.present(devSee, animated: true)
    }
}
#endif
```

---

### Android Implementation

**Technology**: WebView + Kotlin

```kotlin
// DevSeeActivity.kt
import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.*
import androidx.appcompat.app.AppCompatActivity

class DevSeeActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private val logStore = DevSeeLogStore.getInstance()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
            }

            // Native → JS bridge
            addJavascriptInterface(
                DevSeeBridge(logStore),
                "devSeeBridge"
            )

            webViewClient = WebViewClient()

            // Load embedded UI
            loadUrl("file:///android_asset/devsee-embedded/index.html")
        }

        setContentView(webView)
    }

    // JavaScript bridge
    inner class DevSeeBridge(private val logStore: DevSeeLogStore) {
        @JavascriptInterface
        fun getLogs(): String {
            val logs = logStore.getAllLogs()
            return Gson().toJson(logs)
        }

        @JavascriptInterface
        fun clearLogs() {
            logStore.clear()
            webView.post {
                webView.evaluateJavascript("window.onLogsCleared()", null)
            }
        }

        @JavascriptInterface
        fun exportLogs(format: String): String {
            return when (format) {
                "json" -> Gson().toJson(logStore.getAllLogs())
                "har" -> HarExporter.export(logStore.getAllLogs())
                else -> ""
            }
        }
    }
}
```

**Integration Example**:
```kotlin
// In your app - Add debug menu trigger
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Trigger via long press on app icon or shake
        if (BuildConfig.DEBUG) {
            findViewById<View>(R.id.app_icon).setOnLongClickListener {
                showDevSee()
                true
            }
        }
    }

    private fun showDevSee() {
        startActivity(Intent(this, DevSeeActivity::class.java))
    }
}
```

---

### Flutter Integration

For Flutter apps, create a platform channel:

```dart
// dev_see_embedded.dart
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

class DevSeeEmbedded extends StatefulWidget {
  @override
  _DevSeeEmbeddedState createState() => _DevSeeEmbeddedState();
}

class _DevSeeEmbeddedState extends State<DevSeeEmbedded> {
  late WebViewController _controller;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('dev-see')),
      body: WebView(
        initialUrl: 'file:///path/to/devsee-embedded/index.html',
        javascriptMode: JavascriptMode.unrestricted,
        onWebViewCreated: (controller) {
          _controller = controller;
          _setupBridge();
        },
      ),
    );
  }

  void _setupBridge() {
    // Use platform channels to communicate with native log store
  }
}
```

---

### Embedded Bundle Structure

```
packages/embedded/
├── dist/                    # Built Svelte app
│   ├── index.html
│   ├── assets/
│   │   ├── index.js         # < 100KB minified
│   │   └── index.css
│   └── bridge.js            # Native bridge adapter
│
├── ios/
│   ├── DevSeeViewController.swift
│   ├── DevSeeLogStore.swift
│   └── DevSee.podspec       # CocoaPods distribution
│
├── android/
│   ├── DevSeeActivity.kt
│   ├── DevSeeBridge.kt
│   └── build.gradle
│
└── src/                     # Svelte source
    ├── main.ts
    ├── App.svelte
    └── adapters/
        └── NativeBridge.ts  # Abstract data source
```

---

### Bundle Size Optimization

Critical for embedded mode:

```javascript
// vite.config.ts for embedded build
export default defineConfig({
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: undefined, // Single bundle
      },
    },
  },
  // Tree-shake unused features
  define: {
    'import.meta.env.MODE': JSON.stringify('embedded'),
  },
});
```

**Target Size**: < 150KB total (HTML + JS + CSS)

---

### Standalone Mobile Web App (Optional)

For external access without embedding:

**Phase 1: PWA (Progressive Web App)**
- Access via mobile browser (Safari, Chrome)
- Add to home screen
- Service worker for offline support
- Responsive design with Tailwind breakpoints

**Phase 2: Capacitor Wrapper (Optional)**
- **[Capacitor](https://capacitorjs.com/)** – Wrap Svelte app
- Standalone app distributed via TestFlight or Play Store
- Useful if you want a separate viewer app

---

## 🛠 Developer Tooling

### Monorepo Structure
```
dev-see/
├── apps/
│   ├── desktop/        # Tauri app (desktop mode)
│   ├── web/            # Standalone web version (optional)
│   └── embedded/       # Embedded viewer (WebView bundle)
├── packages/
│   ├── ui-core/        # Shared Svelte components
│   ├── server/         # Fastify backend (desktop mode only)
│   ├── types/          # Shared TypeScript types
│   ├── sdk-ios/        # iOS SDK + embedded viewer
│   ├── sdk-android/    # Android SDK + embedded viewer
│   ├── sdk-flutter/    # Flutter/Dart SDK
│   └── sdk-react-native/ # React Native SDK
└── docs/
```

**Monorepo Tool**
- **[pnpm workspaces](https://pnpm.io/workspaces)** – Fast, disk-efficient
- Alternative: **Turborepo** for advanced caching

### Package Manager
- **pnpm** – Saves disk space, faster than npm/yarn

### Code Quality
- **ESLint** – Linting (svelte, typescript configs)
- **Prettier** – Code formatting
- **TypeScript strict mode** – Catch bugs early

### Testing

**Unit Tests**
- **[Vitest](https://vitest.dev/)** – Fast, Vite-native test runner
- Compatible with Jest API
- Component testing with `@testing-library/svelte`

**Integration Tests**
- Test WebSocket connections
- Test API log ingestion
- SQLite data persistence

**E2E Tests**
- **[Playwright](https://playwright.dev/)** – Cross-browser E2E testing
- Test full user flows: receive log → display → search → export

### Version Control
- **Git** with conventional commits
- Changesets for version management across packages

---

## 📦 Client SDKs

To make dev-see easy to integrate, we'll provide lightweight SDKs that support **both desktop and embedded modes**.

### iOS (Swift)
- **Swift Package Manager** distribution
- HTTP interceptor using `URLSessionConfiguration`
- **Includes embedded viewer**: `DevSeeViewController` for in-app debugging
- SwiftUI + UIKit support
- Size: ~500KB (SDK) + ~150KB (embedded UI bundle)

```swift
import DevSeeSDK

// Configure in AppDelegate
DevSee.configure(
    mode: .desktop, // or .embedded
    serverURL: "ws://localhost:9090"
)

// Show embedded viewer (debug builds only)
#if DEBUG
DevSee.showEmbeddedViewer()
#endif
```

### Android (Kotlin)
- **Maven Central** distribution
- OkHttp Interceptor
- **Includes embedded viewer**: `DevSeeActivity` for in-app debugging
- Kotlin Coroutines for async
- Size: ~600KB (SDK) + ~150KB (embedded UI assets)

```kotlin
import com.devsee.sdk.DevSee

// Configure in Application class
DevSee.configure(
    mode = DevSeeMode.DESKTOP, // or EMBEDDED
    serverUrl = "ws://localhost:9090"
)

// Show embedded viewer (debug builds only)
if (BuildConfig.DEBUG) {
    DevSee.showEmbeddedViewer(context)
}
```

### Flutter (Dart)
- **pub.dev** distribution
- Dio interceptor or http middleware
- **Embedded viewer via platform channel**
- Works on iOS + Android

```dart
import 'package:dev_see/dev_see.dart';

// Configure
await DevSee.configure(
  mode: DevSeeMode.desktop, // or DevSeeMode.embedded
  serverUrl: 'ws://localhost:9090',
);

// Show embedded viewer
DevSee.showEmbeddedViewer();
```

### React Native (JavaScript/TypeScript)
- **npm** package
- Axios/Fetch interceptor
- **Native embedded viewer via native modules**

```typescript
import DevSee from 'dev-see-react-native';

// Configure
DevSee.configure({
  mode: 'desktop', // or 'embedded'
  serverUrl: 'ws://localhost:9090',
});

// Show embedded viewer (requires native modules)
if (__DEV__) {
  DevSee.showEmbeddedViewer();
}
```

---

### SDK Features

**Dual Mode Support**
- **Desktop mode**: Send logs to external dev-see desktop app via WebSocket/HTTP
- **Embedded mode**: Store logs locally and display in embedded WebView
- Runtime mode switching (useful for different test scenarios)

**Core Features**
- Zero-config: Auto-detect dev-see server on local network (desktop mode)
- Debug-only: Completely stripped from production builds (using compiler flags)
- Redaction: Auto-redact sensitive headers (Authorization, Cookie, API keys)
- Filtering: Ignore specific endpoints (analytics, crashlytics, etc.)
- Performance: Minimal overhead (< 1ms per request)

**Data Capture**
- Request: Method, URL, headers, body (with size limits)
- Response: Status, headers, body, timing
- Metadata: Timestamp, app version, device info, session ID

**Smart Features**
- Automatic HAR export
- Request replay (copy as cURL)
- Session management (group requests by user session)
- Network reachability detection

---

## 🔒 Security Considerations

### Local Network Access
- CORS configuration for LAN access
- Optional authentication token for shared team use
- Disable in production builds (SDK level)

### Data Sensitivity
- **Redact sensitive data** by default:
  - Authorization headers
  - API keys
  - Passwords in request bodies
- User-configurable redaction rules

### Tauri Security
- CSP (Content Security Policy)
- No remote code execution
- Sandboxed renderer process

### Embedded Mode Security & Compliance
- **No Node.js runtime** – Only native Swift/Kotlin + WKWebView/WebView
- **App Store compliant** – Uses standard WebView APIs (WKScriptMessageHandler, JavascriptInterface)
- **No code download** – All UI assets bundled in app binary
- **Sandboxed JavaScript** – Executed by system's JavaScriptCore/V8
- **Debug-only** – Entire viewer stripped from production builds via `#if DEBUG` / `if (BuildConfig.DEBUG)`

---

## 🚀 Performance Targets

### Desktop Mode

| Metric | Target |
|--------|--------|
| **Startup time** | < 2 seconds |
| **Log ingestion** | 1000+ logs/second |
| **Memory usage** | < 200MB with 10k logs |
| **UI frame rate** | 60 FPS during live updates |
| **Search latency** | < 100ms for 10k logs |

### Embedded Mode

| Metric | Target |
|--------|--------|
| **Bundle size** | < 150KB (minified + gzipped) |
| **Initial load time** | < 500ms |
| **Memory overhead** | < 30MB with 1k logs |
| **UI responsiveness** | < 16ms frame time (60 FPS) |
| **SDK overhead** | < 1ms per request |

---

## 📈 Future Considerations

### Potential Enhancements
- **Rust backend rewrite** – For even better performance
- **Cloud sync** – Optional backup to cloud storage
- **Team features** – Share logs with teammates
- **AI-powered insights** – Detect anomalies, suggest fixes
- **Plugin system** – Custom parsers, exporters
- **gRPC support** – Beyond HTTP/REST

### Monitoring Stack (If needed)
- **Sentry** – Error tracking
- **PostHog** – Privacy-friendly analytics

---

## 📚 Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-12 | Chose Tauri over Electron | Smaller bundle size, better performance, native feel |
| 2026-02-12 | Chose Svelte over React | Simpler reactivity model, better perf for real-time updates |
| 2026-02-12 | Chose Fastify over Express | 2-3x faster, better TypeScript support |
| 2026-02-12 | In-memory + SQLite hybrid | Balance between speed and persistence |
| 2026-02-12 | MessagePack for WebSocket | More efficient than JSON for high-frequency updates |
| 2026-02-12 | Added embedded mode (WKWebView/WebView) | Enable in-app debugging for QA testers without desktop setup |
| 2026-02-12 | Shared Svelte UI for both modes | DRY principle, maintain feature parity, reduce maintenance burden |
| 2026-02-12 | No Node.js in embedded mode | Apple App Store prohibits embedded runtimes; use native storage + JS bridge instead |

---

## 🎯 Next Steps

1. **Prototype** – Build MVP with basic request/response viewer
2. **Benchmark** – Test WebSocket throughput and memory usage
3. **UI mockups** – Design main interface in Figma
4. **SDK proof-of-concept** – Create minimal iOS interceptor
5. **Documentation** – Write integration guides

---

## References

- [Tauri Documentation](https://tauri.app/)
- [Svelte Documentation](https://svelte.dev/)
- [Fastify Documentation](https://fastify.dev/)
- [HAR Spec](http://www.softwareishard.com/blog/har-12-spec/)
- [MessagePack](https://msgpack.org/)
