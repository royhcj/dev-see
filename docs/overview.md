# dev-see Phase 1 Overview

> Last updated: 2026-02-13

## Scope

**Phase 1 is a minimal viable product focused on cross-platform access: both desktop and browser.**

This phase delivers the core debugging experience: a lightweight server that captures API logs and a beautiful UI to view them—accessible from a native desktop app (macOS) or any modern web browser. No mobile SDKs, no embedded mode, no advanced features—just the essentials to prove the concept works.

**Target**: Mac desktop application + Web browser (any modern browser on any platform)

---

## Goals

1. **Prove the concept** – Show that real-time API log viewing is useful
2. **Build core infrastructure** – Establish patterns for server, UI, and data flow
3. **Deliver value quickly** – Get a working tool in developers' hands within weeks
4. **Foundation for growth** – Design architecture to support future platforms (iOS, Android, etc.)

---

## Requirements

### Functional Requirements

#### 1. Server (Fastify)
- Accept API logs via HTTP `POST /api/logs`
- Stream live logs to connected UI via WebSocket `WS /ws`
- Store logs in in-memory ring buffer (latest 1,000 requests)
- Support basic filtering and search
- Export logs as JSON
- Serve the web UI (static files) on the same server

#### 2. UI (Svelte + Vite) - Cross-Platform
- Display live list of API requests
- Show request/response details (method, URL, status, headers, body)
- Search and filter requests
- Clear all logs
- Export logs to JSON file
- **Works in both desktop (Tauri) and web browser contexts**

#### 3. Desktop Application (Tauri) - Optional
- Single-window native app for macOS
- Bundles the Fastify server
- Auto-start capability
- System tray icon (optional for MVP)
- Minimize to background
- Users can also access via browser on same machine or network

#### 4. Web Deployment
- Fastify server can run as standalone web service
- UI accessible via web browser at `http://localhost:9090` or deployed domain
- Works on any modern browser (Chrome, Firefox, Safari, Edge)

### Non-Functional Requirements

#### Desktop App (Tauri)
- **Performance**: Handle 100+ logs/second without lag
- **Memory**: Use < 100MB RAM with 1,000 stored logs
- **Startup**: Launch in < 2 seconds
- **Compatibility**: macOS 12+ (Intel & Apple Silicon)

#### Web Version
- **Performance**: Handle 100+ logs/second without lag
- **Browser Compatibility**: Latest versions of Chrome, Firefox, Safari, Edge
- **UI Load Time**: < 500ms from server
- **Network Latency**: Support reasonable network latency (>50ms acceptable for WebSocket)

---

## Out of Scope (Phase 2+)

- iOS/Android client SDKs
- Embedded in-app viewer
- Persistent database (beyond current session)
- Advanced analytics or insights
- Team/multi-user features
- Cloud sync
- Windows/Linux desktop app support (web version works on any OS)
- Authentication/user management (Phase 2 if needed)

---

## Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     dev-see Server                          │
│                   (Node.js + Fastify)                       │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  - POST /api/logs (accept logs)                   │    │
│  │  - WS /ws (stream logs)                           │    │
│  │  - Static files (Svelte UI)                       │    │
│  └────────────────────────────────────────────────────┘    │
│                        │                                    │
└─────────────┬──────────┼──────────────┬────────────────────┘
              │          │              │
       ┌──────▼───┐  ┌───▼───────┐  ┌──▼────────────┐
       │ Desktop  │  │   Web     │  │ External App  │
       │   App    │  │ Browser   │  │  (Client)     │
       │ (Tauri)  │  │  (UI)     │  │               │
       │   UI     │  │   UI      │  │ Posts logs to │
       │          │  │           │  │ /api/logs     │
       └──────────┘  └───────────┘  └───────────────┘
```

**Access Options:**
1. **Desktop (macOS)**: Launch native Tauri app with bundled server and UI
2. **Web Browser**: Navigate to `http://localhost:9090` (or deployed domain) to access UI
3. Both modes connect to the same Fastify server for log ingestion and streaming

### Data Flow

1. **External tool/app** sends API log data to `POST /api/logs` (same server, any network)
2. **Fastify server** validates and stores in in-memory buffer
3. **WebSocket broadcasts** new logs to all connected clients in real-time
4. **Svelte UI** (desktop or browser) receives updates and re-renders the list
5. **User interacts** with logs (view details, search, export)

**Note**: Desktop app and web browser clients can run simultaneously, both receiving real-time updates from the same server

---

## User Flow

### Getting Started - Desktop App (macOS)

1. Download and launch dev-see desktop app
2. App starts Fastify server on `localhost:9090` (bundled)
3. UI automatically opens in the app window
4. Developer configures their tool/script to send logs to `http://localhost:9090/api/logs`
5. Starts making API calls and sees them appear in real-time
6. Can optionally also open web browser to `http://localhost:9090` for a second view

### Getting Started - Web Browser

1. Start dev-see server standalone (e.g., `npm run server` or deployed service)
2. Navigate to `http://localhost:9090` (or configured domain) in web browser
3. Developer configures their tool/script to send logs to `http://localhost:9090/api/logs`
4. Starts making API calls and sees them appear in real-time
5. Can open multiple browser windows/tabs for different views

### Using the App (Both Desktop & Web)

1. **View logs**: See list of requests with method, URL, status code, duration
2. **See details**: Click a request to expand and view headers/body
3. **Search**: Filter by URL or status code
4. **Clear**: Wipe all logs with one click
5. **Export**: Save logs to JSON file for later analysis

---

## Deliverables

### Code
- [ ] Fastify server with WebSocket support
- [ ] Svelte UI for viewing logs
- [ ] Tauri desktop app wrapper
- [ ] Basic HTTP client for testing

### Documentation
- [ ] API documentation (POST /api/logs, WS /ws endpoints)
- [ ] Setup guide for developers
- [ ] Example scripts to send logs

### Deployment
- [ ] macOS `.dmg` installer
- [ ] Release notes

---

## Success Metrics

- ✅ App launches in < 2 seconds
- ✅ Can display 100+ logs/sec without UI stuttering
- ✅ UI loads in < 500ms
- ✅ Memory usage < 100MB with 1,000 logs
- ✅ Developer can send logs to app in < 5 minutes (after reading docs)

---

## Timeline Estimate

- **Week 1**: Fastify server + basic in-memory storage
- **Week 2**: Svelte UI for log viewing
- **Week 3**: Tauri integration + testing
- **Week 4**: Polish, documentation, release

---

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Fastify** | Fast, lightweight, good WebSocket support, can serve static files |
| **Svelte** | Small bundle, reactive by default, great for real-time UIs, works in browser and desktop |
| **Tauri** (optional) | Small app size, native feel, no Electron overhead; optional for desktop |
| **UI as web app** | Single codebase works for both desktop (Tauri) and browser; better maintainability |
| **In-memory only** | Simplifies Phase 1, databases can come later |
| **WebSocket** | Real-time updates without polling, works in both desktop and browser |
| **Dual deployment** | Desktop app bundling server + UI, or standalone web service accessible via browser |

---

## Future Extensions

### Phase 1+ Log Type Extensions

The log viewer UI is designed to be extensible to support additional log types beyond API requests/responses:
- **Console Logs** - App console output (stdout, stderr)
- **Database Queries** - SQL queries and responses
- **Analytics Events** - Custom app events and tracking
- **Lifecycle Events** - App lifecycle, navigation, screen transitions
- **Performance Metrics** - Memory usage, FPS, render times
- **Crash Reports** - Exceptions and stack traces

See [Log Viewer Design](./log-viewer-design.md) for architecture details on how future log types can be integrated.

### Feature Extensions

Once Phase 1 is stable:

- **Phase 2**: Add persistent SQLite storage
- **Phase 2**: Create iOS/Android SDKs
- **Phase 3**: Embedded in-app viewer
- **Phase 3**: Advanced search and analytics
- **Phase 4**: Team features and cloud sync
