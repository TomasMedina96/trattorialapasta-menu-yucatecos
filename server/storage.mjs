import { promises as fs, constants } from 'node:fs';
import path from 'node:path';
import { migrateCatalog } from './migrate.mjs';
import { validateCatalog } from './validation.mjs';

export function resolveDataDir(root, env = process.env) {
  const dataDir = path.resolve(env.DATA_DIR || path.join(root, 'data/runtime'));
  if (env.RAILWAY_ENVIRONMENT_ID) {
    if (!env.RAILWAY_VOLUME_MOUNT_PATH) throw new Error('Railway necesita un volumen persistente montado en /data antes de iniciar.');
    const volume = path.resolve(env.RAILWAY_VOLUME_MOUNT_PATH);
    const relative = path.relative(volume, dataDir);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('DATA_DIR debe estar dentro del volumen persistente de Railway.');
  }
  return dataDir;
}

export async function readCatalog(file) {
  const catalog = migrateCatalog(JSON.parse(await fs.readFile(file, 'utf8')));
  if (!validateCatalog(catalog)) throw new Error(`Catálogo inválido: ${file}`);
  return catalog;
}

export async function checkLocalMedia(catalog, publicDir, uploadDir) {
  const urls = new Set([
    ...catalog.products.map(p => p.image),
    ...catalog.settings.popups.map(p => p.image),
    ...Object.values(catalog.settings.feeds).flat().map(e => e.src),
  ]);
  for (const url of urls) {
    if (!url || !url.startsWith('/')) continue;
    const uploaded = url.startsWith('/uploads/');
    const base = path.resolve(uploaded ? uploadDir : publicDir);
    const file = path.resolve(base, decodeURIComponent(uploaded ? url.slice(9) : url.slice(1)));
    if (!file.startsWith(base + path.sep)) throw new Error(`Ruta de archivo inválida: ${url}`);
    await fs.access(file, constants.R_OK).catch(() => { throw new Error(`Falta el archivo: ${url}`); });
  }
}

export async function initializeCatalog({ root, dataDir, bootstrapDir }) {
  await fs.mkdir(path.join(dataDir, 'uploads'), { recursive: true });
  const db = path.join(dataDir, 'menu.json');
  try { return { catalog: await readCatalog(db), source: 'persistente' }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }

  const catalog = await readCatalog(bootstrapDir ? path.join(bootstrapDir, 'menu.json') : path.join(root, 'data/menu.seed.json'));
  if (bootstrapDir) {
    const sourceUploads = path.join(bootstrapDir, 'uploads');
    await checkLocalMedia(catalog, path.join(root, 'dist'), sourceUploads);
    for (const file of await fs.readdir(sourceUploads, { withFileTypes: true })) {
      if (!file.isFile()) throw new Error(`El respaldo contiene un archivo no admitido: ${file.name}`);
      const source = path.join(sourceUploads, file.name);
      const target = path.join(dataDir, 'uploads', file.name);
      try { await fs.copyFile(source, target, constants.COPYFILE_EXCL); }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        // A first-start retry may find files already copied; never overwrite different media.
        if (!(await fs.readFile(source)).equals(await fs.readFile(target))) throw new Error(`Ya existe un archivo diferente en el volumen: ${file.name}`);
      }
    }
  }
  await fs.writeFile(db + '.tmp', JSON.stringify(catalog, null, 2) + '\n');
  await fs.rename(db + '.tmp', db);
  return { catalog, source: bootstrapDir ? 'copia inicial de desarrollo' : 'catálogo inicial' };
}
