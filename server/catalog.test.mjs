import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import os from 'node:os';
import { validateCatalog } from './validation.mjs';
import { migrateCatalog } from './migrate.mjs';
const seed = JSON.parse(await fs.readFile(new URL('../data/menu.seed.json', import.meta.url), 'utf8'));

test('Imported catalog preserves both price lists and shared product identity', () => {
  assert.equal(validateCatalog(seed), true);
  assert.equal(seed.products.length, 121);
  assert.equal(seed.products.filter(p => p.enabled.yucatecos).length, 40);
  const pizza = seed.products.find(p => p.id === 'pizza-margherita');
  assert.deepEqual(pizza.prices, { normal: 255, yucatecos: 178 });
  const changed = structuredClone(seed);
  changed.products[0].prices.normal = -1;
  assert.equal(validateCatalog(changed), false);
  changed.products[0].prices.normal = 100;
  changed.products[0].image = 'javascript:alert(1)';
  assert.equal(validateCatalog(changed), false);
});

test('Shared recommendations migrate to independent values without changing availability or news', () => {
  const legacy = structuredClone(seed);
  legacy.products[0].featured = true;
  legacy.products[1].featured = false;
  const migrated = migrateCatalog(legacy);
  assert.deepEqual(migrated.products[0].featured, { normal: true, yucatecos: true });
  assert.deepEqual(migrated.products[1].featured, { normal: false, yucatecos: false });
  assert.deepEqual(migrated.products[0].enabled, legacy.products[0].enabled);
  assert.deepEqual(migrated.products[0].news, legacy.products[0].news);
  migrated.products[0].featured.normal = false;
  assert.equal(migrated.products[0].featured.yucatecos, true);
  assert.deepEqual(migrateCatalog(migrated), migrated);
  const product = migrated.products[0];
  product.enabled.normal = false;
  product.news.normal = false;
  product.prices.normal = null;
  product.featured.normal = true;
  assert.equal(validateCatalog(migrated), true);
  product.featured.normal = 'true';
  assert.equal(validateCatalog(migrated), false);
});

test('Deletion markers migrate without hiding existing records and survive future migrations', () => {
  const legacy = structuredClone(seed);
  for (const p of legacy.products) delete p.deleted;
  legacy.settings.popups = [{ id: 'old-popup', title: 'Guardado', message: '', image: '', target: 'both', enabled: true }];
  for (const e of legacy.settings.feeds.normal) delete e.deleted;
  const migrated = migrateCatalog(legacy);
  assert.equal(validateCatalog(migrated), true);
  assert.deepEqual(migrated.products[0].deleted, { normal: false, yucatecos: false });
  assert.equal(migrated.settings.popups[0].deleted, false);
  assert.equal(migrated.settings.feeds.normal[0].deleted, false);
  migrated.products[0].deleted.normal = true;
  migrated.settings.popups[0].deleted = true;
  migrated.settings.feeds.normal[0].deleted = true;
  migrated.settings.popups.push({ id: 'new-popup', title: 'Nuevo', message: '', image: '', target: 'both', enabled: true, deleted: false });
  assert.equal(validateCatalog(migrated), true);
  assert.deepEqual(migrateCatalog(migrated), migrated);
  assert.equal(migrated.products[0].deleted.yucatecos, false);
  migrated.products[0].deleted.normal = 'true';
  assert.equal(validateCatalog(migrated), false);
});

test('Legacy announcements and cover videos migrate without losing saved content', () => {
  const legacy = structuredClone(seed);
  delete legacy.settings.popups;
  legacy.settings.popup = { title: 'Aniversario', message: 'Dos por uno', image: '/menu/pizza-margherita.webp', enabled: false };
  legacy.settings.feeds = { normal: { video: '/videos/trattoria-intro.mp4', productId: 'pizza-frita-pulcinella' }, yucatecos: { video: '', productId: '' } };
  const migrated = migrateCatalog(legacy);
  assert.equal(validateCatalog(migrated), true);
  assert.equal(migrated.settings.popups[0].title, 'Aniversario');
  assert.equal(migrated.settings.popups[0].target, 'normal');
  assert.equal(migrated.settings.popups[0].enabled, false);
  assert.equal(migrated.settings.feeds.normal[0].src, legacy.settings.feeds.normal.video);
  assert.equal(migrated.settings.feeds.normal[0].productId, 'pizza-frita-pulcinella');
  assert.deepEqual(migrated.settings.feeds.yucatecos, []);
  assert.deepEqual(migrateCatalog(migrated), migrated);
  assert.deepEqual(migrated.products, legacy.products);
  legacy.settings.popup.title = '';
  assert.equal(validateCatalog(migrateCatalog(legacy)), true);
});

test('Only one popup may be active across menus; media references and targets are validated', () => {
  const catalog = structuredClone(seed);
  catalog.settings.popups = [
    { id: 'uno', title: 'Uno', message: '', image: '', target: 'normal', enabled: true, deleted: false },
    { id: 'dos', title: 'Dos', message: '', image: '', target: 'yucatecos', enabled: true, deleted: false },
  ];
  assert.equal(validateCatalog(catalog), false);
  catalog.settings.popups[1].enabled = false;
  assert.equal(validateCatalog(catalog), true);
  catalog.settings.popups[0].target = 'both';
  assert.equal(validateCatalog(catalog), true);
  catalog.settings.popups[0].target = 'other';
  assert.equal(validateCatalog(catalog), false);
  catalog.settings.popups[0].target = 'both';
  catalog.settings.feeds.yucatecos = [{ id: 'imagen', title: 'Imagen', enabled: true, deleted: false, type: 'image', src: '/menu/pizza-margherita.webp', productId: 'missing' }];
  assert.equal(validateCatalog(catalog), false);
  catalog.settings.feeds.yucatecos[0].productId = 'pizza-margherita';
  assert.equal(validateCatalog(catalog), true);
  catalog.settings.feeds.yucatecos[0].src = '';
  assert.equal(validateCatalog(catalog), false);
  catalog.settings.feeds.yucatecos[0].enabled = false;
  assert.equal(validateCatalog(catalog), true);
});

test('API authorization, persistence, conflicts, images and menu settings', async () => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'trattoria-test-'));
  let child;
  let base;
  async function start() {
    child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: '3197', DATA_DIR: dataDir, NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    await Promise.race([once(child.stdout, 'data'), once(child, 'exit').then(() => { throw new Error('Server exited'); }), new Promise((_, reject) => setTimeout(() => reject(new Error('Startup timeout')), 10000).unref())]);
    base = 'http://127.0.0.1:3197/api/';
  }
  async function stop() { if (child && child.exitCode === null) { const done = once(child, 'exit'); child.kill(); await done; } }
  try {
    await start();
    const headers = { 'X-Requested-With': 'TrattoriaAdmin', 'Content-Type': 'application/json' };
    const original = await (await fetch(base + 'catalog')).json();
    assert.equal((await fetch(base + 'catalog', { method: 'PUT', headers, body: JSON.stringify(original) })).status, 401);
    assert.equal((await fetch(base + 'login', { method: 'POST', headers, body: JSON.stringify({ username: 'admin', password: 'wrong' }) })).status, 401);
    const login = await fetch(base + 'login', { method: 'POST', headers, body: JSON.stringify({ username: 'admin', password: 'Trattoria2026!' }) });
    assert.equal(login.status, 200);
    headers.Cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(base + 'catalog', { method: 'PUT', headers: { ...headers, Origin: 'https://evil.example' }, body: JSON.stringify(original) })).status, 403);
    const next = structuredClone(original);
    const pizza = next.products.find(p => p.id === 'pizza-margherita');
    pizza.description = 'Descripción compartida de prueba'; pizza.prices.normal = 260;
    pizza.news.normal = false; pizza.enabled.yucatecos = false;
    pizza.featured = { normal: true, yucatecos: false };
    pizza.deleted.normal = true;
    next.settings.yucatecosEnabled = false;
    next.settings.popups = [
      { id: 'promo', enabled: true, deleted: false, title: 'Promoción', message: 'Bienvenidos', image: '', target: 'both' },
      { id: 'futura', enabled: true, deleted: false, title: 'Promoción futura', message: 'Para después', image: '', target: 'yucatecos' },
    ];
    assert.equal((await fetch(base + 'catalog', { method: 'PUT', headers, body: JSON.stringify(next) })).status, 400);
    next.settings.popups[1].enabled = false;
    next.settings.feeds.yucatecos = [
      { id: 'imagen-pizza', enabled: true, deleted: false, type: 'image', title: 'Pizza', src: '/menu/pizza-margherita.webp', productId: pizza.id },
      { id: 'video-futuro', enabled: false, deleted: false, type: 'video', title: 'Video futuro', src: '/videos/trattoria-intro.mp4', productId: '' },
    ];
    next.settings.feeds.normal = structuredClone(next.settings.feeds.yucatecos);
    next.settings.feeds.normal[0].deleted = true;
    next.settings.popups[1].deleted = true;
    const saved = await fetch(base + 'catalog', { method: 'PUT', headers, body: JSON.stringify(next) });
    assert.equal(saved.status, 200);
    const result = await saved.json();
    assert.equal(result.products.find(p => p.id === pizza.id).prices.yucatecos, 178);
    assert.equal(result.settings.yucatecosEnabled, false);
    assert.equal((await fetch(base + 'catalog', { method: 'PUT', headers, body: JSON.stringify(original) })).status, 409);
    assert.equal((await fetch(base + 'upload', { method: 'POST', headers, body: '<svg>bad</svg>' })).status, 400);
    const upload = await fetch(base + 'upload', { method: 'POST', headers, body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJf8AAAAASUVORK5CYII=', 'base64') });
    assert.equal(upload.status, 200);
    const image = await upload.json();
    assert.equal((await fetch('http://127.0.0.1:3197' + image.url)).status, 200);
    assert.equal((await fetch(base + 'upload?type=video', { method: 'POST', headers, body: 'not an mp4' })).status, 400);
    const mp4 = Buffer.from([0, 0, 0, 24, ...Buffer.from('ftypisom'), 0, 0, 0, 0, ...Buffer.from('isommp42')]);
    const videoUpload = await fetch(base + 'upload?type=video', { method: 'POST', headers, body: mp4 });
    assert.equal(videoUpload.status, 200);
    const videoUrl = (await videoUpload.json()).url;
    const range = await fetch('http://127.0.0.1:3197' + videoUrl, { headers: { Range: 'bytes=0-15' } });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-type'), 'video/mp4');
    assert.equal((await range.arrayBuffer()).byteLength, 16);
    await stop(); await start();
    const persisted = await (await fetch(base + 'catalog')).json();
    assert.equal(persisted.revision, 1);
    assert.equal(persisted.products.find(p => p.id === pizza.id).description, pizza.description);
    const savedPizza = persisted.products.find(p => p.id === pizza.id);
    assert.deepEqual(savedPizza.featured, { normal: true, yucatecos: false });
    assert.deepEqual(savedPizza.deleted, { normal: true, yucatecos: false });
    assert.equal(savedPizza.enabled.normal, true);
    assert.equal(savedPizza.news.normal, false);
    assert.equal(savedPizza.enabled.yucatecos, false);
    assert.equal(persisted.settings.popups[0].title, 'Promoción');
    assert.equal(persisted.settings.popups[0].target, 'both');
    assert.equal(persisted.settings.popups[1].enabled, false);
    assert.equal(persisted.settings.popups[1].deleted, true);
    assert.equal(persisted.settings.feeds.normal[0].deleted, true);
    assert.equal(persisted.settings.feeds.yucatecos[0].deleted, false);
    assert.equal(persisted.settings.feeds.yucatecos[0].type, 'image');
    assert.equal(persisted.settings.feeds.yucatecos[1].enabled, false);
  } finally {
    await stop();
    const resolved = path.resolve(dataDir);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('trattoria-test-')) throw new Error('Unsafe cleanup path');
    await fs.rm(resolved, { recursive: true, force: true });
  }
});
