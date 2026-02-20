export const DEEP_LINK_SCHEME_PREFIX = 'dev-see-';
export const DEEP_LINK_ACTION = 'connect';
export const DEEP_LINK_SERVER_IP_PARAM = 'server_ip';
export const DEEP_LINK_SERVER_PORT_PARAM = 'server_port';

const BUNDLE_ID_PATTERN = /^[A-Za-z0-9]+(?:[.-][A-Za-z0-9]+)*$/;

export interface ServerTarget {
  host: string;
  port: number;
}

interface BuildDeepLinkParams {
  bundleId: string;
  serverHost: string;
  serverPort: number;
}

export function validateBundleId(bundleId: string): string | null {
  const trimmed = bundleId.trim();

  if (!trimmed) {
    return 'Bundle ID is required.';
  }

  if (!BUNDLE_ID_PATTERN.test(trimmed)) {
    return 'Use letters, numbers, dots, and hyphens only.';
  }

  return null;
}

export function validateServerTarget(host: string, port: number): string | null {
  if (!host.trim()) {
    return 'Server host/IP is missing. Check your app server URL configuration.';
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return 'Server port must be an integer between 1 and 65535.';
  }

  return null;
}

export function parseServerTarget(serverUrl: string): ServerTarget | null {
  try {
    const url = new URL(serverUrl);
    const host = url.hostname.trim();
    const port = resolvePort(url.protocol, url.port);

    if (validateServerTarget(host, port) !== null) {
      return null;
    }

    return { host, port };
  } catch {
    return null;
  }
}

export function buildConnectionDeepLink(params: BuildDeepLinkParams): string {
  const bundleId = params.bundleId.trim();
  const serverHost = params.serverHost.trim();
  const serverPort = String(params.serverPort);

  return `${DEEP_LINK_SCHEME_PREFIX}${bundleId}://${DEEP_LINK_ACTION}?${DEEP_LINK_SERVER_IP_PARAM}=${encodeURIComponent(serverHost)}&${DEEP_LINK_SERVER_PORT_PARAM}=${encodeURIComponent(serverPort)}`;
}

export function buildQrCodeImageUrl(deepLink: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(deepLink)}`;
}

function resolvePort(protocol: string, port: string): number {
  if (port) {
    return Number.parseInt(port, 10);
  }

  switch (protocol) {
    case 'http:':
    case 'ws:':
      return 80;
    case 'https:':
    case 'wss:':
      return 443;
    default:
      return NaN;
  }
}
