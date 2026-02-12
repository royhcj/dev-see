# dev-see

A web-based API log viewer built with Svelte and Fastify. View and analyze API calls in real-time through any modern browser.

## Overview

**dev-see** is a universal API log viewer that runs in your browser. It consists of:
- **Fastify Server** (`packages/server`) - Backend API that receives and stores logs
- **Svelte UI** (`apps/ui`) - Frontend web app for viewing logs in real-time
- **WebSocket Support** - Real-time log streaming to all connected clients

## Quick Start

### Prerequisites

- **Node.js** v20+ or v22 LTS ([download](https://nodejs.org))
- **pnpm** (recommended) - Install with: `npm install -g pnpm`

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dev-see

# Install all dependencies
pnpm install
```

### Development

**Option 1: Run everything in parallel** (recommended for development)
```bash
pnpm dev
```
This starts both the server (http://localhost:9090) and UI dev server (http://localhost:5173) with hot reload.

**Option 2: Run separately in two terminals**

Terminal 1 - Server:
```bash
pnpm dev:server
# Server runs at http://localhost:9090
```

Terminal 2 - UI:
```bash
pnpm dev:ui
# UI dev server at http://localhost:5173
```

**Option 3: Production-like setup**
```bash
# Build the UI
pnpm build:ui

# Start the server (serves built UI)
pnpm dev:server
# Access at http://localhost:9090
```

### Testing the API

Send a test log entry:
```bash
curl -X POST http://localhost:9090/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://api.example.com/users",
    "statusCode": 200,
    "duration": 150
  }'
```

The log should appear in real-time in the web UI!

## Project Structure

```
dev-see/
├── apps/
│   └── ui/              # Svelte frontend (web app)
├── packages/
│   └── server/          # Fastify backend
├── docs/                # Documentation
├── package.json         # Root workspace config
└── pnpm-workspace.yaml  # pnpm workspace config
```

## Available Scripts

From the project root:

- `pnpm dev` - Run server + UI dev servers in parallel
- `pnpm dev:server` - Run server only
- `pnpm dev:ui` - Run UI dev server only
- `pnpm build` - Build all packages
- `pnpm build:ui` - Build UI only
- `pnpm build:server` - Build server only
- `pnpm test` - Run all tests
- `pnpm lint` - Run linting for all packages

## Documentation

- [Setup Plan](docs/plans/setup-project/setup-project-plan.md) - Detailed setup instructions
- [Server Design](docs/log-server-design.md) - Server architecture and API documentation
- [UI Design](docs/log-viewer-design.md) - Frontend architecture and components

## Technology Stack

- **Frontend**: Svelte + TypeScript + Vite + Tailwind CSS
- **Backend**: Fastify + TypeScript + WebSocket
- **Package Manager**: pnpm (monorepo/workspace support)
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

[License information to be added]
