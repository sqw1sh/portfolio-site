import { execFileSync } from 'node:child_process';
import { cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const workspace of ['@portfolio/site', '@portfolio/traceshelf']) {
  execFileSync(
    process.execPath,
    [process.env.npm_execpath, 'run', 'build', '--workspace', workspace],
    { cwd: root, stdio: 'inherit' },
  );
}
cpSync(
  new URL('../projects/traceshelf/app/dist/', import.meta.url),
  new URL('../apps/portfolio/dist/traceshelf/', import.meta.url),
  { recursive: true },
);
console.log('Portfolio + TraceShelf assembled in apps/portfolio/dist/');
