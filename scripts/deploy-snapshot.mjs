import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLocalMedia, readCatalog } from '../server/storage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.env.DATA_DIR || path.join(root, 'data/runtime'));
const target = path.join(root, 'data/bootstrap');
if (source === target) throw new Error('El origen debe ser la carpeta de datos del administrador.');
const catalog = await readCatalog(path.join(source, 'menu.json'));
await checkLocalMedia(catalog, path.join(root, 'public'), path.join(source, 'uploads'));
await fs.mkdir(path.join(target, 'uploads'), { recursive: true });
let files = 0;
for (const file of await fs.readdir(path.join(source, 'uploads'), { withFileTypes: true })) {
  if (!file.isFile()) throw new Error(`Archivo no admitido: ${file.name}`);
  await fs.copyFile(path.join(source, 'uploads', file.name), path.join(target, 'uploads', file.name));
  files++;
}
// Publish the manifest last. Existing unreferenced media is retained deliberately.
await fs.writeFile(path.join(target, 'menu.json.tmp'), JSON.stringify(catalog, null, 2) + '\n');
await fs.rename(path.join(target, 'menu.json.tmp'), path.join(target, 'menu.json'));
console.log(`Copia inicial lista: revisión ${catalog.revision}, ${catalog.products.length} productos, ${catalog.settings.popups.length} avisos, ${files} archivos.`);
console.log('Incluye data/bootstrap en el commit. Solo se importará si el volumen todavía no tiene menu.json.');
