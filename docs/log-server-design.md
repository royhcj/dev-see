# Log Server Design

> Last updated: 2026-02-12

This document specifies the design and architecture of the Fastify log server that powers dev-see Phase 1. It covers API endpoints, WebSocket protocol, data models, storage strategy, and implementation details.

---

## Overview

The **log server** is the backend component that:
- Accepts API logs from client applications via HTTP POST
- Stores logs in an in-memory ring buffer
- Broadcasts logs in real-time to connected WebSocket clients
- Provides endpoints for log retrieval, filtering, and export

**Technology**: Node.js + Fastify + TypeScript
**Port**: `localhost:9090`
**Execution Context**: Embedded in Tauri desktop app

---

## Architecture

### Component Diagram

```
┌─────────────────────────────────────┐
│      Fastify Server (Node.js)       │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐  │
│  │   HTTP Route Handler         │  │
│  │   POST /api/logs             │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │   Validation & Normalization │  │
│  │   - ID generation            │  │
│  │   - Timestamp assignment     │  │
│  │   - Header parsing           │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │   Ring Buffer Storage        │  │
│  │   - Circular array (1,000)   │  │
│  │   - FIFO eviction            │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │   WebSocket Broadcaster      │  │
│  │   - Notifies all clients     │  │
│  │   - Sends serialized log     │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   WebSocket Route            │  │
│  │   GET /ws (upgraded)         │  │
│  └──────────┬───────────────────┘  │
│             │                       │
│  ┌──────────▼───────────────────┐  │
│  │   Connection Management      │  │
│  │   - Initial sync             │  │
│  │   - Message handling         │  │
│  │   - Cleanup on close         │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Data Flow

```
1. Client App              2. Log Server            3. WebSocket Client
   ├─ POST /api/logs          ├─ Validate              ├─ Receive initial_logs
   ├─ JSON body               ├─ Store in buffer       ├─ Store in UI state
   │                          ├─ Assign ID             │
   │                          ├─ Add timestamp         │
   │                          │                        │
   │                          ├─ WS Broadcast          │
   │                          │  (new_log)             │
   │                          └──────────────────────┐ │
   │                                                 └─▶ ├─ Receive new_log
   │                                                    ├─ Update UI state
   │                                                    └─ Re-render list
```

---

## API Endpoints

### HTTP POST `/api/logs`

**Purpose**: Accept an API log entry from a client application.

**Request Headers**:
```
Content-Type: application/json
X-App-Id: (optional) string identifier for the originating app
```

**Request Body** (JSON):
```json
{
  "type": "api_log",
  "method": "GET",
  "url": "https://api.example.com/users/123",
  "statusCode": 200,
  "duration": 145,
  "timestamp": 1707763200000,
  "requestHeaders": {
    "Authorization": "Bearer token123",
    "User-Agent": "MyApp/1.0"
  },
  "requestBody": "{\"id\": 123}",
  "responseHeaders": {
    "Content-Type": "application/json",
    "X-RateLimit-Remaining": "99"
  },
  "responseBody": "{\"id\": 123, \"name\": \"John Doe\"}",
  "appId": "com.example.myapp"
}
```

**Request Fields**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | string | ✓ | Log type: `api_log` (Phase 1), others TBD in Phase 2+ |
| `method` | string | ✓ | HTTP method: GET, POST, PUT, DELETE, PATCH, etc. |
| `url` | string | ✓ | Full URL including protocol, domain, path, and query params |
| `statusCode` | number | ✓ | HTTP response status code (100-599) |
| `duration` | number | ✓ | Time elapsed in milliseconds |
| `timestamp` | number | ✗ | Unix timestamp in ms. If omitted, server assigns current time |
| `requestHeaders` | object | ✗ | Request headers as key-value pairs |
| `requestBody` | string | ✗ | Request body as string (JSON, form data, or plain text) |
| `responseHeaders` | object | ✗ | Response headers as key-value pairs |
| `responseBody` | string | ✗ | Response body as string |
| `appId` | string | ✗ | App identifier for filtering (e.g., `com.example.myapp`) |

**Response** (202 Accepted):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1707763200123
}
```

**Response Status Codes**:
- `202 Accepted` – Log stored successfully
- `400 Bad Request` – Missing required fields (method, url, statusCode)
- `413 Payload Too Large` – Request body exceeds limits
- `500 Internal Server Error` – Server error

**Validation Rules**:
1. `method` must be a valid HTTP method (case-insensitive, converted to uppercase)
2. `url` must be a valid URL (checked with URL constructor)
3. `statusCode` must be an integer between 100-599
4. `duration` must be a non-negative number
5. `timestamp` must be a valid Unix timestamp (or omitted)
6. `requestHeaders`, `responseHeaders` must be plain objects
7. `requestBody`, `responseBody` must be strings or null
8. `appId` if provided, must be a non-empty string
9. Request body size limit: 1MB per request

**Example (cURL)**:
```bash
curl -X POST http://localhost:9090/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_log",
    "method": "GET",
    "url": "https://api.example.com/users",
    "statusCode": 200,
    "duration": 150,
    "requestHeaders": {"Authorization": "Bearer token"},
    "responseHeaders": {"content-type": "application/json"},
    "responseBody": "{\"users\": []}"
  }'
```

---

### WebSocket GET `/ws`

**Purpose**: Stream logs in real-time to connected clients.

**Upgrade Request**:
```http
GET /ws HTTP/1.1
Host: localhost:9090
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: ...
Sec-WebSocket-Version: 13
```

**Connection Lifecycle**:

#### 1. Initial Connection
When a new WebSocket client connects, the server immediately sends all existing logs:

```json
{
  "type": "initial_logs",
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "api_log",
      "appId": "com.example.myapp",
      "method": "GET",
      "url": "https://api.example.com/users",
      "statusCode": 200,
      "duration": 145,
      "timestamp": 1707763200000,
      "requestHeaders": {...},
      "requestBody": "...",
      "responseHeaders": {...},
      "responseBody": "..."
    },
    ...
  ]
}
```

#### 2. New Log Broadcast
When a new log is added via POST `/api/logs`, the server broadcasts it to all connected clients:

```json
{
  "type": "new_log",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "type": "api_log",
    "appId": "com.example.myapp",
    "method": "POST",
    "url": "https://api.example.com/users",
    "statusCode": 201,
    "duration": 200,
    "timestamp": 1707763200100,
    "requestHeaders": {...},
    "requestBody": "{\"name\": \"Jane\"}",
    "responseHeaders": {...},
    "responseBody": "{\"id\": 124, \"name\": \"Jane\"}"
  }
}
```

#### 3. Client Messages (Future)
Clients may send messages for filtering/searching (Phase 2+):

```json
{
  "type": "filter",
  "appId": "com.example.myapp"
}
```

```json
{
  "type": "search",
  "query": "api.example.com"
}
```

#### 4. Disconnection
When a client closes the connection, the server cleans up resources and stops sending messages.

**Message Schema**:

```typescript
type WSMessage =
  | InitialLogsMessage
  | NewLogMessage
  | FilterMessage
  | SearchMessage
  | ErrorMessage

interface InitialLogsMessage {
  type: 'initial_logs'
  data: ApiLog[]
}

interface NewLogMessage {
  type: 'new_log'
  data: ApiLog
}

interface FilterMessage {
  type: 'filter'
  appId: string
}

interface SearchMessage {
  type: 'search'
  query: string
}

interface ErrorMessage {
  type: 'error'
  code: string
  message: string
}
```

**Guarantees**:
- Messages are JSON-serialized UTF-8 strings
- One message per WebSocket frame (no batching)
- No guaranteed delivery order (but logs arrive in creation order)
- Stale clients (broken connections) are cleaned up after timeout or ping/pong

---

## Data Models

### ApiLog

The canonical representation of a single API request/response pair.

```typescript
type LogType = 'api_log' | 'console_log' | 'db_query' | 'metric' | 'event' // Phase 2+ will add more

interface ApiLog {
  // Metadata
  id: string                              // UUID v4, generated by server
  type: LogType                           // Log type (api_log in Phase 1)
  appId?: string                          // App identifier for filtering
  timestamp: number                       // Unix timestamp in ms (when request was made)

  // Request Details
  method: string                          // HTTP method (GET, POST, PUT, DELETE, PATCH)
  url: string                             // Full URL with protocol, domain, path, query
  requestHeaders?: Record<string, string> // Request headers
  requestBody?: string                    // Request body (JSON, form data, text, or null)

  // Response Details
  statusCode: number                      // HTTP response status (100-599)
  duration: number                        // Time elapsed in milliseconds
  responseHeaders?: Record<string, string>// Response headers
  responseBody?: string                   // Response body (JSON, HTML, text, binary as string)
}
```

**Notes**:
- All fields are immutable once stored
- `id` is auto-generated by the server if not provided by the client
- `type` must be one of the supported log types (Phase 1 supports `api_log` only)
- `timestamp` defaults to server's current time if not provided
- `method` is normalized to uppercase
- Headers are optional but recommended
- Body fields can be null or empty string for requests without bodies

---

## Storage

### Ring Buffer Implementation

The log server uses an in-memory **circular buffer** to store logs. This design provides:
- **O(1) insertion** – Always append to the end
- **O(1) eviction** – Automatically remove oldest logs
- **Bounded memory** – Fixed size (1,000 logs by default)
- **FIFO order** – Oldest logs are discarded first

#### Structure

```typescript
export class RingBuffer<T> {
  private buffer: (T | undefined)[] = []
  private head = 0                         // Points to next insertion point
  private size = 0                         // Current number of items

  constructor(private maxSize: number) {}

  add(item: T): void {
    // If not full, add to end
    if (this.size < this.maxSize) {
      this.buffer.push(item)
      this.size++
    } else {
      // Circular overwrit at head position
      this.buffer[this.head] = item
      this.head = (this.head + 1) % this.maxSize
    }
  }

  getAll(): T[] {
    // Return items in insertion order
    if (this.size < this.maxSize) {
      return this.buffer.slice(0, this.size)
    }
    // If full, rotate array to restore insertion order
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head)
    ]
  }

  clear(): void {
    this.buffer = []
    this.head = 0
    this.size = 0
  }

  search(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate)
  }

  getSize(): number {
    return this.size
  }
}
```

#### Usage

```typescript
const logBuffer = new RingBuffer<ApiLog>(1000)

// Add logs
logBuffer.add(log1)
logBuffer.add(log2)

// Retrieve all
const allLogs = logBuffer.getAll()

// Search
const userLogs = logBuffer.search(log => log.appId === 'com.example.myapp')

// Clear
logBuffer.clear()
```

### Configuration

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Max Logs** | 1,000 | Trade-off between memory and retention |
| **Eviction Policy** | FIFO | Oldest logs removed first (natural for debugging) |
| **Memory per Log** | ~2-5KB | Typical log size with headers/body |
| **Total Memory** | ~100MB max | Meets non-functional requirement |

---

## Validation & Error Handling

### Input Validation

All POST requests are validated before storing:

```typescript
interface ValidationResult {
  valid: boolean
  errors?: string[]
}

function validateLog(input: any): ValidationResult {
  const errors: string[] = []
  const SUPPORTED_TYPES = ['api_log']  // Phase 1; Phase 2+ will add more

  // Required fields
  if (!input.type || typeof input.type !== 'string') {
    errors.push('type is required and must be a string')
  } else if (!SUPPORTED_TYPES.includes(input.type)) {
    errors.push(`type must be one of: ${SUPPORTED_TYPES.join(', ')}`)
  }

  if (!input.method || typeof input.method !== 'string') {
    errors.push('method is required and must be a string')
  }
  if (!input.url || typeof input.url !== 'string') {
    errors.push('url is required and must be a string')
  }
  if (typeof input.statusCode !== 'number' || input.statusCode < 100 || input.statusCode > 599) {
    errors.push('statusCode must be a number between 100 and 599')
  }
  if (typeof input.duration !== 'number' || input.duration < 0) {
    errors.push('duration must be a non-negative number')
  }

  // Optional fields
  if (input.timestamp !== undefined) {
    if (typeof input.timestamp !== 'number' || input.timestamp < 0) {
      errors.push('timestamp must be a positive number')
    }
  }

  if (input.requestHeaders !== undefined) {
    if (typeof input.requestHeaders !== 'object' || Array.isArray(input.requestHeaders)) {
      errors.push('requestHeaders must be an object')
    }
  }

  if (input.responseHeaders !== undefined) {
    if (typeof input.responseHeaders !== 'object' || Array.isArray(input.responseHeaders)) {
      errors.push('responseHeaders must be an object')
    }
  }

  // Validate URL
  try {
    new URL(input.url)
  } catch {
    errors.push('url must be a valid URL')
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  }
}
```

### Error Responses

**Bad Request (400)**:
```json
{
  "error": "Validation failed",
  "details": [
    "method is required",
    "statusCode must be between 100 and 599"
  ]
}
```

**Payload Too Large (413)**:
```json
{
  "error": "Request body exceeds maximum size (1MB)"
}
```

**Internal Server Error (500)**:
```json
{
  "error": "Internal server error",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Performance Considerations

### Ingestion Performance

**Target**: Handle 100+ logs/second without lag.

**Optimization strategies**:

1. **Minimal Validation** – Only check required fields, trust client for optional data
2. **No Async Operations** – Store synchronously, broadcast via event emitter
3. **Efficient Serialization** – JSON.stringify() is optimized in modern Node.js
4. **No Persistence** – In-memory only, no disk I/O
5. **Ring Buffer** – O(1) insertion, no array resizing

**Expected Performance**:
- Ingestion: 1,000+ logs/second (on modern hardware)
- Broadcast: <10ms per log (async, non-blocking)
- Memory: ~100MB with 1,000 logs (~100KB per log average)

### Memory Management

```typescript
interface LogMemoryEstimate {
  baseLog: 300            // Object structure
  method: 10              // "GET", "POST", etc.
  url: 200                // Typical URL length
  headers: 500            // Request + response headers
  requestBody: 1000       // Typical request payload
  responseBody: 2000      // Typical response payload
  total: 4000             // ~4KB average
}

// With 1,000 logs: ~4MB
// Safety margin: ~100MB limit
```

### WebSocket Broadcasting

When a new log arrives, it's broadcast to all connected clients:

```typescript
function broadcastLog(log: ApiLog) {
  const message = JSON.stringify({ type: 'new_log', data: log })

  // Async broadcast (doesn't block ingestion)
  setImmediate(() => {
    fastifyInstance.websocketServer?.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message, (err) => {
          if (err) {
            // Log error but don't crash
            console.error('WS send error:', err)
          }
        })
      }
    })
  })
}
```

---

## Concurrency & Thread Safety

### Single-Threaded Model

Fastify runs on a single event loop. The ring buffer is not thread-safe, but this is safe because:

1. **All operations are synchronous** – No race conditions on the buffer
2. **Event loop serializes requests** – Only one handler runs at a time
3. **WebSocket broadcast is async** – Doesn't block log ingestion

### Potential Issue: Multiple Workers

If Fastify is configured with multiple workers (Clustering), the ring buffer will be separate per worker. This is fine for Phase 1, but Phase 2 may need:
- Shared memory or database for multi-worker scenarios
- Message passing between workers
- Central log aggregation

---

## Security Considerations

### Phase 1 (Current)

**No authentication/authorization**:
- Server assumes local-only access (`127.0.0.1:9090`)
- Tauri app communicates over localhost
- No API key or token validation required

**Data handling**:
- Logs may contain sensitive data (tokens, PII)
- Headers and bodies are stored as-is
- No encryption or redaction in Phase 1

**Mitigation**:
- Only expose on localhost
- Clear logs on app exit (in-memory storage)
- Document that logs contain sensitive data
- Plan Phase 2 encryption/sanitization

### Phase 2+ (Future)

- Add API authentication (API key or JWT)
- Support HTTPS/WSS for network transmission
- Implement log data sanitization (mask tokens, PII)
- Add access control for shared/team scenarios
- Encrypt sensitive fields at rest

### Rate Limiting

**Phase 1**: No rate limiting. All requests accepted.

**Phase 2**: Consider adding:
- Per-IP rate limit: 1,000 logs/second per client
- Burst limit: 10,000 logs/second (short spike)
- Connection throttling: Max 100 concurrent connections

---

## Observability

### Logging

Server logs important events:

```typescript
// Server startup
console.log(`Server running at http://127.0.0.1:${PORT}`)

// Log ingestion
app.post('/api/logs', (request, reply) => {
  const logId = logEntry.id
  console.log(`[POST /api/logs] Received log ${logId}`)
  // ...
})

// WebSocket events
app.get('/ws', (socket, req) => {
  console.log(`[WS] Client connected. Total: ${clients.size}`)

  socket.on('close', () => {
    console.log(`[WS] Client disconnected. Total: ${clients.size}`)
  })
})

// Errors
console.error(`[ERROR] Validation failed: ${JSON.stringify(errors)}`)
```

### Metrics (Future)

Phase 2 could add:
- Logs per second (throughput)
- Buffer utilization (% of 1,000)
- WebSocket client count
- Average request size
- Average response time
- Error rate

---

## Configuration

### Environment Variables

```bash
# Port (default: 9090)
PORT=9090

# Max logs in buffer (default: 1000)
MAX_LOGS=1000

# Log level (default: info)
LOG_LEVEL=info
# Options: debug, info, warn, error

# Enable CORS (default: true, required for local dev)
CORS_ENABLED=true
```

### Fastify Configuration

```typescript
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  },
  bodyLimit: 1048576  // 1MB
})

app.register(require('@fastify/cors'), {
  origin: true  // Allow any origin (safe for localhost)
})

app.register(require('@fastify/websocket'), {
  options: {
    clientTracking: true
  }
})
```

---

## Testing

### Unit Tests

```typescript
describe('RingBuffer', () => {
  it('should add items and maintain order', () => {
    const buffer = new RingBuffer(3)
    buffer.add({ id: '1' })
    buffer.add({ id: '2' })
    buffer.add({ id: '3' })

    expect(buffer.getAll()).toEqual([
      { id: '1' },
      { id: '2' },
      { id: '3' }
    ])
  })

  it('should evict oldest item when full', () => {
    const buffer = new RingBuffer(3)
    buffer.add({ id: '1' })
    buffer.add({ id: '2' })
    buffer.add({ id: '3' })
    buffer.add({ id: '4' })  // '1' is evicted

    expect(buffer.getAll()).toEqual([
      { id: '2' },
      { id: '3' },
      { id: '4' }
    ])
  })
})
```

### Integration Tests

```typescript
describe('POST /api/logs', () => {
  it('should accept valid log and return 202', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/logs',
      payload: {
        type: 'api_log',
        method: 'GET',
        url: 'https://api.example.com/users',
        statusCode: 200,
        duration: 150
      }
    })

    expect(response.statusCode).toBe(202)
    expect(response.json()).toHaveProperty('id')
  })

  it('should reject missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/logs',
      payload: {
        method: 'GET'
        // missing type, url, statusCode, duration
      }
    })

    expect(response.statusCode).toBe(400)
  })

  it('should reject unsupported log type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/logs',
      payload: {
        type: 'unsupported_type',
        method: 'GET',
        url: 'https://api.example.com/users',
        statusCode: 200,
        duration: 150
      }
    })

    expect(response.statusCode).toBe(400)
  })
})

describe('WebSocket /ws', () => {
  it('should send initial_logs on connection', async () => {
    // Setup: add some logs
    // Connect WebSocket
    // Receive initial_logs message
  })

  it('should broadcast new_log on POST', async () => {
    // Connect WebSocket
    // POST a new log
    // Receive new_log message
  })
})
```

### Manual Testing

```bash
# Start server
npm run dev

# In another terminal, send a log
curl -X POST http://localhost:9090/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api_log",
    "method": "GET",
    "url": "https://api.example.com/users",
    "statusCode": 200,
    "duration": 150
  }'

# Monitor WebSocket with wscat
npm install -g wscat
wscat -c ws://localhost:9090/ws
```

---

## Deployment

### Bundling with Tauri

The Fastify server is bundled with the Tauri app. When the user opens dev-see:

1. **Tauri launches** the main window
2. **Rust main.rs spawns** a Node.js process running the Fastify server
3. **Server starts** on `localhost:9090`
4. **UI connects** via WebSocket to receive logs

```rust
// src-tauri/src/main.rs
fn main() {
    // Spawn server
    let _server_child = Command::new(resource_path("server/index.js"))
        .spawn()
        .expect("Failed to start server");

    // Launch UI
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Error while running tauri application");

    // Server continues running until app exits
}
```

### Building

```bash
# Compile TypeScript
npm run build

# Output: packages/server/dist/index.js
```

---

## Future Enhancements (Phase 2+)

### Database Persistence

Replace in-memory ring buffer with SQLite:
- Persistent storage
- Complex queries (by date range, status, etc.)
- Export/archive
- Historical analysis

### Advanced Filtering

Query language for complex searches:
```
status >= 400 AND duration > 1000
method = "POST" OR method = "PUT"
url CONTAINS "api.example.com" AND timestamp > 2026-02-12
```

### Log Types

Extend beyond API logs:
- Console logs (stdout, stderr)
- Database queries
- Analytics events
- Performance metrics
- Crash reports

**Design**: The `type` field in ApiLog (Phase 1: `api_log` only) is designed to be extensible:

```typescript
// Phase 1: Only api_log is supported
type LogType = 'api_log'

// Phase 2+: Extend to support more types
type LogType = 'api_log' | 'console_log' | 'db_query' | 'metric' | 'event' | 'crash_report'

// Type-specific data models
interface ConsoleLog {
  id: string
  type: 'console_log'
  appId?: string
  timestamp: number
  level: 'log' | 'info' | 'warn' | 'error'    // console level
  output: string                               // stdout/stderr content
}

interface DbQuery {
  id: string
  type: 'db_query'
  appId?: string
  timestamp: number
  query: string                                // SQL or other query
  duration: number
  rowsAffected?: number
  error?: string
}

// Clients will specify type when posting:
// POST /api/logs { type: 'console_log', level: 'error', output: '...' }
// POST /api/logs { type: 'db_query', query: 'SELECT ...', duration: 42 }
```

### Multi-User/Team Features

- User authentication
- Shared log sessions
- Access control
- Team collaboration
- Cloud sync

### Performance Features

- Indexed search
- Caching
- Compression
- Streaming large payloads
- Sampling (1 in N logs)

---

## References

- [Fastify Documentation](https://fastify.dev/)
- [WebSocket Protocol (RFC 6455)](https://tools.ietf.org/html/rfc6455)
- [HTTP Status Codes (RFC 7231)](https://tools.ietf.org/html/rfc7231)
- [JSON Schema](https://json-schema.org/)
- [Ring Buffer Pattern](https://en.wikipedia.org/wiki/Circular_buffer)
