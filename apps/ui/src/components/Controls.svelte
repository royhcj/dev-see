<script lang="ts">
  /**
   * Controls Component - UI controls for log management
   *
   * Provides buttons and filters for:
   * - Clearing all logs
   * - Filtering by HTTP status code ranges (2xx, 3xx, 4xx, 5xx)
   * - Showing log statistics
   *
   * Status code filters are toggleable - clicking a chip
   * adds/removes that status range from the filter
   */

  import { logsStore } from '../stores/logs.svelte';
  import { wsClient } from '../lib/websocket.svelte';

  /**
   * Clears all logs with user confirmation
   */
  function handleClearLogs() {
    if (logsStore.logs.length === 0) {
      return;
    }

    // Ask for confirmation before clearing
    if (confirm(`Clear all ${logsStore.logs.length} logs?`)) {
      logsStore.clearLogs();
    }
  }

  /**
   * Toggles status code filter for a specific range
   * If already filtering by this range, remove it
   * Otherwise, add it to the filter
   */
  function toggleStatusFilter(statusRange: 'success' | 'redirect' | 'clientError' | 'serverError') {
    // Map status ranges to their code ranges
    const rangeMap = {
      success: [200, 201, 202, 203, 204, 205, 206],
      redirect: [300, 301, 302, 303, 304, 305, 306, 307, 308],
      clientError: [400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451],
      serverError: [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511],
    };

    const codes = rangeMap[statusRange];
    const currentFilter = logsStore.statusFilter;

    // Check if any code from this range is in the filter
    const isActive = codes.some(code => currentFilter.includes(code));

    if (isActive) {
      // Remove all codes from this range
      logsStore.setStatusFilter(currentFilter.filter(code => !codes.includes(code)));
    } else {
      // Add all codes from this range
      logsStore.setStatusFilter([...currentFilter, ...codes]);
    }
  }

  /**
   * Clears all status filters
   */
  function clearFilters() {
    logsStore.setStatusFilter([]);
  }

  /**
   * Checks if a status range is currently active in the filter
   */
  function isStatusRangeActive(statusRange: 'success' | 'redirect' | 'clientError' | 'serverError'): boolean {
    const rangeMap = {
      success: [200, 201, 202, 203, 204, 205, 206],
      redirect: [300, 301, 302, 303, 304, 305, 306, 307, 308],
      clientError: [400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451],
      serverError: [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511],
    };
    const codes = rangeMap[statusRange];
    return codes.some(code => logsStore.statusFilter.includes(code));
  }

  /**
   * Get WebSocket connection status
   * In Svelte 5, we can directly access reactive state or use $derived
   */
  const wsStatus = $derived(wsClient.status);

  /**
   * Get connection status color
   */
  function getStatusColor(status: typeof wsStatus): string {
    switch (status) {
      case 'connected':
        return 'var(--status-connected, #4caf50)';
      case 'connecting':
        return 'var(--status-connecting, #ff9800)';
      case 'disconnected':
      case 'error':
        return 'var(--status-error, #f44336)';
      default:
        return 'var(--text-secondary, #999)';
    }
  }
</script>

<div class="controls">
  <!-- Connection Status -->
  <div class="status-indicator">
    <span class="status-dot" style="background: {getStatusColor(wsStatus)}"></span>
    <span class="status-text">
      {wsStatus === 'connected' ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
    </span>
  </div>

  <!-- Statistics -->
  <div class="stats">
    <div class="stat-item">
      <span class="stat-label">Total:</span>
      <span class="stat-value">{logsStore.logs.length}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">2xx:</span>
      <span class="stat-value success">{logsStore.logsByStatusRange.success.length}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">3xx:</span>
      <span class="stat-value redirect">{logsStore.logsByStatusRange.redirect.length}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">4xx:</span>
      <span class="stat-value client-error">{logsStore.logsByStatusRange.clientError.length}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">5xx:</span>
      <span class="stat-value server-error">{logsStore.logsByStatusRange.serverError.length}</span>
    </div>
  </div>

  <!-- Filters -->
  <div class="filters">
    <span class="filter-label">Filter:</span>
    <button
      class="filter-chip"
      class:active={isStatusRangeActive('success')}
      onclick={() => toggleStatusFilter('success')}
      title="Filter by 2xx success codes"
    >
      2xx Success
    </button>
    <button
      class="filter-chip"
      class:active={isStatusRangeActive('redirect')}
      onclick={() => toggleStatusFilter('redirect')}
      title="Filter by 3xx redirect codes"
    >
      3xx Redirect
    </button>
    <button
      class="filter-chip"
      class:active={isStatusRangeActive('clientError')}
      onclick={() => toggleStatusFilter('clientError')}
      title="Filter by 4xx client error codes"
    >
      4xx Client Error
    </button>
    <button
      class="filter-chip"
      class:active={isStatusRangeActive('serverError')}
      onclick={() => toggleStatusFilter('serverError')}
      title="Filter by 5xx server error codes"
    >
      5xx Server Error
    </button>
    {#if logsStore.statusFilter.length > 0}
      <button class="clear-filters-button" onclick={clearFilters}>
        Clear Filters
      </button>
    {/if}
  </div>

  <!-- Actions -->
  <div class="actions">
    <button
      class="action-button clear-button"
      onclick={handleClearLogs}
      disabled={logsStore.logs.length === 0}
      title="Clear all logs"
    >
      🗑️ Clear Logs
    </button>
  </div>
</div>

<style>
  .controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--bg-primary, #fff);
    border-bottom: 1px solid var(--border-color, #ddd);
  }

  /* Connection Status */
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .status-text {
    font-weight: 500;
  }

  /* Statistics */
  .stats {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    gap: 0.25rem;
    font-size: 0.9rem;
  }

  .stat-label {
    color: var(--text-secondary, #666);
  }

  .stat-value {
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .stat-value.success {
    color: #2e7d32;
  }

  .stat-value.redirect {
    color: #1565c0;
  }

  .stat-value.client-error {
    color: #e65100;
  }

  .stat-value.server-error {
    color: #c62828;
  }

  /* Filters */
  .filters {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .filter-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary, #666);
  }

  .filter-chip {
    padding: 0.4rem 0.8rem;
    background: var(--bg-secondary, #f5f5f5);
    border: 2px solid var(--border-color, #ddd);
    border-radius: 1rem;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .filter-chip:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .filter-chip.active {
    background: var(--primary-color, #2196f3);
    border-color: var(--primary-color, #2196f3);
    color: white;
  }

  .clear-filters-button {
    padding: 0.4rem 0.8rem;
    background: var(--bg-secondary, #f5f5f5);
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.25rem;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-filters-button:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  /* Actions */
  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-button {
    padding: 0.6rem 1rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 0.375rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    background: var(--bg-primary, #fff);
  }

  .action-button:hover:not(:disabled) {
    background: var(--bg-hover, #f5f5f5);
  }

  .action-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .clear-button {
    color: #d32f2f;
    border-color: #d32f2f;
  }

  .clear-button:hover:not(:disabled) {
    background: #ffebee;
  }
</style>
