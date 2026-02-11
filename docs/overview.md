# dev-see Phase 1 Overview

> Last updated: 2026-02-12

## Scope

**Phase 1 is a minimal viable product focused on a simple Mac desktop application.**

This phase delivers the core debugging experience: a lightweight server that captures API logs and a beautiful UI to view them. No mobile SDKs, no embedded mode, no advanced features—just the essentials to prove the concept works.

**Target**: Mac development environment only

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

#### 2. Desktop UI (Svelte + Tauri)
- Display live list of API requests
- Show request/response details (method, URL, status, headers, body)
- Search and filter requests
- Clear all logs
- Export logs to JSON file

#### 3. Desktop Application (Tauri)
- Single-window desktop app for macOS
- Auto-start capability
- System tray icon (optional for MVP)
- Minimize to background

### Non-Functional Requirements

- **Performance**: Handle 100+ logs/second without lag
- **Memory**: Use < 100MB RAM with 1,000 stored logs
- **Startup**: Launch in < 2 seconds
- **Compatibility**: macOS 12+ (Intel & Apple Silicon)

---

## Out of Scope (Phase 2+)

- iOS/Android client SDKs
- Embedded in-app viewer
- Persistent database (beyond current session)
- Advanced analytics or insights
- Team/multi-user features
- Cloud sync
- Windows/Linux support

---

## Architecture

### High-Level Diagram

```
┌──────────────────┐
│   dev-see        │
│   Desktop App    │
│   (Tauri)        │
│                  │
│  ┌────────────┐  │
│  │  Svelte    │  │
│  │  Web UI    │  │
│  └─────┬──────┘  │
│        │ WS      │
│  ┌─────▼──────┐  │
│  │  Fastify   │  │
│  │  Server    │  │
│  └─────┬──────┘  │
│        │ HTTP    │
└────────┼─────────┘
         │
    ┌────▼─────────────────────┐
    │  External App/Tool       │
    │  (sends API logs via     │
    │   POST /api/logs)        │
    └──────────────────────────┘
```

### Data Flow

1. **External tool/app** sends API log data to `POST /api/logs`
2. **Fastify server** validates and stores in in-memory buffer
3. **WebSocket broadcasts** new logs to all connected clients in real-time
4. **Svelte UI** receives updates and re-renders the list
5. **User interacts** with logs (view details, search, export)

---

## User Flow

### Getting Started (Developer)

1. Download and open dev-see desktop app
2. App starts Fastify server on `localhost:9090`
3. Developer configures their tool/script to send logs to `http://localhost:9090/api/logs`
4. Opens dev-see UI (same window)
5. Starts making API calls and sees them appear in real-time

### Using the App

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
| **Fastify** | Fast, lightweight, good WebSocket support |
| **Svelte** | Small bundle, reactive by default, great for real-time UIs |
| **Tauri** | Small app size, native feel, no Electron overhead |
| **In-memory only** | Simplifies Phase 1, databases can come later |
| **WebSocket** | Real-time updates without polling |
| **macOS only** | Reduces complexity, target primary developer platform |

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
