/**
 * Configuration Module - Runtime Environment Detection
 *
 * This module detects whether the app is running in:
 * 1. Tauri Desktop App - uses embedded server
 * 2. Browser (Development) - connects to separate server
 * 3. Browser (Production) - uses environment variables
 *
 * Why we need this:
 * - Tauri apps bundle the server, so they use localhost
 * - Browser apps in dev connect to a separate server process
 * - Production builds may use different URLs
 *
 * Vite's import.meta.env provides environment variables at build time:
 * - import.meta.env.MODE: 'development' or 'production'
 * - import.meta.env.VITE_*: custom environment variables
 */

/**
 * Detects if the app is running inside Tauri
 * Tauri injects a __TAURI__ global object when running as a desktop app
 */
export function isTauri(): boolean {
  // Check if running in Tauri environment
  // @ts-expect-error - __TAURI__ is injected by Tauri at runtime
  return typeof window !== 'undefined' && window.__TAURI__ !== undefined;
}

/**
 * Configuration object with server and WebSocket URLs
 */
interface AppConfig {
  serverUrl: string;
  wsUrl: string;
  isDevelopment: boolean;
  isTauriApp: boolean;
}

/**
 * Gets the application configuration based on the current environment
 */
export function getConfig(): AppConfig {
  const isDevelopment = import.meta.env.MODE === 'development';
  const isTauriApp = isTauri();

  // Default URLs for different environments
  let serverUrl: string;
  let wsUrl: string;

  if (isTauriApp) {
    // Tauri app: server runs embedded on localhost
    serverUrl = 'http://localhost:9090';
    wsUrl = 'ws://localhost:9090/ws';
  } else if (isDevelopment) {
    // Development mode: use environment variables or defaults
    serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:9090';
    wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:9090/ws';
  } else {
    // Production mode: must use environment variables
    // These are set at build time in .env.production
    serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
    wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;
  }

  return {
    serverUrl,
    wsUrl,
    isDevelopment,
    isTauriApp,
  };
}

/**
 * Global configuration instance
 * Initialized once when the module is imported
 */
export const config = getConfig();

/**
 * Utility to log configuration (useful for debugging)
 */
export function logConfig() {
  console.log('🔧 App Configuration:', {
    mode: config.isDevelopment ? 'Development' : 'Production',
    platform: config.isTauriApp ? 'Tauri Desktop' : 'Browser',
    serverUrl: config.serverUrl,
    wsUrl: config.wsUrl,
  });
}
