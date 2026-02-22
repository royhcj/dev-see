/**
 * Configuration Module - Runtime Environment Detection
 *
 * This module supports explicit desktop runtime wiring via env vars while
 * preserving existing browser behavior.
 */

const DEFAULT_DESKTOP_SERVER_URL = 'http://localhost:9090';
const DEFAULT_DESKTOP_WS_URL = 'ws://localhost:9090/ws';
const DEFAULT_DEV_SERVER_URL = 'http://localhost:9090';
const DEFAULT_DEV_WS_URL = 'ws://localhost:9090/ws';

export type RuntimeTarget = 'desktop' | 'web';

interface RuntimeEnv {
  MODE?: string;
  VITE_RUNTIME_TARGET?: string;
  VITE_SERVER_URL?: string;
  VITE_WS_URL?: string;
  VITE_DESKTOP_SERVER_URL?: string;
  VITE_DESKTOP_WS_URL?: string;
}

interface ResolveConfigInput {
  env: RuntimeEnv;
  isTauriApp: boolean;
  windowOrigin: string;
  windowHost: string;
}

/**
 * Configuration object with server and WebSocket URLs
 */
interface AppConfig {
  serverUrl: string;
  wsUrl: string;
  isDevelopment: boolean;
  isTauriApp: boolean;
  runtimeTarget: RuntimeTarget;
}

type WindowWithTauri = Window & { __TAURI__?: unknown };

/**
 * Detects if the app is running inside Tauri.
 * Tauri injects a __TAURI__ global object when running as a desktop app.
 */
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    (window as WindowWithTauri).__TAURI__ !== undefined
  );
}

function detectRuntimeTarget(env: RuntimeEnv, isTauriApp: boolean): RuntimeTarget {
  if (env.VITE_RUNTIME_TARGET === 'desktop') {
    return 'desktop';
  }
  if (env.VITE_RUNTIME_TARGET === 'web') {
    return 'web';
  }
  return isTauriApp ? 'desktop' : 'web';
}

function trimOrUndefined(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function deriveWsUrl(serverUrl: string): string | undefined {
  try {
    const server = new URL(serverUrl);
    server.protocol = server.protocol === 'https:' ? 'wss:' : 'ws:';
    server.pathname = '/ws';
    server.search = '';
    server.hash = '';
    return server.toString();
  } catch {
    return undefined;
  }
}

export function resolveConfig(input: ResolveConfigInput): AppConfig {
  const isDevelopment = input.env.MODE === 'development';
  const runtimeTarget = detectRuntimeTarget(input.env, input.isTauriApp);

  let serverUrl: string;
  let wsUrl: string;

  if (runtimeTarget === 'desktop') {
    serverUrl =
      trimOrUndefined(input.env.VITE_DESKTOP_SERVER_URL) ??
      trimOrUndefined(input.env.VITE_SERVER_URL) ??
      DEFAULT_DESKTOP_SERVER_URL;
    wsUrl =
      trimOrUndefined(input.env.VITE_DESKTOP_WS_URL) ??
      trimOrUndefined(input.env.VITE_WS_URL) ??
      deriveWsUrl(serverUrl) ??
      DEFAULT_DESKTOP_WS_URL;
  } else if (isDevelopment) {
    // Keep existing browser development behavior.
    serverUrl = trimOrUndefined(input.env.VITE_SERVER_URL) ?? DEFAULT_DEV_SERVER_URL;
    wsUrl = trimOrUndefined(input.env.VITE_WS_URL) ?? DEFAULT_DEV_WS_URL;
  } else {
    // Keep existing browser production behavior.
    serverUrl = trimOrUndefined(input.env.VITE_SERVER_URL) ?? input.windowOrigin;
    wsUrl = trimOrUndefined(input.env.VITE_WS_URL) ?? `ws://${input.windowHost}/ws`;
  }

  return {
    serverUrl,
    wsUrl,
    isDevelopment,
    isTauriApp: runtimeTarget === 'desktop',
    runtimeTarget,
  };
}

/**
 * Gets the application configuration based on the current environment.
 */
export function getConfig(): AppConfig {
  const isTauriApp = isTauri();
  const windowOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const windowHost =
    typeof window !== 'undefined' ? window.location.host : 'localhost';

  return resolveConfig({
    env: import.meta.env as RuntimeEnv,
    isTauriApp,
    windowOrigin,
    windowHost,
  });
}

/**
 * Global configuration instance.
 */
export const config = getConfig();

/**
 * Utility to log configuration (useful for debugging).
 */
export function logConfig() {
  console.log('App Configuration:', {
    mode: config.isDevelopment ? 'Development' : 'Production',
    target: config.runtimeTarget,
    serverUrl: config.serverUrl,
    wsUrl: config.wsUrl,
  });
}
