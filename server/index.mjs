import http from 'node:http';
import { promises as fs, constants, createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { validateCatalog } from './validation.mjs';
import { initializeCatalog, resolveDataDir } from './storage.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolveDataDir(root);
const db = path.join(dataDir, 'menu.json');
const initialized = await initializeCatalog({ root, dataDir, bootstrapDir: process.env.BOOTSTRAP_DIR });
let catalog = initialized.catalog;
// Credenciales fijas solicitadas; nunca se incluyen en el bundle del navegador.
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const sessions = new Map();
const attempts = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of sessions) if (v < now) sessions.delete(k); for (const [k, v] of attempts) if (v.until < now) attempts.delete(k); }, 60000).unref();
const equal = (a, b) => typeof a === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const token = req => /(?:^|; )session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
const authenticated = req => (sessions.get(token(req)) || 0) > Date.now();
async function body(req, limit = 3 * 1024 * 1024) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw Object.assign(new Error('Archivo demasiado grande'), { status: 413 }); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
let writing = false;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const route = url.pathname;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (route.startsWith('/api/')) {
      if (route === '/api/health' && req.method === 'GET') {
        try {
          await fs.access(path.join(root, 'dist/index.html'), constants.R_OK);
          await fs.access(dataDir, constants.W_OK);
          await fs.access(path.join(dataDir, 'uploads'), constants.W_OK);
          return json(res, 200, { ok: true });
        } catch { return json(res, 503, { ok: false }); }
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        if (req.headers['x-requested-with'] !== 'TrattoriaAdmin') return json(res, 403, { error: 'Solicitud no permitida' });
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(res, 403, { error: 'Origen no permitido' });
      }
      if (route === '/api/catalog' && req.method === 'GET') return json(res, 200, catalog);
      if (route === '/api/session' && req.method === 'GET') return json(res, 200, { authenticated: authenticated(req) });
      if (route === '/api/login' && req.method === 'POST') {
        const ip = req.socket.remoteAddress;
        const attempt = attempts.get(ip) || { count: 0, until: Date.now() + 600000 };
        if (attempt.count >= 10 && attempt.until > Date.now()) return json(res, 429, { error: 'Demasiados intentos. Espera 10 minutos.' });
        const credentials = JSON.parse((await body(req, 4096)).toString());
        if (!equal(credentials.username, ADMIN_USER) || !equal(credentials.password, ADMIN_PASSWORD)) { attempt.count++; attempts.set(ip, attempt); return json(res, 401, { error: 'Credenciales incorrectas' }); }
        attempts.delete(ip);
        const session = randomBytes(32).toString('hex');
        sessions.set(session, Date.now() + 8 * 3600000);
        res.setHeader('Set-Cookie', `session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
        return json(res, 200, { ok: true });
      }
      if (!authenticated(req)) return json(res, 401, { error: 'Inicia sesión para continuar' });
      if (route === '/api/logout' && req.method === 'POST') { sessions.delete(token(req)); res.setHeader('Set-Cookie', 'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json(res, 200, { ok: true }); }
      if (route === '/api/catalog' && req.method === 'PUT') {
        const next = JSON.parse((await body(req)).toString());
        if (Array.isArray(next?.settings?.popups) && next.settings.popups.filter(p => p?.enabled && !p.deleted).length > 1) return json(res, 400, { error: 'Solo puede haber un aviso emergente activo.' });
        if (!validateCatalog(next)) return json(res, 400, { error: 'Revisa los campos, precios y enlaces del catálogo' });
        if (writing || next.revision !== catalog.revision) return json(res, 409, { error: 'Otra sesión modificó el catálogo. Recarga antes de guardar.' });
        writing = true;
        try { next.revision++; await fs.writeFile(db + '.tmp', JSON.stringify(next, null, 2)); await fs.rename(db + '.tmp', db); catalog = next; }
        finally { writing = false; }
        return json(res, 200, catalog);
      }
      if (route === '/api/upload' && req.method === 'POST') {
        const video = url.searchParams.get('type') === 'video';
        const buffer = await body(req, (video ? 50 : 6) * 1024 * 1024);
        const mp4 = buffer.length >= 16 && buffer.toString('ascii', 4, 8) === 'ftyp' && /^(isom|iso[2-9]|mp4[12]|avc1|M4V )$/.test(buffer.toString('ascii', 8, 12));
        const ext = video ? (mp4 ? '.mp4' : null) : buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? '.jpg' : buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? '.png' : buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' ? '.webp' : null;
        if (!ext) return json(res, 400, { error: video ? 'Usa un video MP4 (máximo 50 MB)' : 'Usa imágenes JPG, PNG o WebP (máximo 6 MB)' });
        const name = randomBytes(16).toString('hex') + ext;
        await fs.writeFile(path.join(dataDir, 'uploads', name), buffer);
        return json(res, 200, { url: '/uploads/' + name });
      }
      return json(res, 404, { error: 'Ruta no encontrada' });
    }
    if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Método no permitido' });
    const base = route.startsWith('/uploads/') ? path.join(dataDir, 'uploads') : path.join(root, 'dist');
    const relative = decodeURIComponent(route.startsWith('/uploads/') ? route.slice(9) : route.slice(1));
    let file = path.resolve(base, relative || 'index.html');
    if (!file.startsWith(base + path.sep)) return json(res, 403, { error: 'Ruta no permitida' });
    if (['/', '/yucatecos', '/yucatecos/', '/admin', '/admin/', '/menu', '/menu/'].includes(route)) file = path.join(root, 'dist/index.html');
    let stats;
    try { stats = await fs.stat(file); if (!stats.isFile()) return json(res, 404, { error: 'No encontrado' }); } catch { return json(res, 404, { error: 'No encontrado' }); }
    const headers = { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': path.extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600', 'Accept-Ranges': 'bytes' };
    let start = 0, end = stats.size - 1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      start = match ? Number(match[1]) : -1;
      end = match?.[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1;
      if (start < 0 || start > end) { res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` }); return res.end(); }
      status = 206;
      headers['Content-Range'] = `bytes ${start}-${end}/${stats.size}`;
    }
    res.writeHead(status, { ...headers, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD' || !stats.size) return res.end();
    const stream = createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
  } catch (error) { console.error(error.message); if (!res.headersSent) json(res, error.status || (error instanceof SyntaxError ? 400 : 500), { error: error.status ? error.message : 'No se pudo procesar la solicitud' }); else res.end(); }
});
server.listen(Number(process.env.PORT || 3001), '0.0.0.0', () => {
  console.log('Trattoria: servidor listo en puerto ' + (process.env.PORT || 3001));
  console.log(`Catálogo cargado: ${initialized.source}, revisión ${catalog.revision}.`);
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
});
