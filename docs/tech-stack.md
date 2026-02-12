# dev-see Phase 1 Tech Stack

> Last updated: 2026-02-13

This document outlines the technology choices for **Phase 1 of dev-see**: a cross-platform application for viewing and debugging API logs in real-time—accessible both as a native macOS desktop app and via web browser on any platform.

---

## 📋 Stack Overview

| Layer | Technology | Why This Choice |
|-------|-----------|-----------------|
| **Desktop App** (Optional) | Tauri | Small bundles, native feel, no Electron overhead; single-click macOS distribution |
| **Frontend** | Svelte + Vite + TypeScript | Reactive, lightweight, great for real-time updates; works in both browser and Tauri |
| **Backend** | Node.js + Fastify + TypeScript | Fast, serves both API and static UI files, excellent WebSocket support |
| **Storage** | In-memory ring buffer | Simple for MVP, no DB complexity |
| **Transport** | WebSocket (live) + HTTP POST (input) | Real-time streaming + simple client integration |
| **Deployment** | Desktop (Tauri) + Web (Browser) | Single codebase, two deployment options; browser works on any OS |

---

## 🖥 Desktop Application (Tauri) - Optional

### Why Tauri (Optional in Phase 1)?

✅ **Tiny bundle size** – ~8-10MB vs 50MB+ for Electron
✅ **Native macOS experience** – Single-click installation, dock icon, system integration
✅ **Native performance** – Uses system WebKit, minimal overhead
✅ **Fast startup** – Under 2 seconds on modern hardware
✅ **Memory efficient** – Low footprint for background running
✅ **Same UI as web** – No code duplication; UI works identically in desktop and browser

### Desktop vs Web Trade-offs

| Aspect | Desktop (Tauri) | Web Browser |
|--------|---------|---------|
| **Installation** | .dmg file, one-click setup | Just open browser, no install |
| **System Integration** | Dock icon, menu bar, native feel | Browser tab/window |
| **Cross-Platform** | macOS only (Phase 1) | Works everywhere with modern browser |
| **Data Persistence** | Can access local files easily | Limited to in-memory or browser storage |
| **Always-On** | Easy to run in background | Can leave browser tab open or server running |

### Tauri Configuration (Phase 1)

```toml
# src-tauri/tauri.conf.json
{
  "build": {
    "target": ["x86_64-apple-darwin", "aarch64-apple-darwin"],
    "features": ["api:all"]
  },
  "app": {
    "windows": [
      {
        "label": "main",
        "title": "dev-see",
        "width": 1400,
        "height": 900,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true
      }
    ]
  }
}
```

### Backend Integration (Tauri)

The Fastify server runs **inside the Tauri app** as a child process:

```rust
// src-tauri/src/main.rs
use std::process::{Command, Child};

fn main() {
    // Spawn Node.js Fastify server
    let mut child: Child = Command::new("node")
        .arg(resource_path("server/index.js"))
        .spawn()
        .expect("Failed to start server");

    // Launch Tauri window (UI connects to http://localhost:9090)
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // Clean up on exit
    let _ = child.kill();
}
```

### macOS-Specific Features

- **App icon** in dock
- **Menu bar** with standard File/Edit/View menus
- **Keyboard shortcuts** (Cmd+Q to quit, Cmd+W to close window)
- **Notarization** for macOS 10.15+ (future: auto-updates)

---

## 🎨 Frontend (Svelte + Vite + TypeScript)

### Why Svelte?

✅ **Smaller bundle** – ~30KB for UI components (vs 100KB+ React)
✅ **Built-in reactivity** – No virtual DOM, direct DOM manipulation
✅ **Great for real-time** – Reactive stores perfect for live log streams
✅ **Developer experience** – Simple template syntax, scoped CSS
✅ **Platform agnostic** – Single codebase works in browser and Tauri desktop app
✅ **Standard web tech** – No platform-specific code needed; just HTML/CSS/JS

### Project Structure

```
apps/
└── desktop/
    ├── src/
    │   ├── App.svelte          # Root component
    │   ├── main.ts             # Vite entry point
    │   ├── components/
    │   │   ├── LogList.svelte  # Scrollable list of logs
    │   │   ├── LogDetail.svelte # Expanded request/response view
    │   │   ├── SearchBar.svelte # Filter/search input
    │   │   └── Toolbar.svelte   # Clear/export buttons
    │   ├── stores/
    │   │   └── logs.ts         # Reactive log state
    │   ├── types/
    │   │   └── api.ts          # API log types
    │   └── styles/
    │       └── index.css        # Tailwind import
    │
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

### Svelte Component Example

```svelte
<!-- src/components/LogList.svelte -->
<script lang="ts">
  import { logs, selectedId } from '../stores/logs';
  import LogItem from './LogItem.svelte';

  let scrollContainer: HTMLElement;

  $: if ($logs.length > 0) {
    // Auto-scroll to bottom on new logs
    setTimeout(() => {
      scrollContainer?.scrollTo(0, scrollContainer.scrollHeight);
    }, 0);
  }
</script>

<div bind:this={scrollContainer} class="log-list">
  {#each $logs as log (log.id)}
    <LogItem
      {log}
      selected={$selectedId === log.id}
      on:click={() => ($selectedId = log.id)}
    />
  {/each}
  {#if $logs.length === 0}
    <div class="empty-state">No logs yet. Start making API calls...</div>
  {/if}
</div>

<style>
  .log-list {
    height: 100%;
    overflow-y: auto;
    border-right: 1px solid #e5e7eb;
  }

  .empty-state {
    padding: 2rem;
    color: #9ca3af;
    text-align: center;
  }
</style>
```

### Reactive Stores

```typescript
// src/stores/logs.ts
import { writable, derived } from 'svelte/store';

interface ApiLog {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  timestamp: number;
  duration: number;
  requestHeaders: Record<string, string>;
  requestBody?: string;
  responseHeaders: Record<string, string>;
  responseBody?: string;
}

export const logs = writable<ApiLog[]>([]);
export const selectedId = writable<string | null>(null);
export const searchQuery = writable('');

export const filteredLogs = derived(
  [logs, searchQuery],
  ([$logs, $search]) => {
    if (!$search) return $logs;
    return $logs.filter(log =>
      log.url.toLowerCase().includes($search.toLowerCase())
    );
  }
);
```

### Styling (Tailwind CSS)

```css
/* src/styles/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .log-item {
    @apply px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors;
  }

  .badge-success {
    @apply px-2 py-1 bg-green-100 text-green-800 text-xs rounded;
  }

  .badge-error {
    @apply px-2 py-1 bg-red-100 text-red-800 text-xs rounded;
  }
}
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from 'vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 5173,
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined, // Single bundle for simplicity
      },
    },
  },
});
```

### How the UI Works in Both Desktop & Browser

The Svelte UI is **platform-agnostic** and works identically in both contexts:

**Desktop (Tauri):**
```
1. Tauri bundles the pre-built UI (dist/) and server
2. When app launches, UI loads from local file: file:///<path>/dist/index.html
3. UI connects to WebSocket at ws://127.0.0.1:9090/ws
4. Native Tauri window provides the container
```

**Web Browser:**
```
1. Fastify server starts and serves UI files from packages/server/dist/ui/
2. User navigates to http://localhost:9090 in browser
3. Server sends index.html and assets
4. UI connects to WebSocket at ws://localhost:9090/ws
5. Browser provides the container
```

**Result:** Same UI code, same functionality, two distribution methods. No conditional code or platform checks needed in the UI.

---

## 🧠 Backend (Fastify + Node.js)

### Why Fastify?

✅ **Fast** – 2-3x faster than Express
✅ **TypeScript native** – First-class TS support
✅ **Schema validation** – Built-in JSON schema validation
✅ **WebSocket support** – Excellent `@fastify/websocket` plugin
✅ **Serves static files** – Can serve UI files for web access (via `@fastify/static`)
✅ **Bundles well** – Tauri can package Node.js server easily
✅ **Single responsibility** – One server handles both API and UI delivery

### Project Structure

```
packages/
└── server/
    ├── src/
    │   ├── index.ts              # Fastify app entry
    │   ├── routes/
    │   │   ├── logs.ts           # POST /api/logs
    │   │   └── ws.ts             # WS /ws
    │   ├── storage/
    │   │   └── ringBuffer.ts     # In-memory log storage
    │   └── types/
    │       └── api.ts            # Shared types
    │
    ├── dist/                     # Compiled JS for Tauri
    ├── package.json
    └── tsconfig.json
```

### Main Server (Fastify)

```typescript
// packages/server/src/index.ts
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { RingBuffer } from './storage/ringBuffer';
import path from 'path';

const PORT = 9090;
const app = Fastify({ logger: true });

const logBuffer = new RingBuffer<ApiLog>(1000);

// CORS for local development and cross-origin requests
app.register(require('@fastify/cors'), {
  origin: true,
});

// Serve static UI files (Svelte build output)
app.register(fastifyStatic, {
  root: path.join(__dirname, '../dist/ui'),
  prefix: '/',
});

// WebSocket support
app.register(fastifyWebsocket);

// POST /api/logs - Accept log entries
app.post<{ Body: ApiLog }>('/api/logs', async (request, reply) => {
  const log = request.body;

  // Validate
  if (!log.method || !log.url) {
    return reply.code(400).send({ error: 'Missing required fields' });
  }

  // Add timestamp if not provided
  const logEntry: ApiLog = {
    ...log,
    id: crypto.randomUUID(),
    timestamp: log.timestamp || Date.now(),
  };

  // Store
  logBuffer.add(logEntry);

  // Broadcast to all WebSocket clients
  app.websocketServer?.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          type: 'new_log',
          data: logEntry,
        })
      );
    }
  });

  reply.code(202).send({ id: logEntry.id });
});

// WS /ws - Stream logs in real-time
app.get('/ws', { websocket: true }, (socket, req) => {
  // Send existing logs to new client
  const logs = logBuffer.getAll();
  socket.send(
    JSON.stringify({
      type: 'initial_logs',
      data: logs,
    })
  );

  // Keep connection open
  socket.on('message', (msg) => {
    // Handle client messages (search, filter, etc.)
  });

  socket.on('close', () => {
    // Clean up
  });
});

// Catch-all for SPA routing (send index.html for any unmatched routes)
app.get('*', async (request, reply) => {
  reply.sendFile('index.html');
});

// Start server
app.listen({ port: PORT, host: '0.0.0.0' }, (err, addr) => {
  if (err) throw err;
  console.log(`Server running at ${addr}`);
  console.log(`UI available at http://localhost:${PORT}`);
});
```

### In-Memory Ring Buffer

```typescript
// packages/server/src/storage/ringBuffer.ts
export class RingBuffer<T> {
  private buffer: T[] = [];
  private index = 0;

  constructor(private maxSize: number) {}

  add(item: T): void {
    if (this.buffer.length < this.maxSize) {
      this.buffer.push(item);
    } else {
      this.buffer[this.index] = item;
      this.index = (this.index + 1) % this.maxSize;
    }
  }

  getAll(): T[] {
    return this.buffer;
  }

  clear(): void {
    this.buffer = [];
    this.index = 0;
  }

  search(predicate: (item: T) => boolean): T[] {
    return this.buffer.filter(predicate);
  }
}
```

### WebSocket Client (Frontend)

```typescript
// src/api/ws.ts
export function connectWebSocket(onLog: (log: ApiLog) => void) {
  const ws = new WebSocket('ws://localhost:9090/ws');

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'initial_logs') {
      // Load existing logs on connect
      message.data.forEach(onLog);
    } else if (message.type === 'new_log') {
      // Stream new logs
      onLog(message.data);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return ws;
}
```

---

## 📦 Project Structure (Phase 1)

```
dev-see/
├── apps/
│   └── ui/
│       ├── src/                    # Svelte source (shared UI)
│       │   ├── App.svelte
│       │   ├── main.ts
│       │   ├── components/
│       │   ├── stores/
│       │   ├── types/
│       │   └── styles/
│       │
│       ├── dist/                   # Built UI (served by server, or loaded in Tauri)
│       │
│       ├── vite.config.ts          # Builds to dist/
│       ├── tsconfig.json
│       └── package.json
│
│   └── desktop/
│       ├── src-tauri/              # Tauri configuration & Rust
│       │   ├── src/
│       │   │   └── main.rs         # Spawn Fastify server
│       │   ├── tauri.conf.json
│       │   └── Cargo.toml
│       │
│       └── package.json            # Wraps ui + server
│
├── packages/
│   └── server/
│       ├── src/                    # Fastify source
│       │   ├── index.ts
│       │   ├── routes/
│       │   │   ├── logs.ts         # POST /api/logs
│       │   │   └── ws.ts           # WS /ws
│       │   ├── storage/
│       │   │   └── ringBuffer.ts
│       │   └── types/
│       │
│       ├── dist/                   # Compiled JS + UI files
│       ├── tsconfig.json
│       └── package.json
│
├── docs/
│   ├── overview.md
│   ├── tech-stack.md
│   └── plans/
│       └── setup-project/
│
└── package.json (workspace root)
```

**Key Points:**
- **apps/ui**: The Svelte UI, built once, served in both contexts
- **packages/server**: Fastify server serves both API routes and static UI files
- **apps/desktop**: Tauri wrapper that bundles server + built UI, optional for macOS users
- **Browser access**: Navigate to `http://localhost:9090` to use web version

---

## 🛠 Developer Tooling

### Package Manager
- **pnpm** – Fast, efficient workspace management

### Monorepo
- **pnpm workspaces** – Manage `apps/` and `packages/` as one repo

### Build Tools
- **Vite** – Frontend bundler for Svelte
- **Tauri CLI** – Build desktop app
- **tsc** – TypeScript compiler for server

### Code Quality
- **TypeScript** – Strict mode enabled
- **ESLint** – Linting (svelte, typescript configs)
- **Prettier** – Code formatting

### Testing (Phase 2)
- **Vitest** – Unit tests
- **Playwright** – E2E tests

---

## 🚀 Development Workflow

### Getting Started (Desktop Development)

```bash
# Install dependencies
pnpm install

# Develop (hot reload on file changes)
pnpm dev

# This will:
# 1. Start Vite dev server (port 5173) for Svelte hot reload
# 2. Start Tauri dev mode with live reload
# 3. Fastify server runs in Tauri backend, accessible at localhost:9090
# 4. UI accessible at http://localhost:5173 (dev) or in Tauri window
```

### Getting Started (Web Development)

```bash
# Install dependencies
pnpm install

# Start server (serves UI + API)
cd packages/server && pnpm dev

# Or in development with Vite:
cd apps/ui && pnpm dev
# Then in another terminal:
cd packages/server && pnpm start

# Browser: Open http://localhost:9090 (or localhost:5173 for Vite dev)
```

### Building

```bash
# Build everything
pnpm build

# Outputs:
# - apps/ui/dist/ (Svelte static site)
# - packages/server/dist/ (Fastify JS + UI files)
# - apps/desktop/src-tauri/target/release/bundle/dmg/ (macOS app)
```

### Testing

```bash
# Unit tests (future)
pnpm test

# Manual testing: Send logs with curl
curl -X POST http://localhost:9090/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://api.example.com/users",
    "statusCode": 200,
    "duration": 150,
    "requestHeaders": {},
    "responseHeaders": {"content-type": "application/json"},
    "responseBody": "{\"users\": []}"
  }'

# Then check UI at http://localhost:9090 or in desktop app
```

### Environment-Specific Configuration

**apps/ui/src/config.ts** (Runtime environment detection):
```typescript
// Detect if running in Tauri or browser
export const isDesktop = window.__TAURI__ !== undefined;

// Get appropriate server URL
export const serverUrl = isDesktop
  ? 'http://127.0.0.1:9090'  // Tauri bundles server
  : window.location.origin;    // Browser uses same domain
```

---

## 📊 Performance Targets (Phase 1)

| Metric | Desktop (Tauri) | Web (Browser) |
|--------|---------|---------|
| **App/Page Load** | < 2 seconds | < 500ms (after server reached) |
| **UI Initial Render** | < 500ms | < 500ms |
| **Log Ingestion** | 100+ logs/sec | 100+ logs/sec |
| **Memory Usage** | < 100MB with 1,000 logs | < 50MB in browser |
| **UI Frame Rate** | 60 FPS | 60 FPS |
| **Search Latency** | < 50ms for 1,000 logs | < 50ms for 1,000 logs |
| **WebSocket Latency** | < 10ms (local) | < 100ms (depends on network) |

---

## 🔒 Security (Phase 1)

### Desktop (Tauri)
- **HTTP POST** – Localhost only (`127.0.0.1`)
- **WebSocket** – Local network only (`127.0.0.1`)
- **No authentication** – Assumes single-user local machine
- **Isolation** – Runs in native app container

### Web (Browser)
- **HTTP POST** – Can upgrade to HTTPS in production
- **WebSocket** – Can upgrade to WSS in production
- **CORS** – Configured for development; restrict in production
- **No authentication** – Phase 1 assumes private network; Phase 2 can add auth

### Data (Both)
- **In-memory only** – Logs cleared on app exit or server restart
- **No persistence** – No data written to disk
- **No sync** – No cloud, no network backup
- **Sensitive data** – Be cautious when log bodies contain credentials/secrets

### Future (Phase 2)
- Authentication & user management
- HTTPS/WSS for remote deployments
- Rate limiting on `/api/logs`
- Encryption at rest for persistent storage
- Audit logging

---

## 📝 Dependencies

### Frontend (`apps/desktop/package.json`)
```json
{
  "dependencies": {
    "svelte": "^4.x",
    "@uiw/json-view": "^2.x",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "vite-plugin-svelte": "^3.x",
    "typescript": "^5.x",
    "tailwindcss": "^3.x"
  }
}
```

### Backend (`packages/server/package.json`)
```json
{
  "dependencies": {
    "fastify": "^4.x",
    "@fastify/websocket": "^10.x",
    "@fastify/cors": "^8.x",
    "@fastify/static": "^6.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x"
  }
}
```

**Note:** `@fastify/static` is added to serve the built Svelte UI for web deployment.

### Desktop (`apps/desktop/src-tauri/Cargo.toml`)
```toml
[dependencies]
tauri = { version = "2.0", features = ["api-all"] }
serde = { version = "1", features = ["derive"] }
```

---

## 🎯 Deployment

### Option 1: Desktop App (macOS)

```bash
pnpm build

# Generates: apps/desktop/src-tauri/target/release/bundle/dmg/dev-see_*.dmg
```

**What's included:**
- Tauri app wrapper
- Svelte UI (built and bundled)
- Fastify server (compiled and bundled)
- Automatic startup of Fastify when app launches
- Accessible at `localhost:9090` (optionally via browser or native UI)

**Install:** Download .dmg and drag to Applications folder

### Option 2: Web (Any Platform)

```bash
# Build UI
cd apps/ui && pnpm build

# Start server with UI
cd packages/server && pnpm start

# Server runs at http://localhost:9090
# Open any modern browser and navigate to that URL
```

**What's needed:**
- Node.js runtime
- Fastify server + UI files in dist/

**Deploy:**
- Locally: Run server command above
- Remote: Deploy Node.js app to any hosting (Heroku, Railway, AWS Lambda, etc.)
- Docker: Containerize and run

### Build Process (Both)

```bash
# Install dependencies
pnpm install

# Build everything
pnpm build
# This builds:
# 1. apps/ui/dist (Svelte UI)
# 2. packages/server/dist (Fastify server)
# 3. apps/desktop/src-tauri build (Tauri app, includes bundled copies)
```

---

## 📚 Next Steps

1. **Set up monorepo structure** – pnpm workspaces with `apps/ui`, `apps/desktop`, `packages/server`
2. **Create Fastify server** – API endpoints (`/api/logs`, `/ws`) + static file serving
3. **Build Svelte UI** – Log list, details view, search
4. **Web deployment** – Configure Fastify to serve built UI, test in browser
5. **Desktop integration** – Tauri wrapper, bundle server + built UI
6. **Cross-platform testing** – Desktop app + web browser on different machines
7. **Documentation** – Setup guides for both desktop and web deployment
8. **Environment detection** – Add client-side logic to detect Tauri vs browser context

---

## References

- [Tauri Docs](https://tauri.app/)
- [Svelte Docs](https://svelte.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Fastify Docs](https://fastify.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
