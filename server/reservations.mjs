import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import nodemailer from 'nodemailer';

export const plan = JSON.parse(await fs.readFile(new URL('../data/reservations-plan.json', import.meta.url), 'utf8'));
export const rules = { daysAhead: 60, sameDayMargin: 60, timezone: 'America/Merida' };
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const text = (value, max, label, required = true) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) fail(`Revisa ${label}`);
  return value.trim();
};
export function clock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: rules.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
function dateNumber(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Fecha inválida');
  const date = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) fail('Fecha inválida');
  return date;
}
export function validateRequest(input, config, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('Revisa los datos de la solicitud');
  const date = dateNumber(input.fecha), current = clock(now);
  const days = Math.round((date - dateNumber(current.date)) / 86400000);
  if (days < 0 || days > rules.daysAhead) fail('Selecciona una fecha dentro de los próximos 60 días');
  if ([0, 5, 6].includes(date.getUTCDay())) fail('Viernes, sábado y domingo no tomamos reservas');
  if (days === 0 && (current.minutes < 540 || current.minutes >= 1020)) fail('Para hoy solo tomamos solicitudes entre 9:00 y 17:00');
  if (days === 1 && current.minutes >= 1020) fail('Para mañana se puede solicitar a partir de las 9:00');
  if (config.pausado) fail('Las reservas están en pausa');
  if (config.bloqueos.some(b => b.fecha === input.fecha)) fail('Día no disponible');
  if (typeof input.hora !== 'string' || !/^\d{2}:(00|30)$/.test(input.hora)) fail('Horario inválido');
  const [h, m] = input.hora.split(':').map(Number), minutes = h * 60 + m;
  if (minutes < 780 || minutes > 1350 || (days === 0 && minutes < current.minutes + rules.sameDayMargin)) fail('Ese horario ya no se puede solicitar');
  if (!Number.isInteger(input.pax) || input.pax < 1 || input.pax > 6) fail('Se permiten de 1 a 6 personas');
  const table = plan.mesas.find(t => t.id === input.mesa);
  if (!table || table.cap !== (input.pax === 1 ? 2 : input.pax)) fail('La mesa no corresponde a la cantidad de personas');
  const nombre = text(input.nombre, 120, 'el nombre');
  if (nombre.length < 3) fail('Escribe tu nombre y apellido');
  const telefono = text(input.telefono, 15, 'el WhatsApp');
  if (!/^\d{10,15}$/.test(telefono)) fail('WhatsApp inválido');
  const email = text(input.email, 254, 'el correo').toLowerCase();
  if (!/^[^\s@<>"\\]+@[^\s@<>"\\]+\.[^\s@<>"\\]+$/.test(email)) fail('Correo inválido');
  return { fecha: input.fecha, hora: input.hora, pax: input.pax, mesa: table.id, zona: plan.zonas.find(z => z.id === table.zona).nombre, nombre, telefono: telefono.length === 10 ? '52' + telefono : telefono, email, comentarios: text(input.comentarios ?? '', 1500, 'los comentarios', false) };
}
export function conflicts(request, list) {
  const minutes = r => Number(r.hora.slice(0, 2)) * 60 + Number(r.hora.slice(3));
  return list.filter(r => r.id !== request.id && r.fecha === request.fecha && r.mesa === request.mesa && r.estado !== 'rechazada' && Math.abs(minutes(r) - minutes(request)) < 120);
}
export function createMailer(env = process.env) {
  if (!env.SMTP_USER || !env.SMTP_PASSWORD) return null;
  const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD.replace(/\s/g, '') },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
    disableFileAccess: true, disableUrlAccess: true });
  return { send: message => transport.sendMail({ ...message, from: { name: 'Trattoria La Pasta · Reservas', address: env.SMTP_USER }, to: 'trattorialapasta@gmail.com' }), verify: () => transport.verify() };
}
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function notification(record, list, siteUrl) {
  const overlap = conflicts(record, list);
  const warning = overlap.length ? `Atención: ${overlap.length} solicitud(es) para esta mesa a menos de 2 horas: ${overlap.map(r => `${r.id} ${r.hora} (${r.estado})`).join(', ')}.` : '';
  const lines = [`Nueva solicitud ${record.id}`, `${record.fecha} · ${record.hora} · ${record.pax} personas`, `Mesa ${record.mesa} · ${record.zona}`, `Nombre: ${record.nombre}`, `WhatsApp: +${record.telefono}`, `Correo: ${record.email}`, `Comentarios: ${record.comentarios || '—'}`, warning];
  const manager = siteUrl ? `${siteUrl}/admin?reservas=1` : '';
  const image = siteUrl ? `${siteUrl}/reservas/mapa/${encodeURIComponent(record.mesa)}.png` : '';
  const formatted = new Date(record.fecha + 'T12:00:00Z').toLocaleDateString('es-MX', { timeZone: rules.timezone, weekday: 'long', day: 'numeric', month: 'long' });
  const accepted = `Hola ${record.nombre.split(' ')[0]}! Te confirmamos tu reserva en Trattoria La Pasta:\n📅 ${formatted} a las ${record.hora} h\n👥 ${record.pax} personas\n📍 Mesa ${record.mesa} · ${record.zona}\n\nTe esperamos en Paseo de Montejo. Mantenemos la mesa 10 minutos después de la hora reservada; pasado ese tiempo se libera.\n¡Grazie! 🇮🇹`;
  const rejected = `Hola ${record.nombre.split(' ')[0]}, gracias por tu solicitud para el ${formatted} a las ${record.hora} h.\nLamentablemente no tenemos disponible la mesa ${record.mesa} en ese horario. Si querés, respondé este mensaje con otra hora u otra mesa y lo revisamos.\nUn saludo, Trattoria La Pasta`;
  const buttons = [[true, accepted], [false, rejected]].map(([accept, message]) => {
    const label = accept ? 'Aceptar' : 'Rechazar';
    const wa = `https://wa.me/${record.telefono}?text=${encodeURIComponent(message)}`;
    const mail = `mailto:${encodeURIComponent(record.email)}?subject=${encodeURIComponent(accept ? 'Reserva confirmada · Trattoria La Pasta' : 'Sobre tu solicitud de reserva')}&body=${encodeURIComponent(message)}`;
    return `<p><a href="${esc(wa)}">${label} por WhatsApp</a> · <a href="${esc(mail)}">${label} por correo</a></p>`;
  }).join('');
  return { subject: `Reserva ${record.fecha} ${record.hora} · ${record.pax}p · Mesa ${record.mesa} · ${record.id}`, replyTo: record.email,
    text: lines.join('\n') + `\n\nGestionar solicitudes: ${manager || '/admin?reservas=1'}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;color:#172128"><h2>Nueva solicitud de reserva</h2>${lines.filter(Boolean).map(line => `<p>${esc(line)}</p>`).join('')}${image ? `<img src="${esc(image)}" alt="Plano de mesa ${esc(record.mesa)}" width="580" style="width:100%;max-width:580px">` : ''}${buttons}${manager ? `<p><a href="${esc(manager)}">Gestionar solicitudes y marcar el estado</a></p>` : ''}<p>Enviar el mensaje no cambia el estado. Márcalo en el administrador después de responder.</p></div>` };
}

// Same single-instance model as the menu: serialize every read-modify-write and rename atomically.
export async function createReservations({ dataDir, mailer = createMailer(), now = () => new Date(), siteUrl = '', startWorker = true }) {
  const file = path.join(dataDir, 'reservations.json');
  let state;
  try { state = JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; state = { version: 1, config: { pausado: false, mensaje: '', bloqueos: [] }, solicitudes: [] }; }
  if (state.version !== 1 || !Array.isArray(state.solicitudes) || !Array.isArray(state.config?.bloqueos)) throw new Error('Almacenamiento de reservas inválido');
  let queue = Promise.resolve();
  const transaction = fn => {
    const action = queue.then(async () => {
      const draft = structuredClone(state), result = fn(draft);
      await fs.writeFile(file + '.tmp', JSON.stringify(draft, null, 2));
      await fs.rename(file + '.tmp', file); state = draft; return result;
    });
    queue = action.catch(() => {}); return action;
  };
  if (!await fs.stat(file).catch(() => null)) await transaction(() => {});
  const rates = new Map();
  const publicConfig = () => ({ ok: true, config: structuredClone(state.config), rules, plan });
  const snapshot = () => ({ solicitudes: structuredClone(state.solicitudes).reverse().map(({ key, fingerprint, ...r }) => ({ ...r, conflictos: conflicts(r, state.solicitudes).map(c => ({ id: c.id, hora: c.hora, estado: c.estado })) })), config: structuredClone(state.config), correoConfigurado: !!mailer });
  let delivering = false;
  async function flush() {
    if (!mailer || delivering) return;
    delivering = true;
    try {
      for (const item of state.solicitudes.filter(r => r.aviso.estado !== 'enviado' && r.aviso.proximo <= now().getTime()).slice(0, 10)) {
        try {
          await mailer.send(notification(item, state.solicitudes, siteUrl));
          await transaction(d => { const r = d.solicitudes.find(r => r.id === item.id); r.aviso = { estado: 'enviado', intentos: r.aviso.intentos + 1, proximo: 0, enviado: now().toISOString() }; });
        } catch {
          await transaction(d => { const r = d.solicitudes.find(r => r.id === item.id); r.aviso = { estado: 'pendiente', intentos: r.aviso.intentos + 1, proximo: now().getTime() + Math.min(3600000, 60000 * 2 ** Math.min(r.aviso.intentos, 6)) }; });
        }
      }
    } finally { delivering = false; }
  }
  const timer = startWorker ? setInterval(() => { void flush().catch(() => console.error('No se pudo actualizar la cola de avisos de reservas')); }, 30000) : null;
  timer?.unref();
  return {
    publicConfig, snapshot, flush, close: () => { if (timer) clearInterval(timer); },
    async submit(payload, ip = 'local') {
      if (!payload || typeof payload !== 'object' || !payload.data || typeof payload.data !== 'object') fail('Solicitud inválida');
      if (typeof payload.key !== 'string' || !/^[a-f0-9-]{36}$/i.test(payload.key) || payload.website) fail('Solicitud no permitida');
      // Replays succeed even after the request window closes; changed content cannot reuse a key.
      const fingerprint = createHash('sha256').update(JSON.stringify(payload.data)).digest('hex');
      return transaction(d => {
        const existing = d.solicitudes.find(r => r.key === payload.key);
        if (existing) { if (existing.fingerprint !== fingerprint) fail('La solicitud cambió. Intenta de nuevo.', 409); return { ok: true, id: existing.id }; }
        const data = validateRequest(payload.data, d.config, now());
        const time = now().getTime();
        for (const [k, v] of rates) if (v.until <= time) rates.delete(k);
        const keys = [['ip:' + ip, 10], ['email:' + data.email, 3], ['total', 60]];
        for (const [k, limit] of keys) if ((rates.get(k)?.count || 0) >= limit) fail('Demasiadas solicitudes. Intenta más tarde o contacta al restaurante.', 429);
        const id = 'TLP-' + randomUUID();
        d.solicitudes.push({ ...data, id, key: payload.key, fingerprint, creado: now().toISOString(), estado: 'pendiente', respondido: '', aviso: { estado: 'pendiente', intentos: 0, proximo: 0 } });
        for (const [k] of keys) { const rate = rates.get(k) || { count: 0, until: time + 3600000 }; rate.count++; rates.set(k, rate); }
        return { ok: true, id };
      });
    },
    async manage(payload) {
      if (!payload || typeof payload !== 'object') fail('Acción inválida');
      if (payload.action === 'verificar-correo') {
        if (!mailer?.verify) fail('El correo no está configurado', 503);
        try { await mailer.verify(); return { ok: true }; }
        catch { fail('No se pudo conectar o autenticar con Gmail. Revisa las variables SMTP y que Railway permita conexiones SMTP.', 503); }
      }
      const result = await transaction(d => {
        if (payload.action === 'estado') {
          if (!['pendiente', 'aceptada', 'rechazada'].includes(payload.estado)) fail('Estado inválido');
          const r = d.solicitudes.find(r => r.id === payload.id);
          if (!r) fail('Solicitud no encontrada', 404);
          if (payload.estado === 'aceptada' && conflicts(r, d.solicitudes).some(c => c.estado === 'aceptada') && payload.confirmOverlap !== true) fail('Ya hay una reserva aceptada para esa mesa a menos de 2 horas. Revisa y confirma el conflicto.', 409);
          r.estado = payload.estado; r.respondido = now().toISOString();
        } else if (payload.action === 'pausa') {
          if (typeof payload.pausado !== 'boolean') fail('Pausa inválida');
          d.config.pausado = payload.pausado; d.config.mensaje = text(payload.mensaje ?? '', 500, 'el mensaje', false);
        } else if (payload.action === 'bloquear' || payload.action === 'desbloquear') {
          dateNumber(payload.fecha);
          d.config.bloqueos = d.config.bloqueos.filter(b => b.fecha !== payload.fecha);
          if (payload.action === 'bloquear') d.config.bloqueos.push({ fecha: payload.fecha, motivo: text(payload.motivo ?? '', 200, 'el motivo', false) });
        } else if (payload.action === 'reintentar') {
          const r = d.solicitudes.find(r => r.id === payload.id);
          if (!r) fail('Solicitud no encontrada', 404);
          if (r.aviso.estado !== 'enviado') r.aviso.proximo = 0;
        } else fail('Acción desconocida');
        return { ok: true };
      });
      return result;
    },
  };
}
