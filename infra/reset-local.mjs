import { spawnSync } from 'node:child_process';

if (!process.argv.includes('--confirm-local-data-loss')) {
  console.error('Borra solo los volúmenes de feet-local. Ejecuta pnpm local:reset --confirm-local-data-loss');
  process.exit(1);
}
const result = spawnSync('docker', ['compose', '--project-name', 'feet-local', '--env-file', 'infra/local.env', '--profile', 'test', '--profile', 'tools', 'down', '--volumes', '--remove-orphans'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
