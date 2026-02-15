# dev-see UI

The web-based user interface for dev-see, built with Svelte and Vite.

## Tech Stack

- **Framework**: [Svelte 5](https://svelte.dev/) - Reactive UI framework
- **Build Tool**: [Vite](https://vite.dev/) - Fast development server and bundler
- **Language**: TypeScript - Type-safe JavaScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **Testing**: [Vitest](https://vitest.dev/) - Fast unit testing

## Getting Started

### Prerequisites

- Node.js 20+ (v22 recommended)
- pnpm 8+

### Installation

From the project root:

```bash
pnpm install
```

### Development

Start the development server:

```bash
# From project root
pnpm dev:ui

# Or from this directory
pnpm dev
```

The UI will be available at [http://localhost:5173](http://localhost:5173)

**Hot Module Replacement (HMR)**: Changes to `.svelte`, `.ts`, or `.css` files will automatically update in the browser without a full page reload!

### Building for Production

Build the UI for production:

```bash
pnpm build
```

Output files will be in `dist/` directory. These files are served by the Fastify server.

Preview the production build locally:

```bash
pnpm preview
```

## Project Structure

```
apps/ui/
├── src/
│   ├── App.svelte          # Root Svelte component
│   ├── main.ts              # Application entry point
│   ├── style.css            # Global styles + Tailwind
│   ├── components/          # Svelte components (to be added)
│   ├── stores/              # Svelte stores for state (to be added)
│   └── lib/                 # Utilities and helpers (to be added)
├── tests/                   # Test files
├── public/                  # Static assets
├── index.html               # HTML entry point
├── vite.config.ts           # Vite configuration
├── svelte.config.js         # Svelte configuration
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Package dependencies and scripts
```

## Environment Variables

Create a `.env.local` file (already done):

```bash
VITE_SERVER_URL=http://localhost:9090
VITE_WS_URL=ws://localhost:9090/ws
```

Access in code:

```typescript
const serverUrl = import.meta.env.VITE_SERVER_URL;
```

## Testing

Run tests in watch mode:

```bash
pnpm test
```

Run tests with UI:

```bash
pnpm test:ui
```

Open [http://localhost:51204/__vitest__/](http://localhost:51204/__vitest__/) to see the test UI.

## How Svelte Works

### Three Sections in Every Component

1. **`<script>`** - Logic (JavaScript/TypeScript)
2. **`<template>`** - HTML markup
3. **`<style>`** - Scoped CSS

### Reactivity

Variables are automatically reactive:

```svelte
<script>
  let count = 0;  // Reactive variable

  function increment() {
    count += 1;  // UI updates automatically!
  }
</script>

<button on:click={increment}>
  Count: {count}
</button>
```

### Props

Pass data to components:

```svelte
<script>
  let { message } = $props();  // Svelte 5 syntax
</script>

<p>{message}</p>
```

## How Vite Works

### Development Server

- **Instant server start**: No bundling needed during development
- **Lightning-fast HMR**: Updates in milliseconds
- **ES modules**: Uses browser-native module support

### Production Build

- **Tree-shaking**: Removes unused code
- **Code splitting**: Splits code into smaller chunks
- **Minification**: Compresses JavaScript and CSS

## How Tailwind Works

Instead of writing CSS:

```css
.button {
  background-color: blue;
  color: white;
  padding: 1rem;
  border-radius: 0.5rem;
}
```

You use utility classes:

```html
<button class="bg-blue-500 text-white p-4 rounded-lg">
  Click me
</button>
```

**Benefits**:
- No naming conflicts
- Consistent design system
- Smaller CSS bundles (only includes used classes)

## Next Steps

Once this basic setup is verified, we'll implement:

1. **LogList Component** - Display list of API logs
2. **LogDetail Component** - Show request/response details
3. **Search Component** - Filter and search logs
4. **WebSocket Client** - Real-time log streaming
5. **Svelte Stores** - State management

## Troubleshooting

### Port 5173 already in use

```bash
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Module not found

```bash
pnpm install
```

### TypeScript errors

```bash
# Clear cache and reinstall
rm -rf node_modules .svelte-kit
pnpm install
```

## Learn More

- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Vite Guide](https://vite.dev/guide/)
- [Tailwind Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
