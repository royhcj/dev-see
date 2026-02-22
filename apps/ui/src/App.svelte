<script lang="ts">
  /**
   * App.svelte - Main Application Component
   *
   * This is the root component that brings together all the pieces:
   * - LogList: Displays all API logs
   * - LogDetail: Shows detailed info for selected log
   * - Search: Filters logs by URL/method
   * - Controls: Manages filters and actions
   * - WebSocket: Real-time log streaming
   *
   * Layout:
   * - Top: Header with app title
   * - Left: Controls, Search, and LogList
   * - Right: LogDetail panel
   */

  import { onMount } from 'svelte';
  import TopTabs, { type TopTab } from './components/TopTabs.svelte';
  import LogList from './components/LogList.svelte';
  import LogDetail from './components/LogDetail.svelte';
  import Search from './components/Search.svelte';
  import Controls from './components/Controls.svelte';
  import SpecViewer from './components/spec/SpecViewer.svelte';
  import ConnectAppModal from './components/connection/ConnectAppModal.svelte';
  import { ensureDesktopSidecar } from './lib/desktop/sidecar';
  import { initWebSocket } from './lib/websocket.svelte.js';
  import { config, logConfig } from './lib/config';

  let activeTab: TopTab = 'logs';
  let isConnectModalOpen = false;

  function handleTabChange(event: CustomEvent<TopTab>) {
    activeTab = event.detail;
  }

  function openConnectModal() {
    isConnectModalOpen = true;
  }

  function closeConnectModal() {
    isConnectModalOpen = false;
  }

  /**
   * Initialize WebSocket connection when component mounts
   * The returned cleanup function disconnects when component unmounts
   */
  onMount(() => {
    let cleanup = () => {};
    let disposed = false;

    // Log configuration for debugging
    logConfig();

    (async () => {
      try {
        await ensureDesktopSidecar();
      } catch (error) {
        console.error('Failed to start desktop sidecar:', error);
      }

      if (!disposed) {
        cleanup = initWebSocket();
      }
    })();

    // Return cleanup function to Svelte
    // This runs when the component is destroyed
    return () => {
      disposed = true;
      cleanup();
    };
  });
</script>

<div class="app">
  <!-- Header -->
  <header class="app-header">
    <h1>🔍 dev-see</h1>
    <TopTabs activeTab={activeTab} variant="header" on:change={handleTabChange} />
    <div class="header-actions">
      <button type="button" class="connect-button" on:click={openConnectModal}>Connect App</button>
      {#if config.isTauriApp}
        <span class="badge">Desktop App</span>
      {:else if config.isDevelopment}
        <span class="badge dev">Development</span>
      {/if}
    </div>
  </header>

  {#if activeTab === 'logs'}
    <!-- Main Content -->
    <main class="app-main">
      <!-- Left Panel: Log List -->
      <aside class="left-panel">
        <Controls />
        <Search />
        <LogList />
      </aside>

      <!-- Right Panel: Log Detail -->
      <section class="right-panel">
        <LogDetail />
      </section>
    </main>
  {:else}
    <main class="spec-main">
      <SpecViewer />
    </main>
  {/if}
</div>

<ConnectAppModal open={isConnectModalOpen} on:close={closeConnectModal} />

<style>
  /**
   * Global Layout Styles
   *
   * Why this layout?
   * - CSS Grid provides a clean 2-column layout
   * - Header stays fixed at top
   * - Main area is scrollable
   * - Responsive to different screen sizes
   */

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--bg-primary, #fff);
  }

  /* Header */
  .app-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .app-header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .header-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .connect-button {
    border: 1px solid rgba(255, 255, 255, 0.45);
    color: #fff;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 0.55rem;
    padding: 0.45rem 0.85rem;
    font-size: 0.86rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  .connect-button:hover {
    background: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.65);
  }

  .badge {
    padding: 0.25rem 0.75rem;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge.dev {
    background: rgba(255, 165, 0, 0.3);
  }

  /* Main Content Area */
  .app-main {
    display: grid;
    grid-template-columns: 400px 1fr;
    flex: 1;
    overflow: hidden;
  }

  .left-panel {
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary, #f5f5f5);
    border-right: 1px solid var(--border-color, #ddd);
    overflow: hidden;
  }

  .right-panel {
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #fff);
    overflow: hidden;
  }

  .spec-main {
    display: flex;
    flex: 1;
    overflow: hidden;
    background: var(--bg-primary, #fff);
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .app-main {
      grid-template-columns: 350px 1fr;
    }
  }

  @media (max-width: 768px) {
    .app-main {
      grid-template-columns: 1fr;
    }

    .right-panel {
      display: none; /* Hide detail panel on mobile */
    }
  }

  /**
   * CSS Custom Properties (Variables)
   * These can be overridden for theming
   */
  :global(:root) {
    --primary-color: #2196f3;
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --bg-hover: #f0f0f0;
    --bg-selected: #e3f2fd;
    --text-primary: #333333;
    --text-secondary: #666666;
    --border-color: #dddddd;
    --code-bg: #f5f5f5;
    --scrollbar-thumb: #cccccc;
    --scrollbar-thumb-hover: #999999;
    --status-connected: #4caf50;
    --status-connecting: #ff9800;
    --status-error: #f44336;
  }

  /**
   * Global Resets
   */
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
</style>
