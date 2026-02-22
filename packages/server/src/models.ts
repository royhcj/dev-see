/**
 * Core data models for the log viewer application
 */

/**
 * HTTP request/response log entry
 * This is the primary data structure stored and displayed in the UI
 */
export interface LogEntry {
  /** Unique identifier for this log entry */
  id: string;

  /** Timestamp when the request was made (ISO 8601 format) */
  timestamp: string;

  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string;

  /** Full URL of the request */
  url: string;

  /** HTTP status code (200, 404, 500, etc.) */
  statusCode: number;

  /** Request duration in milliseconds */
  duration: number;

  /** Optional: Request headers */
  requestHeaders?: Record<string, string>;

  /** Optional: Request body (for POST, PUT, etc.) */
  requestBody?: unknown;

  /** Optional: Response headers */
  responseHeaders?: Record<string, string>;

  /** Optional: Response body */
  responseBody?: unknown;

  /** Optional: Error message if request failed */
  error?: string;
}

/**
 * Incoming log entry from client (before server processing)
 * Required fields only - server will add id and timestamp
 */
export interface IncomingLogEntry {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  error?: string;
}

/**
 * Environment configuration
 * Loaded from .env file or environment variables
 */
export interface ServerConfig {
  /** Server port (default: 9090) */
  port: number;

  /** Host address (default: 0.0.0.0) */
  host: string;

  /** Maximum number of logs to store in memory (default: 1000) */
  maxLogs: number;

  /** Log level for server logging (default: info) */
  logLevel: string;

  /** Enable CORS for cross-origin requests (default: true) */
  corsEnabled: boolean;

  /** Path to the UI dist folder (default: ../../apps/ui/dist) */
  uiDistPath: string;
}
