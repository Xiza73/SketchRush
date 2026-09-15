// Copies the socket contract from its owner (backend) to the frontend.
// Run from the repo root after any change to backend/src/shared/contract/index.ts.
// `--check` only verifies that the copy is current; it never writes.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const src = path.join(root, 'backend', 'src', 'shared', 'contract', 'index.ts');
const dst = path.join(root, 'frontend', 'src', 'shared', 'contract', 'index.ts');
const rel = path.relative(root, dst);

if (process.argv.includes('--check')) {
  const same = existsSync(dst) && readFileSync(src, 'utf8') === readFileSync(dst, 'utf8');
  if (!same) {
    console.error(`contract out of sync: ${rel} differs from the backend copy. Run: node scripts/sync-contract.mjs`);
    process.exit(1);
  }
  console.log(`contract in sync -> ${rel}`);
} else {
  mkdirSync(path.dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  console.log(`contract synced -> ${rel}`);
}
