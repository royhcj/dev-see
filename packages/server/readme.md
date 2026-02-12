# dev-see Server

Fastify-based backend server for the dev-see log viewer application.

## Overview

This server provides:

- **REST API** for submitting and retrieving HTTP request/response logs
- **WebSocket endpoint** for real-time log streaming to connected clients
- **In-memory storage** using a ring buffer (configurable size, automatic cleanup)
- **Static file serving** for the built Svelte UI (production mode)
- **CORS support** for cross-origin development

## Architecture

```
src/
├── index.ts              # Server entry point, plugin registration
├── models.ts             # TypeScript type definitions
├── routes/
│   ├── logs.ts          # REST API endpoints for logs
│   └── ws.ts            # WebSocket endpoint for real-time updates
├── storage/
│   └── ring-buffer.ts   # In-memory circular buffer for log storage
└── utils/
    └── validation.ts    # Request validation helpers
```

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment (optional)

Copy `.env.local` and customize if needed:

```bash
cp .env.local .env.local
```

### 3. Run development server

```bash
pnpm dev
```

The server will start at `http://localhost:9090` (or configured PORT).

### 4. Build for production

```bash
pnpm build
```

This compiles TypeScript to JavaScript in the `dist/` folder.

### 5. Run production server

```bash
pnpm start
```

## API Documentation

### POST /api/logs

Submit a new log entry.

**Request Body:**

```json
{
  "method": "GET",
  "url": "https://api.example.com/users",
  "statusCode": 200,
  "duration": 150,
  "requestHeaders": {
    "Authorization": "Bearer token123"
  },
  "requestBody": null,
  "responseHeaders": {
    "Content-Type": "application/json"
  },
  "responseBody": {
    "users": [...]
  },
  "error": null
}
```

**Required fields:**
- `method` (string): HTTP method (GET, POST, etc.)
- `url` (string): Full URL of the request
- `statusCode` (number): HTTP status code (100-599)
- `duration` (number): Request duration in milliseconds

**Optional fields:**
- `requestHeaders` (object): Request headers
- `requestBody` (any): Request body
- `responseHeaders` (object): Response headers
- `responseBody` (any): Response body
- `error` (string): Error message if request failed

**Response:** 201 Created

```json
{
  "id": "V1StGXR8_Z5jdHi6B",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "method": "GET",
  "url": "https://api.example.com/users",
  "statusCode": 200,
  "duration": 150,
  ...
}
```

### GET /api/logs

Retrieve all logs or recent N logs.

**Query Parameters:**
- `limit` (optional): Number of recent logs to return

**Example:**
```bash
curl http://localhost:9090/api/logs?limit=10
```

**Response:** 200 OK

```json
{
  "logs": [...],
  "count": 10
}
```

### GET /api/logs/:id

Retrieve a specific log by ID.

**Response:** 200 OK (log object) or 404 Not Found

### DELETE /api/logs

Clear all logs from buffer.

**Response:** 200 OK

```json
{
  "message": "All logs cleared"
}
```

### WebSocket: /ws

Real-time log streaming endpoint.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:9090/ws');
```

**Server → Client Messages:**

1. **Connected:**
   ```json
   {
     "type": "connected",
     "data": {
       "message": "Connected to dev-see log server",
       "count": 42
     }
   }
   ```

2. **Initial logs (on connect):**
   ```json
   {
     "type": "initial-logs",
     "data": [...]
   }
   ```

3. **New log (real-time):**
   ```json
   {
     "type": "new-log",
     "data": { "id": "...", ... }
   }
   ```

**Client → Server Messages:**

1. **Ping (heartbeat):**
   ```json
   { "type": "ping" }
   ```

2. **Request current logs:**
   ```json
   { "type": "get-logs" }
   ```

## Environment Variables

Configure via `.env.local` file:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `9090` | Server port |
| `HOST` | `0.0.0.0` | Host address (0.0.0.0 = all interfaces) |
| `MAX_LOGS` | `1000` | Maximum logs in memory (ring buffer size) |
| `LOG_LEVEL` | `info` | Logging level (trace, debug, info, warn, error) |
| `CORS_ENABLED` | `true` | Enable CORS for cross-origin requests |
| `UI_DIST_PATH` | `../../apps/ui/dist` | Path to built UI files |

## npm Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot-reload (tsx watch) |
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm start` | Run compiled production server |
| `pnpm test` | Run tests with Vitest |
| `pnpm test:ui` | Run tests with Vitest UI |
| `pnpm lint` | Lint TypeScript files with ESLint |

## Development

### Hot Reload

The `pnpm dev` script uses `tsx watch`, which automatically restarts the server when you modify any `.ts` file.

### Testing

Example curl command to submit a log:

```bash
curl -X POST http://localhost:9090/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://api.example.com/test",
    "statusCode": 200,
    "duration": 123
  }'
```

### WebSocket Testing

You can test WebSocket connections using browser DevTools:

1. Open browser console
2. Connect: `const ws = new WebSocket('ws://localhost:9090/ws')`
3. Listen: `ws.onmessage = (e) => console.log(JSON.parse(e.data))`
4. Send logs via curl and watch them appear in console

## Technology Stack

- **[Fastify](https://www.fastify.io/)**: Fast, low-overhead web framework
- **[@fastify/cors](https://github.com/fastify/fastify-cors)**: CORS support
- **[@fastify/websocket](https://github.com/fastify/fastify-websocket)**: WebSocket support
- **[@fastify/static](https://github.com/fastify/fastify-static)**: Static file serving
- **[TypeScript](https://www.typescriptlang.org/)**: Type-safe JavaScript
- **[tsx](https://github.com/esbuild-kit/tsx)**: TypeScript execution with hot-reload
- **[Vitest](https://vitest.dev/)**: Fast unit testing framework
- **[nanoid](https://github.com/ai/nanoid)**: Unique ID generation

## License

ISC
