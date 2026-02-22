/**
 * Logs Store - Svelte 5 State Management
 *
 * This store uses a simple reactive class pattern that works with Svelte 5.
 * Properties are directly accessible and Svelte automatically tracks changes.
 *
 * In Svelte 5, you can use this store by creating reactive references in components:
 * - Import the store: import { logsStore } from '../stores/logs.svelte.js'
 * - Use it directly: logsStore.logs, logsStore.addLog(), etc.
 * - Svelte 5 will auto-track when you reference properties in the template
 */

export interface LogEntry {
  id: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number; // in milliseconds
  timestamp: number; // Unix timestamp
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
}

interface LogsState {
  logs: LogEntry[];
  selectedLogId: string | null;
  searchQuery: string;
  statusFilter: number[];
}

class LogsStore {
  private state: LogsState = $state({
    logs: [],
    selectedLogId: null,
    searchQuery: '',
    statusFilter: [],
  });

  /**
   * Adds a new log entry to the store
   * Logs are prepended (newest first) for better UX
   */
  addLog(log: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newLog: LogEntry = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    // Add to beginning of array (newest first)
    this.state.logs = [newLog, ...this.state.logs];

    // Optional: Limit total logs to prevent memory issues
    const MAX_LOGS = 1000;
    if (this.state.logs.length > MAX_LOGS) {
      this.state.logs = this.state.logs.slice(0, MAX_LOGS);
    }
  }

  /**
   * Clears all logs from the store
   */
  clearLogs() {
    this.state.logs = [];
    this.state.selectedLogId = null;
  }

  /**
   * Selects a log entry for detailed view
   */
  selectLog(logId: string | null) {
    this.state.selectedLogId = logId;
  }

  /**
   * Updates the search query
   */
  setSearchQuery(query: string) {
    this.state.searchQuery = query;
  }

  /**
   * Updates status code filter
   */
  setStatusFilter(statusCodes: number[]) {
    this.state.statusFilter = statusCodes;
  }

  // Getters to access state
  get logs() {
    return this.state.logs;
  }

  get selectedLogId() {
    return this.state.selectedLogId;
  }

  get searchQuery() {
    return this.state.searchQuery;
  }

  get statusFilter() {
    return this.state.statusFilter;
  }

  /**
   * Returns filtered logs based on search and status filters
   */
  get filteredLogs(): LogEntry[] {
    let filtered = this.state.logs;

    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.url.toLowerCase().includes(query) ||
          log.method.toLowerCase().includes(query)
      );
    }

    if (this.state.statusFilter.length > 0) {
      filtered = filtered.filter((log) =>
        this.state.statusFilter.includes(log.statusCode)
      );
    }

    return filtered;
  }

  /**
   * Returns the currently selected log entry
   */
  get selectedLog(): LogEntry | null {
    if (!this.state.selectedLogId) return null;
    return this.state.logs.find((log) => log.id === this.state.selectedLogId) || null;
  }

  /**
   * Returns logs grouped by status code range
   */
  get logsByStatusRange() {
    return {
      success: this.state.logs.filter((log) => log.statusCode >= 200 && log.statusCode < 300),
      redirect: this.state.logs.filter((log) => log.statusCode >= 300 && log.statusCode < 400),
      clientError: this.state.logs.filter((log) => log.statusCode >= 400 && log.statusCode < 500),
      serverError: this.state.logs.filter((log) => log.statusCode >= 500 && log.statusCode < 600),
    };
  }
}

// Export singleton instance
export const logsStore = new LogsStore();
