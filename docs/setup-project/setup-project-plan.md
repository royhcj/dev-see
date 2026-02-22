# dev-see Project Setup Plan

> Last updated: 2026-02-13

## Overview

This document outlines the complete setup and initialization plan for the **dev-see** project—a web-based API log viewer built with Svelte and Fastify, accessible via any modern browser.

**Phase 1 Target**: Web application (browser-based) for universal access across all platforms.
**Phase 1.5 Target** (Optional): Native macOS desktop app wrapper using Tauri.

### Why Web First?

- ✅ **Simpler development** - No Rust/Tauri complexity initially
- ✅ **Faster iteration** - Web dev workflow with instant refresh
- ✅ **Cross-platform from day 1** - Works on macOS, Windows, Linux
- ✅ **Easier testing** - Browser DevTools, no native builds
- ✅ **Universal deployment** - Deploy to cloud or run locally
- ✅ **Lower barrier** - Users just need Node.js and a browser

---

## 1. Prerequisites (Phase 1 - Web App)

### System Requirements
- **Operating System**: macOS, Windows, or Linux (any OS with Node.js support)
- **Node.js**: 20+ LTS (v20, v22 recommended; v18 is deprecated)
- **Package Manager**: npm (included with Node.js) or pnpm (recommended)
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

### Setup Steps

1. **Install Node.js**
   ```bash
   # Using nvm (recommended for version management)
   nvm install 22  # or 20 for LTS stability
   nvm use 22

   # Or using Homebrew (macOS)
   brew install node

   # Or download from https://nodejs.org

   # Verify installation
   node --version
   npm --version
   ```

2. **Install pnpm (Optional but Recommended)**
   ```bash
   npm install -g pnpm

   # Verify installation
   pnpm --version
   ```

### Verify Environment
```bash
node --version      # Should be v20+ (v22.21.1 confirmed working)
npm --version       # Should be 9+
pnpm --version      # Optional: 8+ if using pnpm
```

---

## 1.5. Additional Prerequisites (Phase 1.5 - Desktop App, Optional)

Only required if you plan to build the native macOS desktop app:

- **macOS**: 12+ (Intel & Apple Silicon supported)
- **Rust**: Latest stable (for Tauri compilation)

### Setup Steps

1. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source "$HOME/.cargo/env"

   # Verify installation
   rustc --version
   cargo --version
   ```

2. **Install Tauri Prerequisites**
   ```bash
   # macOS specific dependencies
   brew install libsoup
   ```

---

## 2. Repository Structure

### Proposed Layout (Phase 1 - Web App)

```
dev-see/
├── docs/                        # Project documentation
│   ├── plans/
│   │   └── setup-project/       # This plan
│   ├── overview.md              # Phase 1 overview
│   ├── log-server-design.md     # Server architecture
│   ├── log-viewer-design.md     # UI architecture
│   ├── tech-stack.md            # Technology choices
│   └── index.md                 # Documentation index
│
├── apps/
│   └── ui/                      # Svelte frontend (web app)
│       ├── src/
│       │   ├── App.svelte       # Root component
│       │   ├── main.ts          # Vite entry point
│       │   ├── components/
│       │   │   ├── LogList.svelte
│       │   │   ├── LogDetail.svelte
│       │   │   ├── Search.svelte
│       │   │   └── Controls.svelte
│       │   ├── stores/
│       │   │   └── logs.ts      # Svelte store for logs
│       │   ├── lib/
│       │   │   └── websocket.ts # WS client
│       │   └── styles/
│       │       └── global.css
│       ├── dist/                # Built output (served by server)
│       ├── tests/
│       ├── package.json
│       ├── svelte.config.js
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── README.md
│
├── packages/
│   └── server/                  # Fastify backend
│       ├── src/
│       │   ├── index.ts         # Entry point
│       │   ├── routes/
│       │   │   ├── logs.ts      # POST /api/logs
│       │   │   └── ws.ts        # WS /ws
│       │   ├── storage/
│       │   │   └── ring-buffer.ts
│       │   ├── models.ts        # TypeScript types
│       │   └── utils/
│       │       └── validation.ts
│       ├── dist/                # Compiled JS
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── .gitignore
├── package.json                 # Root workspace (pnpm workspaces)
├── pnpm-workspace.yaml          # pnpm workspace config
├── tsconfig.json                # Root TypeScript config
├── README.md                    # Project root readme
└── CONTRIBUTING.md              # Contribution guidelines
```

### Phase 1.5 - Desktop App (Optional)

When adding the desktop app, create:

```
apps/
└── desktop/                     # Tauri desktop wrapper
    ├── src-tauri/
    │   ├── src/
    │   │   └── main.rs          # Tauri entry point
    │   ├── tauri.conf.json      # Tauri configuration
    │   └── Cargo.toml
    ├── package.json
    └── README.md
```

---

## 3. Workspace Setup

### Initialize Root Workspace

1. **Create package.json** (root)
   ```json
   {
     "name": "dev-see",
     "version": "0.1.0",
     "description": "Web-based API log viewer",
     "private": true,
     "scripts": {
       "dev": "pnpm run --parallel dev",
       "dev:server": "pnpm --filter server dev",
       "dev:ui": "pnpm --filter ui dev",
       "build": "pnpm run --parallel build",
       "build:ui": "pnpm --filter ui build",
       "build:server": "pnpm --filter server build",
       "test": "pnpm run --recursive test",
       "lint": "pnpm run --recursive lint"
     }
   }
   ```

2. **Create pnpm-workspace.yaml**
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

3. **Create directory structure**
   ```bash
   mkdir -p apps/ui
   mkdir -p packages/server
   mkdir -p docs/plans/setup-project
   ```

4. **Root .gitignore**
   ```
   # Dependencies
   node_modules/
   .pnp

   # Build outputs
   dist/
   build/

   # Tauri specific
   src-tauri/target/

   # Environment
   .env
   .env.local

   # IDE
   .vscode/
   .idea/
   *.swp
   *.swo

   # OS
   .DS_Store
   Thumbs.db

   # Logs
   logs/
   *.log
   ```

---

## 4. Package Setup

### 4.1 Fastify Server (`packages/server`)

1. **Initialize package**
   ```bash
   cd packages/server
   pnpm init
   ```

2. **Install dependencies**
   ```bash
   pnpm add fastify @fastify/cors @fastify/websocket @fastify/static
   pnpm add -D typescript tsx @types/node
   pnpm add -D vitest @vitest/ui
   pnpm add -D prettier eslint
   ```

   **Note**: `@fastify/static` is required to serve the built UI files for web deployment.

3. **Create tsconfig.json**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "commonjs",
       "lib": ["ES2020"],
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "tests"]
   }
   ```

4. **Add npm scripts**
   ```json
   {
     "name": "server",
     "scripts": {
       "dev": "tsx watch src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js",
       "test": "vitest",
       "lint": "eslint src --ext .ts"
     }
   }
   ```

5. **Update server to serve static UI files**

   The server should be configured to:
   - Serve API routes (`/api/logs`, `/ws`)
   - Serve built UI files from `../../apps/ui/dist` or `../ui/dist` (adjust path based on workspace structure)
   - Provide catch-all route for SPA (Single Page Application) routing

### 4.2 Svelte UI (`apps/ui`)

1. **Initialize with Vite + Svelte**
   ```bash
   cd apps/ui
   pnpm create vite@latest . -- --template svelte-ts
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   pnpm add -D tailwindcss postcss autoprefixer
   pnpm add -D vitest @testing-library/svelte
   ```

3. **Configure Tailwind (optional, but recommended)**
   ```bash
   pnpm dlx tailwindcss init -p
   ```

4. **Update vite.config.ts** to output to `dist/`
   ```typescript
   import { defineConfig } from 'vite';
   import { svelte } from '@sveltejs/vite-plugin-svelte';

   export default defineConfig({
     plugins: [svelte()],
     server: {
       port: 5173,
     },
     build: {
       outDir: 'dist',
       emptyOutDir: true,
     },
   });
   ```

5. **Add package.json scripts**
   ```json
   {
     "name": "ui",
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "test": "vitest",
       "lint": "eslint src --ext .svelte,.ts"
     }
   }
   ```

---

## 5. Development Workflow Setup (Phase 1 - Web App)

### 5.1 Local Development

**Recommended: Use two terminals**

1. **Terminal 1: Start Fastify server**
   ```bash
   pnpm dev:server
   # Server runs at http://localhost:9090
   ```

2. **Terminal 2: Start Vite dev server** (for UI hot reload during development)
   ```bash
   pnpm dev:ui
   # UI dev server at http://localhost:5173
   ```

   **OR** for production-like testing:
   ```bash
   # Build UI once
   pnpm build:ui

   # Start server (which serves built UI from apps/ui/dist)
   pnpm dev:server

   # Access at http://localhost:9090
   ```

**Parallel development (both at once):**
```bash
pnpm dev
# Runs both server and UI dev servers in parallel
```

### 5.2 Testing Workflow

```bash
# Test server
pnpm --filter server test

# Test UI
pnpm --filter ui test

# Test all
pnpm test
```

### 5.3 Build Process (Phase 1)

```bash
# Build UI (creates apps/ui/dist/)
pnpm build:ui

# Build server (compiles TS to packages/server/dist/)
pnpm build:server

# Build both
pnpm build
```

---

## 6. Phase 1.5 - Desktop App Setup (Optional)

Only proceed with this section if you want to add the native macOS desktop wrapper.

### 4.3 Tauri Desktop Wrapper (`apps/desktop`)

**Prerequisites**: Ensure Rust and Tauri prerequisites are installed (see section 1.5)

1. **Initialize Tauri**
   ```bash
   cd apps/desktop
   pnpm create tauri-app@latest . -- --manager pnpm
   ```

2. **Post-initialization setup**
   ```bash
   pnpm install
   pnpm add -D @tauri-apps/cli @tauri-apps/api
   ```

3. **Update Tauri configuration**
   - Edit `src-tauri/tauri.conf.json`:
     ```json
     {
       "build": {
         "beforeBuildCommand": "pnpm build:ui",
         "beforeDevCommand": "pnpm dev:ui",
         "devPath": "http://localhost:5173",
         "frontendDist": "../../apps/ui/dist"
       },
       "app": {
         "windows": [
           {
             "title": "dev-see",
             "width": 1400,
             "height": 900,
             "resizable": true,
             "fullscreen": false
           }
         ]
       }
     }
     ```

4. **Configure server launcher in Rust**
   - Update `src-tauri/src/main.rs` to spawn the Fastify server as a child process
   - Server should start on app launch and stop on app exit

5. **Add desktop-specific scripts to root package.json**
   ```json
   {
     "scripts": {
       "dev:desktop": "pnpm --filter desktop tauri dev",
       "build:desktop": "pnpm --filter desktop tauri build"
     }
   }
   ```

---

## 6. Coding Standards

### TypeScript Configuration

- **Strict mode**: Enabled globally
- **Module system**: CommonJS for server, ESM for client
- **Target**: ES2020

### Code Style

- **Formatter**: Prettier (`.prettierrc`)
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "tabWidth": 2,
    "useTabs": false,
    "trailingComma": "es5"
  }
  ```

- **Linter**: ESLint
  - Core rule set: `eslint:recommended`
  - TypeScript: `@typescript-eslint/recommended`
  - Svelte: `plugin:svelte/recommended`

- **Git hooks** (optional, but recommended)
  ```bash
  npm install --save-dev husky lint-staged
  npx husky install
  npx husky add .husky/pre-commit "npm run lint"
  ```

---

## 7. Testing Strategy

### Unit Testing

- **Framework**: Vitest (fast, Vue/Svelte-compatible)
- **Location**: `src/__tests__` or `*.test.ts` alongside code
- **Coverage**: Aim for >80% for critical paths

**Server tests** (`packages/server`):
```bash
npm run test -w packages/server
```

**UI tests** (`packages/ui`):
```bash
npm run test -w packages/ui
```

### Integration Testing

- Test server endpoints with example payloads
- Test WebSocket connection and message flow
- Test UI connecting to mock server

### Manual Testing

- Manual UI interaction in dev mode
- cURL/Postman for server endpoints
- wscat for WebSocket debugging

---

## 7. Environment Configuration

### Development Environment Variables

Create `.env.local` in each app/package root:

**`packages/server/.env.local`** (Phase 1):
```
PORT=9090
HOST=0.0.0.0
MAX_LOGS=1000
LOG_LEVEL=debug
CORS_ENABLED=true
UI_DIST_PATH=../../apps/ui/dist
```

**`apps/ui/.env.local`** (Phase 1 - for development):
```
VITE_SERVER_URL=http://localhost:9090
VITE_WS_URL=ws://localhost:9090/ws
```

### Production Environment Variables

For deployed web app:
```
PORT=9090
HOST=0.0.0.0
MAX_LOGS=1000
LOG_LEVEL=info
CORS_ENABLED=false  # or configure allowed origins
UI_DIST_PATH=../ui/dist
```

---

## 8. Documentation

### README Files

Each app/package should have a README with:
- Purpose and responsibility
- How to run in development
- Build and deployment instructions
- API documentation (for server)

**Required READMEs**:
- `README.md` (root) - Project overview, quick start, deployment options
- `packages/server/README.md` - Server API, configuration, deployment
- `apps/ui/README.md` - UI development, components, testing
- `apps/desktop/README.md` (Phase 1.5) - Desktop app build instructions

### API Documentation

- **Server API**: Detailed in [log-server-design.md](../../log-server-design.md)
- **WebSocket Protocol**: Documented in server design
- **UI Components**: Inline JSDoc comments in Svelte files

### CONTRIBUTING.md

- Setup instructions for contributors (Phase 1 and Phase 1.5)
- Code style guidelines
- How to submit PRs
- Testing requirements
- How to add features to both web and desktop versions

---

## 9. Tooling & IDE Setup

### Recommended VS Code Extensions (Phase 1)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "svelte.svelte-vscode",
    "biomejs.biome"
  ]
}
```

**Phase 1.5 additions**:
- `rust-lang.rust-analyzer` (for Tauri/Rust development)

### VS Code Settings (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[svelte]": {
    "editor.defaultFormatter": "svelte.svelte-vscode"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "svelte"
  ]
}
```

**Add for Phase 1.5**:
```json
{
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

---

## 10. CI/CD Pipeline (Phase 2)

### GitHub Actions Workflow

Future workflows to implement:
- **Lint & Test**: Run on every PR for all workspaces
- **Build Check**: Verify server + UI builds succeed
- **Deploy Web**: Deploy web app to hosting (Railway, Vercel, etc.)
- **Release Desktop** (Phase 1.5): Create macOS .dmg on tagged commits

See `.github/workflows/` directory for details.

---

## 11. First-Time Setup Checklist

### Phase 1 - Web App

- [ ] Clone repository
- [ ] Install Node.js 20+ (v22 recommended)
- [ ] Install pnpm globally: `npm install -g pnpm`
- [ ] Run `pnpm install` from project root
- [ ] Verify server starts: `pnpm dev:server`
- [ ] Verify UI dev server starts: `pnpm dev:ui`
- [ ] Build UI: `pnpm build:ui`
- [ ] Test integrated web app: Navigate to `http://localhost:9090` with server running
- [ ] Test server endpoint with cURL:
  ```bash
  curl -X POST http://localhost:9090/api/logs \
    -H "Content-Type: application/json" \
    -d '{"method":"GET","url":"https://api.example.com/test","statusCode":200}'
  ```
- [ ] Test WebSocket connection with browser DevTools or wscat
- [ ] Read through design documents
- [ ] Verify linting and tests run successfully

### Phase 1.5 - Desktop App (Optional)

- [ ] Install Rust: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [ ] Install macOS dependencies: `brew install libsoup`
- [ ] Initialize desktop app: Follow section 6
- [ ] Run `pnpm dev:desktop` to verify Tauri app launches
- [ ] Test that desktop app bundles and starts server automatically

---

## 12. Troubleshooting

### Common Issues (Phase 1)

| Issue | Solution |
|-------|----------|
| **Port 9090 already in use** | Kill the process: `lsof -i :9090 \| grep LISTEN \| awk '{print $2}' \| xargs kill -9` |
| **WebSocket connection fails** | Verify server is running on localhost:9090 and WS URL is correct in UI config |
| **Module not found errors** | Run `pnpm install` from project root |
| **UI not loading** | Ensure UI is built (`pnpm build:ui`) and server can find `UI_DIST_PATH` |
| **CORS errors in browser** | Check server CORS configuration in `.env.local` |
| **pnpm command not found** | Install globally: `npm install -g pnpm` |

### Additional Issues (Phase 1.5)

| Issue | Solution |
|-------|----------|
| **Rust compilation errors** | Run `rustup update` and `cargo clean` |
| **Tauri build fails** | Check Tauri documentation and ensure all native dependencies are installed |
| **Server not starting in Tauri** | Check `src-tauri/src/main.rs` for correct server path |

---

## 13. Next Steps After Setup

### Phase 1 - Web App

1. **Create initial server implementation** (see [log-server-design.md](../../log-server-design.md))
   - Implement `/api/logs` POST endpoint
   - Implement `/ws` WebSocket endpoint
   - Implement ring buffer storage
   - Serve static UI files

2. **Create initial UI components** (see [log-viewer-design.md](../../log-viewer-design.md))
   - LogList component
   - LogDetail component
   - Search/filter functionality
   - WebSocket integration

3. **Write unit and integration tests**
   - Server endpoint tests
   - UI component tests
   - WebSocket connection tests

4. **Deploy web version**
   - Choose hosting platform (Railway, Render, Fly.io, etc.)
   - Configure environment variables
   - Set up continuous deployment

5. **Documentation**
   - Usage guide for web app
   - API documentation
   - Deployment guide

### Phase 1.5 - Desktop App (Optional)

6. **Integrate Tauri with server spawning**
7. **Build macOS .dmg installer**
8. **Test desktop app on different macOS versions**
9. **Create desktop app documentation**

---

## References

- [Node.js Documentation](https://nodejs.org/docs/)
- [Fastify Documentation](https://fastify.dev/)
- [Svelte Documentation](https://svelte.dev/)
- [Tauri Documentation](https://tauri.app/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
