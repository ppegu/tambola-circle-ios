import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const privatePath = resolve(root, '.credentials/update-signing.json');
mkdirSync(resolve(root, '.credentials'), { recursive: true });
let material;
if (existsSync(privatePath)) material = JSON.parse(readFileSync(privatePath, 'utf8'));
else {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'der' }, privateKeyEncoding: { type: 'pkcs8', format: 'der' } });
  material = { keyId: 'updates-2026-01', privateKey: pair.privateKey.toString('base64'), publicKey: pair.publicKey.toString('base64'), adminToken: randomBytes(32).toString('hex') };
  writeFileSync(privatePath, JSON.stringify(material, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
}
const keysPath = resolve(root, 'shared/update-keys.json');
const keys = existsSync(keysPath) ? JSON.parse(readFileSync(keysPath, 'utf8')) : {};
if (keys[material.keyId] && keys[material.keyId] !== material.publicKey) throw new Error('Key ID conflict; explicit rotation is required.');
keys[material.keyId] = material.publicKey;
writeFileSync(keysPath, JSON.stringify(keys, null, 2) + '\n');
if (process.argv.includes('--local')) {
  const envPath = resolve(root, 'server/.dev.vars');
  let local = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  for (const [key, value] of Object.entries({ UPDATE_SIGNING_KEY: material.privateKey, UPDATE_ADMIN_TOKEN: material.adminToken, UPDATE_KEY_ID: material.keyId })) {
    if (!new RegExp('^' + key + '=', 'm').test(local)) local += '\n' + key + '=' + value + '\n';
  }
  writeFileSync(envPath, local, { mode: 0o600 });
}
console.log('Update signing public key prepared. Private material stays in ignored .credentials; no existing key was replaced.');
