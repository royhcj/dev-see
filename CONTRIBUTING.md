# Contributing to dev-see

Thank you for your interest in contributing to dev-see! This document provides guidelines and instructions for contributing to the project.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** v20+ or v22 LTS
- **pnpm** v8+ (install with `npm install -g pnpm`)

### Setting Up Your Development Environment

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/dev-see.git
   cd dev-see
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Verify the setup**
   ```bash
   # Start the development servers
   pnpm dev

   # In another terminal, test the API
   curl -X POST http://localhost:9090/api/logs \
     -H "Content-Type: application/json" \
     -d '{"method":"GET","url":"https://api.example.com/test","statusCode":200}'
   ```

## Development Workflow

### Project Structure

dev-see is a monorepo with the following structure:
- `apps/ui/` - Svelte frontend (web application)
- `packages/server/` - Fastify backend server
- `docs/` - Project documentation

### Running the Application

**Development mode** (recommended):
```bash
# Run both server and UI with hot reload
pnpm dev

# Or run separately:
pnpm dev:server  # Terminal 1
pnpm dev:ui      # Terminal 2
```

**Production-like mode**:
```bash
pnpm build:ui       # Build UI first
pnpm dev:server     # Start server (serves built UI)
```

### Making Changes

1. **Create a new branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**
   - Follow the code style guidelines (see below)
   - Write tests for new features
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run linting
   pnpm lint

   # Run tests
   pnpm test

   # Build to ensure everything compiles
   pnpm build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   # or
   git commit -m "fix: resolve bug in log parsing"
   ```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - All TypeScript must pass strict type checking
- **Use explicit types** for function parameters and return values
- **Avoid `any`** - Use proper types or `unknown` if necessary
- **Use async/await** instead of raw promises where possible

### Formatting

We use **Prettier** for code formatting:
```bash
# Formatting is enforced by ESLint
pnpm lint
```

Configuration (`.prettierrc`):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5"
}
```

### Naming Conventions

- **Files**: kebab-case (e.g., `log-list.svelte`, `ring-buffer.ts`)
- **Components**: PascalCase (e.g., `LogList.svelte`, `LogDetail.svelte`)
- **Functions/variables**: camelCase (e.g., `getLogById`, `isConnected`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_LOGS`, `DEFAULT_PORT`)
- **Types/Interfaces**: PascalCase (e.g., `LogEntry`, `ServerConfig`)

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add search functionality to log viewer
fix: resolve WebSocket reconnection issue
docs: update API documentation
refactor: simplify ring buffer implementation
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter server test
pnpm --filter ui test

# Run tests in watch mode
pnpm --filter server test -- --watch
```

### Writing Tests

- Place tests in `tests/` directories or alongside code as `*.test.ts`
- Use **Vitest** as the test framework
- Aim for **>80% coverage** for critical paths
- Write both unit tests and integration tests

Example test structure:
```typescript
import { describe, it, expect } from 'vitest';

describe('RingBuffer', () => {
  it('should add items up to max capacity', () => {
    const buffer = new RingBuffer(3);
    buffer.add('item1');
    buffer.add('item2');
    buffer.add('item3');
    expect(buffer.size()).toBe(3);
  });
});
```

## Pull Request Process

1. **Ensure your code follows all guidelines**
   - Code is properly formatted
   - All tests pass
   - No linting errors
   - Documentation is updated

2. **Create a pull request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots for UI changes

3. **PR Review**
   - Address any feedback from reviewers
   - Keep your PR up to date with the main branch

4. **Merging**
   - PRs will be merged by maintainers after approval
   - Ensure CI/CD checks pass before merging

## Architecture Guidelines

### Server (`packages/server`)

- **Framework**: Fastify
- **Storage**: In-memory ring buffer (no database in Phase 1)
- **API Routes**: RESTful endpoints under `/api/`
- **WebSocket**: Real-time log streaming at `/ws`
- **Static serving**: Serves built UI from `apps/ui/dist`

### UI (`apps/ui`)

- **Framework**: Svelte + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **State**: Svelte stores
- **WebSocket**: Client connects to server's `/ws` endpoint

### File Organization

**Server**:
```
packages/server/src/
├── index.ts           # Entry point
├── routes/            # API route handlers
├── storage/           # Data storage logic
├── models.ts          # TypeScript types
└── utils/             # Utility functions
```

**UI**:
```
apps/ui/src/
├── App.svelte         # Root component
├── main.ts            # Vite entry point
├── components/        # Svelte components
├── stores/            # Svelte stores
├── lib/               # Utilities and helpers
└── styles/            # Global styles
```

## Need Help?

- Check the [documentation](docs/)
- Review the [setup plan](docs/plans/setup-project/setup-project-plan.md)
- Look at existing code for examples

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
