import { spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const targetsByArch = {
  arm64: 'sidecar:pkg:arm64',
  x64: 'sidecar:pkg:x64',
};

const sidecarOutputDir = resolve(process.cwd(), '../../apps/desktop/.sidecar');
await rm(resolve(sidecarOutputDir, 'dev-see-server-macos-arm64'), { force: true });
await rm(resolve(sidecarOutputDir, 'dev-see-server-macos-x64'), { force: true });

const targetScript = targetsByArch[process.arch];
if (!targetScript) {
  console.error(`Unsupported architecture for sidecar build: ${process.arch}`);
  process.exit(1);
}

const result = spawnSync('pnpm', ['run', targetScript], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
