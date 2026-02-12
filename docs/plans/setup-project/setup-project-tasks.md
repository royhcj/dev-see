# dev-see Project Setup Tasks

> **Strategy**: Web app first (Phase 1), Desktop app optional (Phase 1.5)

## Prerequisites (Phase 1 - Web App) ✅

- [x] Install Node.js v20+ or v22 LTS (nvm or Homebrew)
  - *Requires user interaction: Choose installation method*
- [x] Verify Node.js installation: `node --version` (should be v20+)
- [x] Verify npm installation: `npm --version` (should be v9+)
- [x] Install pnpm globally: `npm install -g pnpm`
- [x] Verify pnpm installation: `pnpm --version` (should be v8+)

## Repository Structure & Root Setup (Phase 1) ✅

- [x] Create root-level `package.json` with pnpm workspace scripts
- [x] Create `pnpm-workspace.yaml` with workspace configuration
- [x] Create directory structure:
  - `apps/ui` (Svelte web app)
  - `packages/server` (Fastify backend)
  - `docs/plans/setup-project`
- [x] Create root `.gitignore` with appropriate entries (node_modules, dist, .env, etc.)
- [x] Create root `tsconfig.json` (or verify it exists)
- [x] Create root `README.md` with project overview and web app quick start
- [x] Create `CONTRIBUTING.md` with contribution guidelines

## Fastify Server Setup (`packages/server`) - Phase 1 ✅

- [x] Initialize package: `cd packages/server && pnpm init`
- [x] Install core dependencies: `pnpm add fastify @fastify/cors @fastify/websocket @fastify/static`
- [x] Install dev dependencies: `pnpm add -D typescript tsx @types/node vitest @vitest/ui prettier eslint`
- [x] Create `tsconfig.json` with TypeScript configuration
- [x] Add pnpm scripts to `package.json`: `dev`, `build`, `start`, `test`, `lint`
- [x] Create `src/` directory structure
- [x] Create `src/index.ts` entry point (serves both API and static UI files)
- [x] Create `src/routes/` directory
- [x] Create `src/routes/logs.ts` for POST /api/logs endpoint
- [x] Create `src/routes/ws.ts` for WebSocket /ws endpoint
- [x] Create `src/storage/ring-buffer.ts` for in-memory log storage
- [x] Create `src/models.ts` for TypeScript types
- [x] Create `src/utils/validation.ts` utility
- [x] Configure static file serving for UI (path: `../../apps/ui/dist`)
- [x] Add SPA catch-all route (returns index.html for any unmatched route)
- [x] Create `tests/` directory for test files
- [x] Create `README.md` documenting server setup and API
- [x] Create `.env.local` with development variables:
  - PORT=9090
  - HOST=0.0.0.0
  - MAX_LOGS=1000
  - LOG_LEVEL=debug
  - CORS_ENABLED=true
  - UI_DIST_PATH=../../apps/ui/dist
  - *Requires user interaction: Configure if different from defaults*

## Svelte UI Setup (`apps/ui`) - Phase 1

- [ ] Initialize with Vite + Svelte: `cd apps/ui && pnpm create vite@latest . -- --template svelte-ts`
- [ ] Install dependencies: `pnpm install`
- [ ] Install dev dependencies: `pnpm add -D tailwindcss postcss autoprefixer vitest @testing-library/svelte`
- [ ] Configure Tailwind: `pnpm dlx tailwindcss init -p`
- [ ] Update `vite.config.ts` to set build output to `dist/`
- [ ] Create/update pnpm scripts in `package.json`: `dev`, `build`, `preview`, `test`, `lint`
- [ ] Create `src/components/LogList.svelte` component
- [ ] Create `src/components/LogDetail.svelte` component
- [ ] Create `src/components/Search.svelte` component
- [ ] Create `src/components/Controls.svelte` component
- [ ] Create `src/stores/logs.ts` Svelte store for reactive log state
- [ ] Create `src/lib/websocket.ts` WebSocket client
- [ ] Create `src/lib/config.ts` for runtime environment detection (Tauri vs browser)
- [ ] Create/update `src/styles/global.css`
- [ ] Create `tests/` directory for test files
- [ ] Create `README.md` documenting UI setup and development
- [ ] Create `.env.local` with development variables:
  - VITE_SERVER_URL=http://localhost:9090
  - VITE_WS_URL=ws://localhost:9090/ws
  - *Requires user interaction: Update URLs if server port changes*

---

## Phase 1.5 - Desktop App (Optional)

**Note**: Complete Phase 1 (web app) first before starting this section.

### Additional Prerequisites

- [ ] Install Rust via rustup: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- [ ] Verify Rust installation: `rustc --version` (should be 1.70+)
- [ ] Verify Cargo installation: `cargo --version` (should be 1.70+)
- [ ] Install macOS dependencies: `brew install libsoup`

### Tauri Desktop App Setup (`apps/desktop`)

- [ ] Create desktop app directory: `mkdir -p apps/desktop`
- [ ] Initialize Tauri app: `cd apps/desktop && pnpm create tauri-app@latest . -- --manager pnpm`
- [ ] Install dependencies: `pnpm install`
- [ ] Install dev dependencies: `pnpm add -D @tauri-apps/cli @tauri-apps/api`
- [ ] Update `src-tauri/tauri.conf.json`:
  - Set `beforeBuildCommand` to `pnpm build:ui`
  - Set `beforeDevCommand` to `pnpm dev:ui`
  - Set `devPath` to `http://localhost:5173`
  - Set `frontendDist` to `../../apps/ui/dist`
  - Configure app window (title: "dev-see", width: 1400, height: 900)
- [ ] Update `src-tauri/src/main.rs` to spawn Fastify server on app launch
  - *Requires user interaction: Review and implement Rust code*
- [ ] Create `README.md` documenting desktop app setup and build process
- [ ] Add desktop scripts to root `package.json`:
  - `dev:desktop`: `pnpm --filter desktop tauri dev`
  - `build:desktop`: `pnpm --filter desktop tauri build`
- [ ] Verify Tauri can access UI from bundled dist
- [ ] Verify server starts automatically with desktop app

---

## Code Standards Setup

- [ ] Create root `.prettierrc` with formatting rules:
  - `semi: true`, `singleQuote: true`, `tabWidth: 2`, `trailingComma: "es5"`
- [ ] Create `.eslintrc.json` or `.eslintrc.js` with:
  - Core: `eslint:recommended`
  - TypeScript: `@typescript-eslint/recommended`
  - Svelte: `plugin:svelte/recommended`
- [ ] (Optional) Set up Husky pre-commit hooks:
  - [ ] Install husky and lint-staged
  - [ ] Initialize husky
  - [ ] Add pre-commit hook for linting

## Testing Setup

- [ ] Set up Vitest for server tests
- [ ] Set up Vitest with @testing-library/svelte for UI tests
- [ ] Create example test file for server
- [ ] Create example test file for UI
- [ ] Configure test coverage targets (>80% for critical paths)
- [ ] Verify `npm run test` works for all packages

## Development Workflow (Phase 1 - Web App)

- [ ] Run `pnpm install` from project root to install all workspace dependencies
- [ ] Test server startup: `pnpm dev:server`
  - Should start at http://localhost:9090
- [ ] Test UI dev server startup: `pnpm dev:ui`
  - Should start at http://localhost:5173
- [ ] Verify parallel development: `pnpm dev`
  - Should run both server and UI dev servers concurrently
- [ ] Test integrated web app:
  - Build UI: `pnpm build:ui`
  - Start server: `pnpm dev:server`
  - Navigate to http://localhost:9090 in browser
  - Verify UI loads and WebSocket connects
- [ ] Set up terminal workflow for running 2 concurrent processes (server, UI dev)
  - *Requires user interaction: Decide on tool (tmux, iTerm split, separate terminals, etc.)*

### Development Workflow (Phase 1.5 - Desktop, Optional)

- [ ] Test desktop dev: `pnpm dev:desktop`
- [ ] Verify Tauri app launches with bundled server
- [ ] Test that server starts automatically when desktop app opens
- [ ] Test that server stops when desktop app closes

## VS Code & Tooling Setup

- [ ] Create `.vscode/extensions.json` with recommended extensions:
  - ESLint, Prettier, Svelte, Rust Analyzer, Biome
- [ ] Create `.vscode/settings.json` with:
  - Format on save enabled
  - Default formatters configured per language
  - ESLint validation for multiple file types
- [ ] (Optional) Install recommended VS Code extensions
  - *Requires user interaction: User chooses whether to install*

## Environment Configuration

- [ ] Create `packages/server/.env.local`:
  - PORT=9090
  - MAX_LOGS=1000
  - LOG_LEVEL=debug
  - CORS_ENABLED=true
- [ ] Create `packages/ui/.env.local`:
  - VITE_SERVER_URL=http://localhost:9090
  - VITE_WS_URL=ws://localhost:9090/ws
- [ ] Verify environment variables are loaded in development
- [ ] Document build-time environment variables (for production)

## Documentation

- [ ] Create/verify `docs/overview.md` - Phase 1 overview
- [ ] Create/verify `docs/log-server-design.md` - Server architecture and API documentation
- [ ] Create/verify `docs/log-viewer-design.md` - UI architecture and components
- [ ] Create/verify `docs/tech-stack.md` - Technology choices and rationale
- [ ] Create/verify `docs/index.md` - Documentation index
- [ ] Create package-level README files:
  - [ ] `packages/server/README.md` - API documentation and server setup
  - [ ] `packages/ui/README.md` - UI components and development
  - [ ] `packages/tauri/README.md` - Desktop app setup

## First-Time Setup Verification

### Phase 1 - Web App

- [ ] Clone repository (or verify existing clone)
- [ ] Run `pnpm install` from project root
- [ ] Run `pnpm dev:server` and verify server starts at http://localhost:9090
- [ ] Run `pnpm dev:ui` and verify UI dev server starts at http://localhost:5173
- [ ] Build and test integrated web app:
  - [ ] `pnpm build:ui`
  - [ ] Navigate to http://localhost:9090 in browser
  - [ ] Verify UI loads correctly
- [ ] Test server endpoint with cURL:
  ```bash
  curl -X POST http://localhost:9090/api/logs \
    -H "Content-Type: application/json" \
    -d '{"method":"GET","url":"https://api.example.com/users","statusCode":200,"duration":150}'
  ```
- [ ] Test WebSocket connection:
  - Open browser DevTools → Network → WS tab
  - Verify WebSocket connection to ws://localhost:9090/ws
  - Send test log via cURL and verify it appears in browser
- [ ] Read through all design documents
- [ ] Verify linting runs: `pnpm lint`
- [ ] Verify tests run: `pnpm test`

### Phase 1.5 - Desktop App (Optional)

- [ ] Run `pnpm dev:desktop` and verify Tauri app launches
- [ ] Verify server starts automatically with app
- [ ] Test sending logs while desktop app is running
- [ ] Verify desktop app build: `pnpm build:desktop`
- [ ] Test .dmg installer on macOS

## Post-Setup Next Steps

### Phase 1 - Web App

- [ ] Implement initial server endpoints (see log-server-design.md):
  - [ ] POST /api/logs endpoint with validation
  - [ ] WebSocket /ws endpoint for real-time streaming
  - [ ] Ring buffer storage implementation
  - [ ] Static file serving middleware
- [ ] Implement initial UI components (see log-viewer-design.md):
  - [ ] LogList component with virtual scrolling
  - [ ] LogDetail component with request/response tabs
  - [ ] Search and filter functionality
  - [ ] WebSocket integration for live updates
- [ ] Write unit and integration tests:
  - [ ] Server endpoint tests
  - [ ] WebSocket connection tests
  - [ ] UI component tests
  - [ ] End-to-end tests
- [ ] Deploy web version:
  - [ ] Choose hosting platform (Railway, Render, Fly.io, Vercel, etc.)
  - [ ] Configure environment variables for production
  - [ ] Set up continuous deployment from main branch
  - [ ] Test deployed version
- [ ] Create user documentation:
  - [ ] Getting started guide
  - [ ] API documentation for log submission
  - [ ] Troubleshooting guide

### Phase 1.5 - Desktop App (Optional)

- [ ] Integrate Tauri server spawning in main.rs
- [ ] Build and test macOS .dmg installer
- [ ] Create desktop-specific documentation
- [ ] Test on different macOS versions (Intel & Apple Silicon)

### Phase 2 - Future Enhancements

- [ ] Set up CI/CD pipeline with GitHub Actions
- [ ] Add persistent storage (SQLite or similar)
- [ ] Implement advanced search and filtering
- [ ] Add authentication for remote deployments
- [ ] Create Windows/Linux desktop apps

## Troubleshooting Reference

### Phase 1 - Web App

- [ ] Port 9090 conflict: `lsof -i :9090 | grep LISTEN | awk '{print $2}' | xargs kill -9`
- [ ] WebSocket connection fails: Verify server running at localhost:9090 and CORS enabled
- [ ] UI not loading: Check that UI is built (`pnpm build:ui`) and `UI_DIST_PATH` is correct
- [ ] CORS errors: Update `CORS_ENABLED=true` in server `.env.local`
- [ ] Module not found: Run `pnpm install` from project root
- [ ] pnpm command not found: Install globally with `npm install -g pnpm`
- [ ] Build fails: Clear caches with `pnpm store prune` and reinstall

### Phase 1.5 - Desktop App

- [ ] Rust compilation errors: `rustup update` and `cargo clean`
- [ ] Tauri build fails: Ensure libsoup installed (`brew install libsoup`)
- [ ] Server not starting in Tauri: Check server path in `src-tauri/src/main.rs`
- [ ] Desktop app crashes: Check Tauri logs and ensure server binary is bundled correctly
