<script lang="ts">
  /**
   * LogList Component - Displays API logs in a scrollable list
   *
   * This component shows all API logs with key information:
   * - HTTP method (GET, POST, etc.)
   * - Request URL
   * - Status code (with color coding)
   * - Duration in milliseconds
   *
   * Clicking a log selects it for detailed view in LogDetail component
   */

  import { logsStore } from '../stores/logs';

  /**
   * Returns a color class based on HTTP status code
   * - 2xx: Green (success)
   * - 3xx: Blue (redirect)
   * - 4xx: Orange (client error)
   * - 5xx: Red (server error)
   */
  function getStatusClass(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return 'status-success';
    if (statusCode >= 300 && statusCode < 400) return 'status-redirect';
    if (statusCode >= 400 && statusCode < 500) return 'status-client-error';
    if (statusCode >= 500) return 'status-server-error';
    return '';
  }

  /**
   * Returns a color class for HTTP method
   * Different methods get different colors for visual distinction
   */
  function getMethodClass(method: string): string {
    const methodUpper = method.toUpperCase();
    switch (methodUpper) {
      case 'GET':
        return 'method-get';
      case 'POST':
        return 'method-post';
      case 'PUT':
      case 'PATCH':
        return 'method-put';
      case 'DELETE':
        return 'method-delete';
      default:
        return 'method-other';
    }
  }

  /**
   * Formats timestamp to readable time
   */
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  /**
   * Handles log selection
   */
  function selectLog(logId: string) {
    logsStore.selectLog(logId);
  }
</script>

<div class="log-list">
  <div class="log-list-header">
    <h2>API Logs ({logsStore.filteredLogs.length})</h2>
  </div>

  <div class="log-list-content">
    {#if logsStore.filteredLogs.length === 0}
      <div class="empty-state">
        <p>No logs yet</p>
        <small>Send API requests to see them here</small>
      </div>
    {:else}
      {#each logsStore.filteredLogs as log (log.id)}
        <button
          class="log-item"
          class:selected={logsStore.selectedLogId === log.id}
          onclick={() => selectLog(log.id)}
        >
          <div class="log-item-header">
            <span class="method {getMethodClass(log.method)}">
              {log.method}
            </span>
            <span class="status {getStatusClass(log.statusCode)}">
              {log.statusCode}
            </span>
            <span class="duration">{log.duration}ms</span>
            <span class="time">{formatTime(log.timestamp)}</span>
          </div>
          <div class="log-item-url">
            {log.url}
          </div>
        </button>
      {/each}
    {/if}
  </div>
</div>

<style>
  .log-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-secondary, #f5f5f5);
    border-right: 1px solid var(--border-color, #ddd);
  }

  .log-list-header {
    padding: 1rem;
    border-bottom: 1px solid var(--border-color, #ddd);
    background: var(--bg-primary, #fff);
  }

  .log-list-header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .log-list-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
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

  .log-item {
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    border-bottom: 1px solid var(--border-color, #ddd);
    background: var(--bg-primary, #fff);
    cursor: pointer;
    transition: all 0.15s ease;
    text-align: left;
    font-family: inherit;
  }

  .log-item:hover {
    background: var(--bg-hover, #f9f9f9);
  }

  .log-item.selected {
    background: var(--bg-selected, #e3f2fd);
    border-left: 3px solid var(--primary-color, #2196f3);
  }

  .log-item-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
  }

  .method {
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    font-family: 'Courier New', monospace;
  }

  .method-get {
    background: #4caf50;
    color: white;
  }

  .method-post {
    background: #2196f3;
    color: white;
  }

  .method-put {
    background: #ff9800;
    color: white;
  }

  .method-delete {
    background: #f44336;
    color: white;
  }

  .method-other {
    background: #9e9e9e;
    color: white;
  }

  .status {
    padding: 0.2rem 0.5rem;
    border-radius: 0.25rem;
    font-weight: 600;
    font-size: 0.75rem;
    font-family: 'Courier New', monospace;
  }

  .status-success {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .status-redirect {
    background: #e3f2fd;
    color: #1565c0;
  }

  .status-client-error {
    background: #fff3e0;
    color: #e65100;
  }

  .status-server-error {
    background: #ffebee;
    color: #c62828;
  }

  .duration {
    color: var(--text-secondary, #666);
    font-size: 0.85rem;
  }

  .time {
    margin-left: auto;
    color: var(--text-secondary, #666);
    font-size: 0.85rem;
  }

  .log-item-url {
    font-size: 0.9rem;
    color: var(--text-primary, #333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: 'Courier New', monospace;
  }

  /* Scrollbar styling */
  .log-list-content::-webkit-scrollbar {
    width: 8px;
  }

  .log-list-content::-webkit-scrollbar-track {
    background: var(--bg-secondary, #f5f5f5);
  }

  .log-list-content::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb, #ccc);
    border-radius: 4px;
  }

  .log-list-content::-webkit-scrollbar-thumb:hover {
    background: var(--scrollbar-thumb-hover, #999);
  }
</style>
