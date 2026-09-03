import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const previewMode = args.includes('--strictPort') || args.includes('--host');

if (!previewMode) {
  const child = spawn('pnpm', ['-r', '--parallel', 'dev'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  child.on('exit', (code) => process.exit(code ?? 1));
} else {
  const valueAfter = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
  };

  const hostname = valueAfter('--host', '0.0.0.0');
  const port = valueAfter('--port', '4173');
  const nextBin = fileURLToPath(
    new URL('../apps/web/node_modules/next/dist/bin/next', import.meta.url),
  );
  const webRoot = fileURLToPath(new URL('../apps/web', import.meta.url));
  const child = spawn(
    process.execPath,
    [nextBin, 'dev', '--hostname', hostname, '--port', port],
    {
      stdio: 'inherit',
      cwd: webRoot,
    },
  );
  child.on('exit', (code) => process.exit(code ?? 1));
}
