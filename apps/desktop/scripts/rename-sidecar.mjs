import { chmod, copyFile, mkdir, stat, unlink } from 'node:fs/promises';
import { accessSync, constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const desktopDir = resolve(scriptDir, '..');
const stagingDir = resolve(desktopDir, '.sidecar');
const binariesDir = resolve(desktopDir, 'src-tauri', 'binaries');

const sidecars = [
  {
    source: 'dev-see-server-macos-arm64',
    target: 'dev-see-server-aarch64-apple-darwin',
  },
  {
    source: 'dev-see-server-macos-x64',
    target: 'dev-see-server-x86_64-apple-darwin',
  },
];

async function main() {
  await mkdir(binariesDir, { recursive: true });
  let prepared = 0;

  for (const sidecar of sidecars) {
    const sourcePath = resolve(stagingDir, sidecar.source);
    const targetPath = resolve(binariesDir, sidecar.target);

    try {
      accessSync(sourcePath, constants.R_OK);
    } catch {
      continue;
    }

    const sourceStats = await stat(sourcePath);
    if (sourceStats.size === 0) {
      try {
        await unlink(targetPath);
      } catch {
        // Ignore missing targets.
      }
      console.warn(`Skipping empty sidecar artifact: ${sidecar.source}`);
      continue;
    }

    await copyFile(sourcePath, targetPath);
    await chmod(targetPath, 0o755);
    console.log(`Prepared sidecar: ${sidecar.target}`);
    prepared++;
  }

  if (prepared === 0) {
    throw new Error(
      `No sidecar binaries found in ${stagingDir}. Run "pnpm --filter server sidecar:build" first.`
    );
  }
}

main().catch((error) => {
  console.error('Failed to prepare sidecar binaries:', error);
  process.exit(1);
});
