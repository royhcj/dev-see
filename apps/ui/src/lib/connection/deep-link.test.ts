import { describe, expect, it } from 'vitest';
import {
  buildConnectionDeepLink,
  buildQrCodeImageUrl,
  isLocalOnlyHost,
  parseServerTarget,
  validateBundleId,
  validateServerTarget,
} from './deep-link';

describe('connection deep-link utilities', () => {
  it('builds deep link with required query params and URL-encoded values', () => {
    const deepLink = buildConnectionDeepLink({
      bundleId: 'com.example.app',
      serverHost: 'qa-server.local',
      serverPort: 9090,
    });

    expect(deepLink).toBe(
      'dev-see-com.example.app://connect?server_ip=qa-server.local&server_port=9090',
    );
  });

  it('encodes host values when needed', () => {
    const deepLink = buildConnectionDeepLink({
      bundleId: 'com.example.app',
      serverHost: 'qa server',
      serverPort: 9090,
    });

    expect(deepLink).toContain('server_ip=qa%20server');
  });

  it('generates a local QR code data URL', async () => {
    const deepLink = buildConnectionDeepLink({
      bundleId: 'com.example.app',
      serverHost: 'qa-server.local',
      serverPort: 9090,
    });

    const qrImageUrl = await buildQrCodeImageUrl(deepLink);
    expect(qrImageUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('validates bundle id input', () => {
    expect(validateBundleId('')).toBe('Bundle ID is required.');
    expect(validateBundleId('com.example.app')).toBeNull();
    expect(validateBundleId('com.example.app!')).toBe(
      'Use letters, numbers, dots, and hyphens only.',
    );
  });

  it('parses server URL into host and port', () => {
    expect(parseServerTarget('http://192.168.1.23:9090')).toEqual({
      host: '192.168.1.23',
      port: 9090,
    });
  });

  it('rejects invalid server targets', () => {
    expect(validateServerTarget('', 9090)).toBeTruthy();
    expect(validateServerTarget('localhost', 9090)).toBeTruthy();
    expect(validateServerTarget('127.0.0.1', 9090)).toBeTruthy();
    expect(validateServerTarget('0.0.0.0', 9090)).toBeTruthy();
    expect(validateServerTarget('localhost', 0)).toBeTruthy();
    expect(validateServerTarget('localhost', 65536)).toBeTruthy();
    expect(parseServerTarget('invalid-url')).toBeNull();
  });

  it('identifies local-only hosts', () => {
    expect(isLocalOnlyHost('localhost')).toBe(true);
    expect(isLocalOnlyHost('127.0.0.1')).toBe(true);
    expect(isLocalOnlyHost('0.0.0.0')).toBe(true);
    expect(isLocalOnlyHost('192.168.1.23')).toBe(false);
    expect(isLocalOnlyHost('qa-server.local')).toBe(false);
  });
});
