// PostToolUse hook (Edit|Write): format the edited file with the owning
// package's Prettier. Applies to backend/ and frontend/ (.ts/.tsx/.js/.mjs).
// Never blocks: any failure exits 0 so a formatter problem cannot stop work.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PRETTIER_PROJECTS = ['backend', 'frontend'];
const PRETTIER_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.json']);

// One quoted command string: .cmd launchers need a shell on Windows and Node
// refuses to spawn them directly; quoting keeps paths with spaces safe.
function run(cmd, args, cwd) {
  const q = (s) => (/[\s"]/.test(String(s)) ? `"${String(s).replace(/"/g, '\\"')}"` : String(s));
  execSync([q(cmd), ...args.map(q)].join(' '), {
    cwd,
    stdio: 'ignore',
    timeout: 20000,
  });
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const file = input?.tool_input?.file_path;
    if (!file) return;
    const abs = path.resolve(file);
    const ext = path.extname(abs);
    if (!PRETTIER_EXT.has(ext)) return;
    const root = process.env.CLAUDE_PROJECT_DIR
      ? path.resolve(process.env.CLAUDE_PROJECT_DIR)
      : process.cwd();
    const rel = path.relative(root, abs);
    if (rel.startsWith('..')) return;
    const first = rel.split(path.sep)[0];
    if (!PRETTIER_PROJECTS.includes(first)) return;
    const projectDir = path.join(root, first);
    if (rel.includes('node_modules')) return;
    const hasConfig = ['.prettierrc', '.prettierrc.json', 'prettier.config.js', 'prettier.config.mjs']
      .some((f) => existsSync(path.join(projectDir, f)));
    if (!hasConfig) return;
    const bin = path.join(
      projectDir,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'prettier.cmd' : 'prettier',
    );
    if (!existsSync(bin)) return;
    run(bin, ['--write', '--log-level', 'silent', abs], projectDir);
  } catch {
    // intentionally silent
  }
});
