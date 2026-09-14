import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const failures = [];
for (const name of readdirSync('.').filter(name => /^\.env(?:\.|$)/.test(name))) {
  for (const line of readFileSync(name, 'utf8').split('\n')) {
    if (line.trim() && !line.trim().startsWith('#') && /=\s*\S/.test(line)) {
      failures.push(`${name}: populated environment variables are not allowed in this isolated demo`);
    }
  }
}
for (const path of ['public/CNAME', 'dist/CNAME', 'supabase/.temp/project-ref', 'supabase/.temp/linked-project.json', '.vercel/project.json', '.netlify/state.json', '.mcp.json']) {
  if (existsSync(path)) failures.push(`Unexpected external project binding: ${path}`);
}
function scan(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isSymbolicLink()) { failures.push(`Review symlink: ${path}`); continue; }
    if (entry.isDirectory()) { scan(path); continue; }
    if (!/\.(?:js|jsx|ts|tsx|json|html|yml|yaml|toml|sql|mjs)$/.test(path)) continue;
    const text = readFileSync(path, 'utf8');
    if (/https?:\/\/[\w.-]+\.supabase\.(?:co|com)|postgres(?:ql)?:\/\/|github_pat_|ghp_[A-Za-z0-9]{20,}|sb_secret_/i.test(text)) failures.push(`Remote backend or credential found: ${path}`);
  }
}
for (const dir of ['src', 'public', 'dist']) scan(dir);
if (existsSync('.github/workflows') && readdirSync('.github/workflows').some(n => /\.ya?ml$/.test(n))) failures.push('GitHub automation is not allowed in this demo');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (pkg.homepage || pkg.scripts.deploy || pkg.scripts.predeploy) failures.push('Deployment configuration is not allowed');
try {
  if (execFileSync('git', ['remote'], { encoding: 'utf8' }).trim()) failures.push('Git remote configured');
  const config = execFileSync('git', ['config', '--local', '--list'], { encoding: 'utf8' });
  if (/https?:\/\/|git@|pushurl=/.test(config)) failures.push('Remote target in local Git configuration');
} catch { failures.push('Cannot verify local Git configuration'); }
if (failures.length) {
  console.error('Demo isolation check failed:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('Demo isolation checks passed: no credentials, remote bindings, deployment automation or Git remotes.');
