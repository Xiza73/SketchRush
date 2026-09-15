// Deploys backend/ and/or frontend/ to Railway with the CLI, from a clean export of
// the last commit. Usage (from the repo root, after `railway login` and `railway link`):
//   node scripts/railway-deploy.mjs backend
//   node scripts/railway-deploy.mjs frontend
//   node scripts/railway-deploy.mjs            # both
//
// Why the export: `railway up` needs the service folder to be the upload root, and on
// Windows the CLI fails with "prefix not found" when given a subfolder of a git repo.
// Exporting the folder with `git archive` to a temp dir sidesteps both problems and
// guarantees that only committed files are uploaded (no node_modules, no .env).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['backend', 'frontend'];
const fwd = (p) => p.replace(/\\/g, '/');
// GNU tar (Git for Windows) reads "C:" as a remote host unless told otherwise; bsdtar does not.
const tarIsGnu = execFileSync('tar', ['--version']).toString().includes('GNU tar');
const tarLocal = tarIsGnu ? ['--force-local'] : [];

// The Railway link lives on the repo root directory; the temp dir is not linked, so the
// project and environment are read here and passed explicitly to `railway up`.
const status = JSON.parse(execFileSync('railway', ['status', '--json'], { cwd: root, shell: true }).toString());
const projectId = status.id;
const environment = (status.environments?.edges?.[0]?.node?.name) ?? 'production';
if (!projectId) throw new Error('No linked Railway project. Run `railway link` from the repo root first.');
console.log(`Railway project ${status.name} (${projectId}), environment ${environment}`);

for (const service of targets) {
  if (!['backend', 'frontend'].includes(service)) throw new Error(`unknown service: ${service}`);
  const work = mkdtempSync(path.join(tmpdir(), `sketchrush-${service}-`));
  const dir = path.join(work, service);
  const tarFile = path.join(work, `${service}.tar`);
  mkdirSync(dir);

  console.log(`\n→ exporting ${service}/ from HEAD to ${fwd(dir)}`);
  execFileSync('git', ['archive', '--format=tar', '-o', fwd(tarFile), `HEAD:${service}`], { cwd: root, stdio: 'inherit' });
  execFileSync('tar', [...tarLocal, '-xf', fwd(tarFile), '-C', fwd(dir)], { stdio: 'inherit' });

  console.log(`→ railway up (${service})`);
  execFileSync(
    'railway',
    ['up', '--project', projectId, '--environment', environment, '--service', service, '--detach'],
    { cwd: dir, stdio: 'inherit', shell: true },
  );

  rmSync(work, { recursive: true, force: true });
}
console.log('\nDone. Check with: railway service status --service backend --json (and frontend).');
