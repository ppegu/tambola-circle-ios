import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const platform = process.argv[2];
if (!['ios', 'android'].includes(platform)) throw new Error('Choose ios or android');
const output = `artifacts/bundles/${platform}`;
mkdirSync(output, { recursive: true });
const result = spawnSync(process.execPath, ['node_modules/react-native/cli.js', 'bundle', '--platform', platform,
  '--dev', 'false', '--entry-file', 'index.js', '--bundle-output', `${output}/index.${platform}.bundle`,
  '--assets-dest', output, '--max-workers', '2'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
