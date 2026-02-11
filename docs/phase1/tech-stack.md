# dev-see Phase 1 Tech Stack

> Last updated: 2026-02-12

This document outlines the technology choices for **Phase 1 of dev-see**: a minimal, focused Mac desktop application for viewing and debugging API logs in real-time.

---

## 📋 Stack Overview

| Layer | Technology | Why This Choice |
|-------|-----------|-----------------|
| **Desktop App** | Tauri | Small bundles, native feel, no Electron overhead |
| **Frontend** | Svelte + Vite + TypeScript | Reactive, lightweight, great for real-time updates |
| **Backend** | Node.js + Fastify + TypeScript | Fast, easy to bundle with Tauri, excellent WebSocket support |
| **Storage** | In-memory ring buffer | Simple for MVP, no DB complexity |
| **Transport** | WebSocket (live) + HTTP POST (input) | Real-time streaming + simple client integration |
| **OS Target** | macOS 12+ | Simplify Phase 1 to single platform |

---

## 🖥 Desktop Application (Tauri)

### Why Tauri?

✅ **Tiny bundle size** – ~8-10MB vs 50MB+ for Electron
✅ **Native performance** – Uses system WebKit, minimal overhead
✅ **Fast startup** – Under 2 seconds on modern hardware
✅ **Memory efficient** – Low footprint for background running
✅ **Security** – No Node.js in renderer process
✅ **Rust foundation** – Memory-safe, easy to extend later

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

---

## 🧠 Backend (Fastify + Node.js)

### Why Fastify?

✅ **Fast** – 2-3x faster than Express
✅ **TypeScript native** – First-class TS support
✅ **Schema validation** – Built-in JSON schema validation
✅ **WebSocket support** – Excellent `@fastify/websocket` plugin
✅ **Bundles well** – Tauri can package Node.js server easily

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
import { RingBuffer } from './storage/ringBuffer';

const PORT = 9090;
const app = Fastify({ logger: true });

const logBuffer = new RingBuffer<ApiLog>(1000);

// CORS for local development
app.register(require('@fastify/cors'), {
  origin: true,
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

// Start server
app.listen({ port: PORT, host: '127.0.0.1' }, (err, addr) => {
  if (err) throw err;
  console.log(`Server running at ${addr}`);
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
│   └── desktop/
│       ├── src/                    # Svelte source
│       │   ├── App.svelte
│       │   ├── main.ts
│       │   ├── components/
│       │   ├── stores/
│       │   ├── types/
│       │   └── styles/
│       │
│       ├── src-tauri/              # Tauri configuration & Rust
│       │   ├── src/
│       │   │   └── main.rs         # Spawn Fastify server
│       │   ├── tauri.conf.json
│       │   └── Cargo.toml
│       │
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── server/
│       ├── src/                    # Fastify source
│       │   ├── index.ts
│       │   ├── routes/
│       │   ├── storage/
│       │   └── types/
│       │
│       ├── dist/                   # Compiled JS
│       ├── tsconfig.json
│       └── package.json
│
├── docs/
│   ├── overview.md
│   ├── tech-stack.md
│   └── phase1/                     # Phase 1 specific docs
│       ├── overview.md
│       └── tech-stack.md
│
└── package.json (workspace root)
```

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

### Getting Started

```bash
# Install dependencies
pnpm install

# Develop (hot reload on file changes)
pnpm dev

# This will:
# 1. Start Vite dev server (port 5173)
# 2. Start Tauri dev mode with hot reload
# 3. Server runs in Tauri backend, accessible at localhost:9090
```

### Building

```bash
# Build production bundles
pnpm build

# Outputs:
# - apps/desktop/dist/ (Svelte build)
# - packages/server/dist/ (Fastify build)
# - .tauri/bundle/ (macOS .dmg installer)
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
```

---

## 📊 Performance Targets (Phase 1)

| Metric | Target |
|--------|--------|
| **App startup** | < 2 seconds |
| **UI initial load** | < 500ms |
| **Log ingestion** | 100+ logs/sec |
| **Memory usage** | < 100MB with 1,000 logs |
| **UI frame rate** | 60 FPS |
| **Search latency** | < 50ms for 1,000 logs |

---

## 🔒 Security (Phase 1)

### Transport
- **HTTP POST** – Can be upgraded to HTTPS later (Phase 2)
- **WebSocket** – Local network only (`127.0.0.1`)
- **No authentication** – Assumes trusted local network

### Data
- **In-memory only** – Logs cleared on app exit
- **No persistence** – No data written to disk
- **No sync** – No cloud, no network backup

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
    "zod": "^3.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x"
  }
}
```

### Desktop (`apps/desktop/src-tauri/Cargo.toml`)
```toml
[dependencies]
tauri = { version = "2.0", features = ["api-all"] }
serde = { version = "1", features = ["derive"] }
```

---

## 🎯 Deployment

### macOS .dmg Installer

```bash
pnpm build

# Generates: src-tauri/target/release/bundle/dmg/dev-see_*.dmg
```

**What's included:**
- Tauri app wrapper
- Svelte UI (bundled)
- Fastify server (bundled)
- Automatic startup of Fastify when app launches

---

## 📚 Next Steps

1. **Set up monorepo structure** – pnpm workspaces
2. **Create Fastify server** – Basic `/api/logs` and `/ws` endpoints
3. **Build Svelte UI** – Log list, details view, search
4. **Tauri integration** – Wrap app, spawn server process
5. **Testing** – Manual testing with curl + test scripts
6. **Docs** – Integration guide for users

---

## References

- [Tauri Docs](https://tauri.app/)
- [Svelte Docs](https://svelte.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Fastify Docs](https://fastify.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
