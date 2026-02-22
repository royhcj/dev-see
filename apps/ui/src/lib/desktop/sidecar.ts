import { Command } from '@tauri-apps/plugin-shell';
import { config, isTauri } from '../config';

const SIDECAR_NAME = 'binaries/dev-see-server';
const SIDECAR_ARGS = ['--host', '127.0.0.1', '--port', '9090'];
const STARTUP_TIMEOUT_MS = 10000;
const STARTUP_POLL_INTERVAL_MS = 200;

type SidecarPromiseWindow = Window & {
  __DEV_SEE_SIDECAR_START__?: Promise<void>;
};

async function isServerReady(): Promise<boolean> {
  try {
    const response = await fetch(`${config.serverUrl}/api/connection/target`, {
      method: 'GET',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServerReady(): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    if (await isServerReady()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, STARTUP_POLL_INTERVAL_MS));
  }

  throw new Error(
    `Node sidecar did not become ready within ${STARTUP_TIMEOUT_MS}ms`
  );
}

async function startSidecar(): Promise<void> {
  if (await isServerReady()) {
    return;
  }

  const command = Command.sidecar(SIDECAR_NAME, SIDECAR_ARGS);
  command.stdout.on('data', line => {
    console.info('[sidecar]', line);
  });
  command.stderr.on('data', line => {
    console.error('[sidecar]', line);
  });

  await command.spawn();
  await waitForServerReady();
}

export async function ensureDesktopSidecar(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  if (await isServerReady()) {
    return;
  }

  const sidecarWindow = window as SidecarPromiseWindow;
  if (!sidecarWindow.__DEV_SEE_SIDECAR_START__) {
    sidecarWindow.__DEV_SEE_SIDECAR_START__ = startSidecar().catch((error) => {
      sidecarWindow.__DEV_SEE_SIDECAR_START__ = undefined;
      throw error;
    });
  }

  await sidecarWindow.__DEV_SEE_SIDECAR_START__;
}
