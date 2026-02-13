/**
 * Logs Store - Svelte 5 Reactive State Management
 *
 * This store manages the application's log data using Svelte 5's new $state runes.
 * It provides a centralized, reactive data source for all log-related information.
 *
 * Why we use $state instead of traditional Svelte stores:
 * - Svelte 5's runes are more performant and provide better TypeScript support
 * - $state creates deeply reactive objects automatically
 * - Simpler API than writable/readable stores
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

class LogsStore {
  // Svelte 5 $state rune creates reactive state
  logs = $state<LogEntry[]>([]);
  selectedLogId = $state<string | null>(null);
  searchQuery = $state<string>('');
  statusFilter = $state<number[]>([]); // e.g., [200, 404] to filter by status codes

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
    this.logs = [newLog, ...this.logs];

    // Optional: Limit total logs to prevent memory issues
    // This can be made configurable via environment variables later
    const MAX_LOGS = 1000;
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }
  }

  /**
   * Clears all logs from the store
   */
  clearLogs() {
    this.logs = [];
    this.selectedLogId = null;
  }

  /**
   * Selects a log entry for detailed view
   */
  selectLog(logId: string | null) {
    this.selectedLogId = logId;
  }

  /**
   * Updates the search query
   * Components can reactively filter based on this
   */
  setSearchQuery(query: string) {
    this.searchQuery = query;
  }

  /**
   * Updates status code filter
   * Empty array means no filtering
   */
  setStatusFilter(statusCodes: number[]) {
    this.statusFilter = statusCodes;
  }

  /**
   * Returns filtered logs based on search and status filters
   * This is a derived getter that components can use
   */
  get filteredLogs(): LogEntry[] {
    let filtered = this.logs;

    // Filter by search query (searches URL and method)
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.url.toLowerCase().includes(query) ||
          log.method.toLowerCase().includes(query)
      );
    }

    // Filter by status codes
    if (this.statusFilter.length > 0) {
      filtered = filtered.filter((log) =>
        this.statusFilter.includes(log.statusCode)
      );
    }

    return filtered;
  }

  /**
   * Returns the currently selected log entry
   */
  get selectedLog(): LogEntry | null {
    if (!this.selectedLogId) return null;
    return this.logs.find((log) => log.id === this.selectedLogId) || null;
  }

  /**
   * Returns logs grouped by status code range (2xx, 3xx, 4xx, 5xx)
   * Useful for statistics and filtering UI
   */
  get logsByStatusRange() {
    return {
      success: this.logs.filter((log) => log.statusCode >= 200 && log.statusCode < 300),
      redirect: this.logs.filter((log) => log.statusCode >= 300 && log.statusCode < 400),
      clientError: this.logs.filter((log) => log.statusCode >= 400 && log.statusCode < 500),
      serverError: this.logs.filter((log) => log.statusCode >= 500 && log.statusCode < 600),
    };
  }
}

// Export a single instance of the store
// This is the "singleton" pattern - all components share the same store instance
export const logsStore = new LogsStore();
