# dev-see Project Setup Tasks

## Prerequisites

- [ ] Install Node.js v20+ or v22 LTS (nvm or Homebrew)
  - *Requires user interaction: Choose installation method*
- [ ] Verify Node.js installation: `node --version` (should be v20+)
- [ ] Verify npm installation: `npm --version` (should be v9+)
- [ ] Install Rust via rustup
- [ ] Verify Rust installation: `rustc --version` (should be 1.70+)
- [ ] Verify Cargo installation: `cargo --version` (should be 1.70+)
- [ ] Install macOS dependencies: `brew install libsoup`

## Repository Structure & Root Setup

- [ ] Create root-level `package.json` with workspace configuration
- [ ] Create directory structure:
  - `packages/server`
  - `packages/ui`
  - `packages/tauri`
  - `docs/plans/setup-project`
- [ ] Create root `.gitignore` with appropriate entries
- [ ] Create root `tsconfig.json` (or verify it exists)
- [ ] Create root `README.md` with project overview
- [ ] Create `CONTRIBUTING.md` with contribution guidelines

## Fastify Server Setup (`packages/server`)

- [ ] Initialize package: `npm init -y`
- [ ] Install core dependencies: `fastify`, `@fastify/cors`, `@fastify/websocket`
- [ ] Install dev dependencies: `typescript`, `ts-node`, `@types/node`, `vitest`, `@vitest/ui`, `prettier`, `eslint`
- [ ] Create `tsconfig.json` with TypeScript configuration
- [ ] Add npm scripts to `package.json`: `dev`, `build`, `start`, `test`, `lint`
- [ ] Create `src/` directory structure
- [ ] Create `src/server.ts` entry point
- [ ] Create `src/routes.ts` for HTTP endpoints
- [ ] Create `src/websocket.ts` for WebSocket handlers
- [ ] Create `src/models.ts` for TypeScript types
- [ ] Create `src/utils/ring-buffer.ts` utility
- [ ] Create `src/utils/validation.ts` utility
- [ ] Create `tests/` directory for test files
- [ ] Create `README.md` documenting server setup and API
- [ ] Create `.env.local` with development variables (PORT, MAX_LOGS, LOG_LEVEL, CORS_ENABLED)
  - *Requires user interaction: Configure port and max logs if different from defaults*

## Svelte UI Setup (`packages/ui`)

- [ ] Initialize with Vite + Svelte: `npm create vite@latest . -- --template svelte-ts`
- [ ] Install dependencies: `npm install`
- [ ] Install dev dependencies: `tailwindcss`, `postcss`, `autoprefixer`, `vitest`, `@testing-library/svelte`
- [ ] Configure Tailwind: `npx tailwindcss init -p`
- [ ] Create/update npm scripts in `package.json`
- [ ] Create `src/components/LogList.svelte` component
- [ ] Create `src/components/LogDetail.svelte` component
- [ ] Create `src/components/Search.svelte` component
- [ ] Create `src/components/Controls.svelte` component
- [ ] Create `src/stores/logs.ts` Svelte store
- [ ] Create `src/lib/websocket.ts` WebSocket client
- [ ] Create/update `src/styles/global.css`
- [ ] Create `tests/` directory for test files
- [ ] Create `README.md` documenting UI setup
- [ ] Create `.env.local` with development variables (VITE_SERVER_URL, VITE_WS_URL)
  - *Requires user interaction: Update URLs if server port changes*

## Tauri Desktop App Setup (`packages/tauri`)

- [ ] Initialize Tauri app: `npm create tauri-app@latest --branch try-new-cli -- --manager npm --ui svelte --typescript`
- [ ] Install dependencies: `npm install`
- [ ] Install dev dependencies: `@tauri-apps/cli`, `@tauri-apps/api`
- [ ] Update `src-tauri/tauri.conf.json`:
  - Set `beforeBuildCommand` to `npm run build`
  - Set `beforeDevCommand` to `npm run dev`
  - Set `devPath` to `http://localhost:5173`
  - Set `frontendDist` to `../ui/dist`
  - Configure app window (title: "dev-see", width: 1200, height: 800)
- [ ] Update `src-tauri/src/main.rs` to spawn Fastify server
  - *Requires user interaction: Review Rust code implementation*
- [ ] Create `src/lib.ts` for Tauri JavaScript bindings
- [ ] Create `README.md` documenting Tauri setup
- [ ] Verify Tauri can access UI and server

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

## Development Workflow

- [ ] Run `npm install` from project root to install all workspace dependencies
- [ ] Test server startup: `npm run dev -w packages/server`
- [ ] Test UI startup: `npm run dev -w packages/ui`
- [ ] Test Tauri dev: `npm run tauri dev -w packages/tauri`
- [ ] Verify root `npm run dev` command runs all packages
- [ ] Set up terminal workflow for running 3 concurrent processes (server, UI, Tauri)
  - *Requires user interaction: Decide on tool (tmux, iTerm, separate terminals, etc.)*

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

- [ ] Clone repository (or verify existing clone)
- [ ] Run `npm install` from project root
- [ ] Run `npm run dev -w packages/server` and verify server starts
- [ ] Run `npm run dev -w packages/ui` and verify UI builds
- [ ] Run `npm run tauri dev -w packages/tauri` and verify app launches
- [ ] Test server endpoint with cURL or Postman
- [ ] Test WebSocket connection with wscat
- [ ] Read through all design documents
- [ ] Verify linting and tests run successfully

## Post-Setup Next Steps

- [ ] Implement initial server endpoints (see log-server-design.md)
- [ ] Implement initial UI components (see log-viewer-design.md)
- [ ] Integrate Tauri server spawning
- [ ] Write unit and integration tests
- [ ] Set up CI/CD pipeline (Phase 2)
- [ ] Create expanded developer documentation

## Troubleshooting Reference

- [ ] Document port 9090 conflict resolution: `lsof -i :9090 | grep LISTEN | awk '{print $2}' | xargs kill -9`
- [ ] Document Rust compilation fix: `rustup update` and `cargo clean`
- [ ] Document WebSocket debugging: Verify server running and WS URL correct
- [ ] Document Tauri build issues: Check dependencies and Tauri docs
- [ ] Document module not found fix: `npm install` in affected package
