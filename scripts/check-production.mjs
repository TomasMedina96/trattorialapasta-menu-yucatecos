import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await fs.mkdir(path.join(root, '.tmp'), { recursive: true });
const volume = await fs.mkdtemp(path.join(root, '.tmp/production-check-'));
const name = 'trattoria-production-check-' + Date.now();
const native = process.argv.includes('--native');
const image = 'trattoria-railway-check:local';
const base = 'http://127.0.0.1:3199';
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let created = false;
let child;
let nativeLogs = '';
function start() {
  if (native) {
    child = spawn(process.execPath, ['server/index.mjs'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production', PORT: '3199', DATA_DIR: volume, BOOTSTRAP_DIR: path.join(root, 'data/bootstrap'), RAILWAY_ENVIRONMENT_ID: 'local-production-check', RAILWAY_VOLUME_MOUNT_PATH: volume } });
    child.stdout.on('data', data => { nativeLogs += data; });
    child.stderr.on('data', data => { nativeLogs += data; });
    child.on('error', error => { nativeLogs += error.message; });
  } else {
    docker('run', '--detach', '--name', name, '--publish', '127.0.0.1:3199:3001',
      '--mount', `type=bind,source=${volume},target=/data`,
      '--env', 'RAILWAY_ENVIRONMENT_ID=local-production-check', '--env', 'RAILWAY_VOLUME_MOUNT_PATH=/data', image);
  }
  created = true;
}
async function stop() {
  if (!created) return;
  if (native) {
    if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
  } else docker('rm', '--force', name);
  created = false;
}
async function ready() {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + '/api/health')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('El servidor no pasó /api/health: ' + (native ? nativeLogs : docker('logs', name)));
}
async function catalog() { return (await fetch(base + '/api/catalog')).json(); }

try {
  start(); await ready();
  const original = await catalog();
  const snapshot = JSON.parse(await fs.readFile(path.join(root, 'data/bootstrap/menu.json'), 'utf8'));
  assert.deepEqual(original, snapshot);
  for (const route of ['/', '/yucatecos', '/yucatecos/', '/admin', '/menu']) {
    const page = await fetch(base + route);
    assert.equal(page.status, 200, route);
    assert.match(page.headers.get('content-type'), /text\/html/);
    const html = await page.text();
    assert.match(html, /<div id="root">/);
    const script = /src="([^\"]+\.js)"/.exec(html)?.[1];
    assert.ok(script);
    assert.equal((await fetch(base + script)).status, 200);
  }
  const files = await fs.readdir(path.join(root, 'data/bootstrap/uploads'));
  for (const file of files) {
    const response = await fetch(base + '/uploads/' + file);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await fs.readFile(path.join(root, 'data/bootstrap/uploads', file)));
  }
  const headers = { 'X-Requested-With': 'TrattoriaAdmin', 'Content-Type': 'application/json', Origin: base };
  const login = await fetch(base + '/api/login', { method: 'POST', headers, body: JSON.stringify({ username: 'admin', password: 'Trattoria2026!' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=Strict/);
  headers.Cookie = cookie.split(';')[0];
  original.products[0].description += ' — verificación aislada';
  const saved = await fetch(base + '/api/catalog', { method: 'PUT', headers, body: JSON.stringify(original) });
  assert.equal(saved.status, 200);
  const expected = await saved.json();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJf8AAAAASUVORK5CYII=', 'base64');
  const uploaded = await fetch(base + '/api/upload', { method: 'POST', headers, body: png });
  assert.equal(uploaded.status, 200);
  const uploadedPath = (await uploaded.json()).url;
  const range = await fetch(base + '/videos/trattoria-intro.mp4', { headers: { Range: 'bytes=0-99' } });
  assert.equal(range.status, 206); assert.equal((await range.arrayBuffer()).byteLength, 100);
  if (native) { await stop(); start(); } else docker('restart', name);
  await ready();
  assert.deepEqual(await catalog(), expected);
  assert.equal((await fetch(base + uploadedPath)).status, 200);
  await stop();
  start(); await ready();
  assert.deepEqual(await catalog(), expected);
  assert.deepEqual(Buffer.from(await (await fetch(base + uploadedPath)).arrayBuffer()), png);
  const session = await (await fetch(base + '/api/session', { headers })).json();
  assert.equal(session.authenticated, false);
  console.log(`OK: ${native ? `Node ${process.versions.node}/${process.platform}` : 'Node 22/Linux (Docker)'}, rutas directas, API, cookie de producción, copia inicial revisión ${snapshot.revision}, ${files.length} archivos iniciales, guardado y subida.`);
  console.log(`OK: los datos sobreviven al reinicio y al reemplazo del ${native ? 'proceso' : 'contenedor'}. La copia inicial no sobrescribe cambios.`);
  console.log(`Datos de prueba aislados: ${volume}`);
} finally {
  await stop();
}
