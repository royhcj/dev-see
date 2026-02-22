import { describe, expect, it } from 'vitest';
import { resolveConfig } from './config';

describe('runtime config resolution', () => {
  it('uses desktop runtime env values when desktop target is explicit', () => {
    const config = resolveConfig({
      env: {
        MODE: 'production',
        VITE_RUNTIME_TARGET: 'desktop',
        VITE_DESKTOP_SERVER_URL: 'http://127.0.0.1:9191',
        VITE_DESKTOP_WS_URL: 'ws://127.0.0.1:9191/ws',
      },
      isTauriApp: false,
      windowOrigin: 'https://example.com',
      windowHost: 'example.com',
    });

    expect(config.runtimeTarget).toBe('desktop');
    expect(config.isTauriApp).toBe(true);
    expect(config.serverUrl).toBe('http://127.0.0.1:9191');
    expect(config.wsUrl).toBe('ws://127.0.0.1:9191/ws');
  });

  it('defaults desktop target to loopback backend', () => {
    const config = resolveConfig({
      env: {
        MODE: 'production',
      },
      isTauriApp: true,
      windowOrigin: 'https://example.com',
      windowHost: 'example.com',
    });

    expect(config.runtimeTarget).toBe('desktop');
    expect(config.serverUrl).toBe('http://127.0.0.1:9090');
    expect(config.wsUrl).toBe('ws://127.0.0.1:9090/ws');
  });

  it('keeps browser development defaults unchanged', () => {
    const config = resolveConfig({
      env: {
        MODE: 'development',
      },
      isTauriApp: false,
      windowOrigin: 'https://example.com',
      windowHost: 'example.com',
    });

    expect(config.runtimeTarget).toBe('web');
    expect(config.serverUrl).toBe('http://localhost:9090');
    expect(config.wsUrl).toBe('ws://localhost:9090/ws');
  });

  it('keeps browser production fallback behavior unchanged', () => {
    const config = resolveConfig({
      env: {
        MODE: 'production',
      },
      isTauriApp: false,
      windowOrigin: 'https://app.dev-see.local',
      windowHost: 'app.dev-see.local',
    });

    expect(config.runtimeTarget).toBe('web');
    expect(config.serverUrl).toBe('https://app.dev-see.local');
    expect(config.wsUrl).toBe('ws://app.dev-see.local/ws');
  });

  it('respects browser env overrides when target is web', () => {
    const config = resolveConfig({
      env: {
        MODE: 'production',
        VITE_RUNTIME_TARGET: 'web',
        VITE_SERVER_URL: 'https://api.example.com',
        VITE_WS_URL: 'wss://api.example.com/ws',
      },
      isTauriApp: true,
      windowOrigin: 'https://desktop.example.com',
      windowHost: 'desktop.example.com',
    });

    expect(config.runtimeTarget).toBe('web');
    expect(config.isTauriApp).toBe(false);
    expect(config.serverUrl).toBe('https://api.example.com');
    expect(config.wsUrl).toBe('wss://api.example.com/ws');
  });
});
