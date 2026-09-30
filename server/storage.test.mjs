import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { initializeCatalog, resolveDataDir, checkLocalMedia } from './storage.mjs';

test('Railway requires DATA_DIR inside the attached persistent volume', () => {
  const root = path.resolve('example-app');
  const volume = path.resolve('example-volume');
  assert.throws(() => resolveDataDir(root, { RAILWAY_ENVIRONMENT_ID: 'production' }), /volumen persistente/);
  assert.throws(() => resolveDataDir(root, { RAILWAY_ENVIRONMENT_ID: 'production', RAILWAY_VOLUME_MOUNT_PATH: volume, DATA_DIR: root }), /dentro del volumen/);
  assert.equal(resolveDataDir(root, { RAILWAY_ENVIRONMENT_ID: 'production', RAILWAY_VOLUME_MOUNT_PATH: volume, DATA_DIR: volume }), volume);
  assert.equal(resolveDataDir(root, {}), path.join(root, 'data/runtime'));
});

test('Bootstrap copies local data once, preserves later edits/uploads, and fails safely on corruption', async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'trattoria-storage-test-'));
  try {
    const root = path.join(temp, 'app');
    const bootstrapDir = path.join(temp, 'bootstrap');
    const dataDir = path.join(temp, 'volume');
    await fs.mkdir(path.join(bootstrapDir, 'uploads'), { recursive: true });
    await fs.mkdir(path.join(root, 'dist'), { recursive: true });
    const catalog = JSON.parse(await fs.readFile(new URL('../data/menu.seed.json', import.meta.url), 'utf8'));
    catalog.revision = 57;
    for (const product of catalog.products) product.image = '';
    catalog.products[0].image = '/uploads/initial.png';
    catalog.settings.feeds = { normal: [], yucatecos: [] };
    catalog.settings.popups = [];
    await fs.writeFile(path.join(bootstrapDir, 'menu.json'), JSON.stringify(catalog));
    await fs.writeFile(path.join(bootstrapDir, 'uploads/initial.png'), 'initial image');
    const first = await initializeCatalog({ root, dataDir, bootstrapDir });
    assert.equal(first.source, 'copia inicial de desarrollo');
    assert.equal(first.catalog.revision, 57);
    assert.equal(await fs.readFile(path.join(dataDir, 'uploads/initial.png'), 'utf8'), 'initial image');
    const saved = structuredClone(first.catalog);
    saved.revision++;
    saved.products[0].prices.normal = 1234;
    await fs.writeFile(path.join(dataDir, 'menu.json'), JSON.stringify(saved));
    await fs.writeFile(path.join(dataDir, 'uploads/new.png'), 'new image');
    await fs.writeFile(path.join(bootstrapDir, 'menu.json'), 'invalid bootstrap must be ignored on restart');
    const restarted = await initializeCatalog({ root, dataDir, bootstrapDir });
    assert.equal(restarted.source, 'persistente');
    assert.equal(restarted.catalog.revision, 58);
    assert.equal(restarted.catalog.products[0].prices.normal, 1234);
    assert.equal(await fs.readFile(path.join(dataDir, 'uploads/new.png'), 'utf8'), 'new image');
    await fs.writeFile(path.join(dataDir, 'menu.json'), 'invalid persisted catalog');
    await assert.rejects(initializeCatalog({ root, dataDir, bootstrapDir }));
    assert.equal(await fs.readFile(path.join(dataDir, 'menu.json'), 'utf8'), 'invalid persisted catalog');
    catalog.products[0].image = '/uploads/missing.png';
    await assert.rejects(checkLocalMedia(catalog, path.join(root, 'dist'), path.join(bootstrapDir, 'uploads')), /Falta el archivo/);
  } finally {
    const resolved = path.resolve(temp);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('trattoria-storage-test-')) throw new Error('Unsafe cleanup path');
    await fs.rm(resolved, { recursive: true, force: true });
  }
});
