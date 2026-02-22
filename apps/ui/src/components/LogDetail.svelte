<script lang="ts">
  /**
   * LogDetail Component - Displays detailed information for a selected log
   *
   * Shows comprehensive request/response data:
   * - Request/Response headers
   * - Request/Response body (formatted JSON)
   * - Timing information
   * - Full URL
   *
   * If no log is selected, shows a placeholder message
   */

  import { logsStore } from '../stores/logs.svelte.js';

  /**
   * Formats JSON for display with proper indentation
   */
  function formatJSON(data: unknown): string {
    if (!data) return '';
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          return JSON.stringify(JSON.parse(trimmed), null, 2);
        } catch {
          return data;
        }
      }
      return data;
    }
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  /**
   * Formats headers as key: value pairs
   */
  function formatHeaders(headers: Record<string, string> | undefined): string {
    if (!headers || Object.keys(headers).length === 0) {
      return 'No headers';
    }
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  /**
   * Copy text to clipboard
   */
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
      console.log('Copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }
</script>

<div class="log-detail">
  {#if !logsStore.selectedLog}
    <div class="empty-state">
      <p>No log selected</p>
      <small>Select a log from the list to view details</small>
    </div>
  {:else}
    {@const log = logsStore.selectedLog}

    <div class="log-detail-header">
      <div class="header-main">
        <span class="method">{log.method}</span>
        <span class="status">{log.statusCode}</span>
      </div>
      <div class="header-meta">
        <span>Duration: {log.duration}ms</span>
        <span>Time: {new Date(log.timestamp).toLocaleString()}</span>
      </div>
    </div>

    <div class="log-detail-content">
      <!-- URL Section -->
      <section class="detail-section">
        <div class="section-header">
          <h3>URL</h3>
          <button
            class="copy-button"
            onclick={() => copyToClipboard(log.url)}
            title="Copy URL"
          >
            📋 Copy
          </button>
        </div>
        <pre class="code-block url-block">{log.url}</pre>
      </section>

      <!-- Request Headers -->
      <section class="detail-section">
        <div class="section-header">
          <h3>Request Headers</h3>
          <button
            class="copy-button"
            onclick={() => copyToClipboard(formatHeaders(log.requestHeaders))}
            title="Copy headers"
          >
            📋 Copy
          </button>
        </div>
        <pre class="code-block">{formatHeaders(log.requestHeaders)}</pre>
      </section>

      <!-- Request Body -->
      {#if log.requestBody}
        <section class="detail-section">
          <div class="section-header">
            <h3>Request Body</h3>
            <button
              class="copy-button"
              onclick={() => copyToClipboard(formatJSON(log.requestBody))}
              title="Copy request body"
            >
              📋 Copy
            </button>
          </div>
          <pre class="code-block json-block">{formatJSON(log.requestBody)}</pre>
        </section>
      {/if}

      <!-- Response Headers -->
      <section class="detail-section">
        <div class="section-header">
          <h3>Response Headers</h3>
          <button
            class="copy-button"
            onclick={() => copyToClipboard(formatHeaders(log.responseHeaders))}
            title="Copy headers"
          >
            📋 Copy
          </button>
        </div>
        <pre class="code-block">{formatHeaders(log.responseHeaders)}</pre>
      </section>

      <!-- Response Body -->
      {#if log.responseBody}
        <section class="detail-section">
          <div class="section-header">
            <h3>Response Body</h3>
            <button
              class="copy-button"
              onclick={() => copyToClipboard(formatJSON(log.responseBody))}
              title="Copy response body"
            >
              📋 Copy
            </button>
          </div>
          <pre class="code-block json-block">{formatJSON(log.responseBody)}</pre>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .log-detail {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary, #fff);
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary, #666);
    padding: 2rem;
    text-align: center;
  }

  .empty-state p {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  .empty-state small {
    opacity: 0.7;
  }

  .log-detail-header {
    padding: 1rem 1.5rem;
    border-bottom: 2px solid var(--border-color, #ddd);
    background: var(--bg-secondary, #f5f5f5);
  }

  .header-main {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.5rem;
  }

  .method {
    padding: 0.4rem 0.8rem;
    border-radius: 0.25rem;
    font-weight: 700;
    font-size: 1rem;
    text-transform: uppercase;
    background: #2196f3;
    color: white;
    font-family: 'Courier New', monospace;
  }

  .status {
    padding: 0.4rem 0.8rem;
    border-radius: 0.25rem;
    font-weight: 700;
    font-size: 1rem;
    background: #4caf50;
    color: white;
    font-family: 'Courier New', monospace;
  }

  .header-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.9rem;
    color: var(--text-secondary, #666);
  }

  .log-detail-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .detail-section {
    margin-bottom: 2rem;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .section-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .copy-button {
    padding: 0.4rem 0.8rem;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
  }

  .copy-button:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .code-block {
    background: var(--code-bg, #f5f5f5);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.375rem;
    padding: 1rem;
    margin: 0;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    color: var(--text-primary, #333);
  }

  .url-block {
    word-break: break-all;
  }

  .json-block {
    color: #0066cc;
  }

  /* Scrollbar styling */
  .log-detail-content::-webkit-scrollbar {
    width: 8px;
  }

  .log-detail-content::-webkit-scrollbar-track {
    background: var(--bg-secondary, #f5f5f5);
  }

  .log-detail-content::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb, #ccc);
    border-radius: 4px;
  }

  .log-detail-content::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover, #999);
  }
</style>
