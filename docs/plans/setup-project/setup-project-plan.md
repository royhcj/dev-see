# dev-see Project Setup Plan

> Last updated: 2026-02-12

## Overview

This document outlines the complete setup and initialization plan for the **dev-see** project—a desktop API log viewer for macOS built with Tauri, Svelte, and Fastify.

**Phase 1 Target**: Minimal viable product for local development and testing on macOS.

---

## 1. Prerequisites

### System Requirements
- **macOS**: 12+ (Intel & Apple Silicon supported)
- **Node.js**: 20+ LTS (v20, v22 recommended; v18 is deprecated)
- **Rust**: Latest stable (for Tauri compilation)
- **npm** or **yarn**: For dependency management

### Setup Steps

1. **Install Node.js**
   ```bash
   # Using nvm (recommended for version management)
   nvm install 22  # or 20 for LTS stability
   nvm use 22

   # Or using Homebrew
   brew install node

   # Verify installation
   node --version
   npm --version
   ```

2. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source "$HOME/.cargo/env"

   # Verify installation
   rustc --version
   cargo --version
   ```

3. **Install Tauri Prerequisites**
   ```bash
   # macOS specific dependencies
   brew install libsoup
   ```

### Verify Environment
```bash
node --version      # Should be v20+ (v22.21.1 confirmed working)
npm --version       # Should be 9+
rustc --version     # Should be 1.70+
cargo --version     # Should be 1.70+
```

---

## 2. Repository Structure

### Proposed Layout

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
├── packages/
│   ├── server/                  # Fastify backend
│   │   ├── src/
│   │   │   ├── server.ts        # Entry point
│   │   │   ├── routes.ts        # HTTP endpoints
│   │   │   ├── websocket.ts     # WebSocket handlers
│   │   │   ├── models.ts        # TypeScript types
│   │   │   └── utils/
│   │   │       ├── ring-buffer.ts
│   │   │       └── validation.ts
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── ui/                      # Svelte frontend
│   │   ├── src/
│   │   │   ├── app.svelte       # Root component
│   │   │   ├── App.svelte
│   │   │   ├── components/
│   │   │   │   ├── LogList.svelte
│   │   │   │   ├── LogDetail.svelte
│   │   │   │   ├── Search.svelte
│   │   │   │   └── Controls.svelte
│   │   │   ├── stores/
│   │   │   │   └── logs.ts      # Svelte store for logs
│   │   │   ├── lib/
│   │   │   │   └── websocket.ts # WS client
│   │   │   └── styles/
│   │   │       └── global.css
│   │   ├── tests/
│   │   ├── package.json
│   │   ├── svelte.config.js
│   │   ├── vite.config.ts
│   │   └── README.md
│   │
│   └── tauri/                   # Tauri desktop wrapper
│       ├── src-tauri/
│       │   ├── src/
│       │   │   └── main.rs      # Tauri entry point
│       │   ├── tauri.conf.json  # Tauri configuration
│       │   └── Cargo.toml
│       ├── src/
│       │   └── lib.ts           # Tauri JavaScript bindings
│       ├── package.json
│       └── README.md
│
├── .github/
│   └── workflows/               # CI/CD workflows (future)
│
├── .gitignore
├── package.json                 # Root workspace
├── package-lock.json
├── tsconfig.json                # Root TypeScript config
├── README.md                    # Project root readme
└── CONTRIBUTING.md              # Contribution guidelines
```

---

## 3. Workspace Setup

### Initialize Root Workspace

1. **Create package.json** (root)
   ```json
   {
     "name": "dev-see",
     "version": "0.1.0",
     "description": "API log viewer for macOS",
     "private": true,
     "workspaces": [
       "packages/server",
       "packages/ui",
       "packages/tauri"
     ],
     "scripts": {
       "install-all": "npm install",
       "dev": "npm run dev --workspaces",
       "build": "npm run build --workspaces",
       "test": "npm run test --workspaces",
       "lint": "npm run lint --workspaces"
     }
   }
   ```

2. **Create directory structure**
   ```bash
   mkdir -p packages/{server,ui,tauri}
   mkdir -p docs/plans/setup-project
   mkdir -p .github/workflows
   ```

3. **Root .gitignore**
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
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   npm install fastify @fastify/cors @fastify/websocket
   npm install --save-dev typescript ts-node @types/node
   npm install --save-dev vitest @vitest/ui
   npm install --save-dev prettier eslint
   ```

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
     "scripts": {
       "dev": "ts-node src/server.ts",
       "build": "tsc",
       "start": "node dist/server.js",
       "test": "vitest",
       "lint": "eslint src --ext .ts"
     }
   }
   ```

### 4.2 Svelte UI (`packages/ui`)

1. **Initialize with Vite + Svelte**
   ```bash
   cd packages/ui
   npm create vite@latest . -- --template svelte-ts
   ```

2. **Install dependencies**
   ```bash
   npm install
   npm install --save-dev tailwindcss postcss autoprefixer
   npm install --save-dev vitest @testing-library/svelte
   ```

3. **Configure Tailwind (optional, but recommended)**
   ```bash
   npx tailwindcss init -p
   ```

4. **Add npm scripts**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "test": "vitest",
       "lint": "eslint src --ext .svelte,.ts"
     }
   }
   ```

### 4.3 Tauri Desktop Wrapper (`packages/tauri`)

1. **Initialize Tauri**
   ```bash
   cd packages/tauri
   npm create tauri-app@latest --branch try-new-cli -- --manager npm --ui svelte --typescript
   ```

2. **Post-initialization setup**
   ```bash
   npm install
   npm install --save-dev @tauri-apps/cli @tauri-apps/api
   ```

3. **Update Tauri configuration**
   - Edit `src-tauri/tauri.conf.json`:
     ```json
     {
       "build": {
         "beforeBuildCommand": "npm run build",
         "beforeDevCommand": "npm run dev",
         "devPath": "http://localhost:5173",
         "frontendDist": "../ui/dist"
       },
       "app": {
         "windows": [
           {
             "title": "dev-see",
             "width": 1200,
             "height": 800,
             "resizable": true,
             "fullscreen": false
           }
         ]
       }
     }
     ```

4. **Configure server launcher in Rust**
   - Update `src-tauri/src/main.rs` to spawn the Fastify server

---

## 5. Development Workflow Setup

### 5.1 Local Development

1. **Install all dependencies**
   ```bash
   npm install
   ```

2. **Start Fastify server** (Terminal 1)
   ```bash
   npm run dev -w packages/server
   ```

3. **Start Svelte dev server** (Terminal 2)
   ```bash
   npm run dev -w packages/ui
   ```

4. **Start Tauri dev** (Terminal 3)
   ```bash
   npm run tauri dev -w packages/tauri
   ```

   Or use a combined command:
   ```bash
   npm run dev
   ```

### 5.2 Testing Workflow

```bash
# Test server
npm run test -w packages/server

# Test UI
npm run test -w packages/ui

# Test all
npm run test
```

### 5.3 Build Process

```bash
# Build server
npm run build -w packages/server

# Build UI
npm run build -w packages/ui

# Build Tauri app
npm run tauri build -w packages/tauri

# Full build
npm run build
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

## 8. Environment Configuration

### Development Environment Variables

Create `.env.local` in each package root:

**`packages/server/.env.local`**:
```
PORT=9090
MAX_LOGS=1000
LOG_LEVEL=debug
CORS_ENABLED=true
```

**`packages/ui/.env.local`**:
```
VITE_SERVER_URL=http://localhost:9090
VITE_WS_URL=ws://localhost:9090/ws
```

### Build Environment Variables

Different settings for production (handled by build tools).

---

## 9. Documentation

### README Files

Each package should have a README with:
- Purpose and responsibility
- How to run in development
- Build and deployment instructions
- API documentation (for server)

### API Documentation

- **Server API**: Detailed in [log-server-design.md](../../log-server-design.md)
- **WebSocket Protocol**: Documented in server design
- **UI Components**: Inline JSDoc comments in Svelte files

### CONTRIBUTING.md

- Setup instructions for contributors
- Code style guidelines
- How to submit PRs
- Testing requirements

---

## 10. Tooling & IDE Setup

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "svelte.svelte-vscode",
    "rust-lang.rust-analyzer",
    "biomejs.biome"
  ]
}
```

### VS Code Settings (`.vscode/settings.json`)

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[svelte]": {
    "editor.defaultFormatter": "svelte.svelte-vscode"
  },
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
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

---

## 11. CI/CD Pipeline (Phase 2)

### GitHub Actions Workflow

Future workflows to implement:
- **Lint & Test**: Run on every PR
- **Build Check**: Verify builds succeed
- **Release**: Create macOS .dmg on tagged commits

See `.github/workflows/` directory for details.

---

## 12. First-Time Setup Checklist

- [ ] Clone repository
- [ ] Install Node.js 20+ (v22 is fully compatible and recommended)
- [ ] Install Rust
- [ ] Install macOS dependencies (`libsoup`)
- [ ] Run `npm install` from project root
- [ ] Run `npm run dev -w packages/server` to verify server starts
- [ ] Run `npm run dev -w packages/ui` to verify UI builds
- [ ] Run `npm run tauri dev -w packages/tauri` to verify Tauri app launches
- [ ] Test server endpoint with cURL
- [ ] Test WebSocket with wscat
- [ ] Read through design documents

---

## 13. Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Port 9090 already in use** | Kill the process: `lsof -i :9090 \| grep LISTEN \| awk '{print $2}' \| xargs kill -9` |
| **Rust compilation errors** | Run `rustup update` and `cargo clean` |
| **WebSocket connection fails** | Verify server is running on localhost:9090 and WS URL is correct |
| **Tauri build fails** | Check Tauri documentation and ensure all native dependencies are installed |
| **Module not found errors** | Run `npm install` in the affected package directory |

---

## 14. Next Steps After Setup

1. **Create initial server implementation** (see log-server-design.md)
2. **Create initial UI components** (see log-viewer-design.md)
3. **Integrate Tauri with server spawning**
4. **Write unit and integration tests**
5. **Set up CI/CD pipeline**
6. **Create developer documentation**

---

## References

- [Node.js Documentation](https://nodejs.org/docs/)
- [Fastify Documentation](https://fastify.dev/)
- [Svelte Documentation](https://svelte.dev/)
- [Tauri Documentation](https://tauri.app/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
