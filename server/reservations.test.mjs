import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { clock, createReservations, validateRequest, notification } from './reservations.mjs';

const now = new Date('2026-10-06T18:00:00Z'); // Tuesday, noon Mérida.
const config = { pausado: false, mensaje: '', bloqueos: [] };
const request = { fecha: '2026-10-07', hora: '20:00', pax: 2, mesa: '8', nombre: 'Cliente Prueba', telefono: '9991234567', email: 'prueba@example.com', comentarios: '' };
const payload = changes => ({ key: randomUUID(), website: '', data: { ...request, ...changes } });
async function fixture(t, options = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tlp-reservations-'));
  const service = await createReservations({ dataDir: dir, mailer: null, now: () => now, startWorker: false, ...options });
  t.after(async () => { service.close(); await fs.rm(dir, { recursive: true, force: true }); });
  return { service, dir };
}
test('Reservation rules reject bypasses and preserve original Mérida scheduling rules', () => {
  assert.deepEqual(clock(now), { date: '2026-10-06', minutes: 720 });
  assert.equal(validateRequest(request, config, now).zona, 'Terraza');
  assert.equal(validateRequest(request, config, now).telefono, '529991234567');
  assert.equal(validateRequest({ ...request, pax: 1 }, config, now).pax, 1);
  for (const invalid of [
    { fecha: '2026-10-09' }, { fecha: '2026-10-10' }, { fecha: '2026-10-11' },
    { fecha: '2026-10-05' }, { fecha: '2027-10-05' }, { fecha: '2026-02-30' }, { fecha: 'invalid' },
    { hora: 'xx:yy' }, { hora: '20:17' }, { hora: '12:30' }, { hora: '23:00' },
    { mesa: '<img onerror=alert(1)>' }, { pax: 6 }, { pax: 2.5 }, { pax: 7 },
    { email: 'wrong' }, { telefono: 'a' }, { nombre: 'a' }, { comentarios: 'x'.repeat(1501) },
  ]) assert.throws(() => validateRequest({ ...request, ...invalid }, config, now));
  assert.throws(() => validateRequest(request, { ...config, pausado: true }, now));
  assert.throws(() => validateRequest(request, { ...config, bloqueos: [{ fecha: request.fecha }] }, now));
  assert.throws(() => validateRequest({ ...request, fecha: '2026-10-06', hora: '14:30' }, config, new Date('2026-10-06T20:00:00Z')));
  assert.doesNotThrow(() => validateRequest({ ...request, fecha: '2026-10-06', hora: '15:00' }, config, new Date('2026-10-06T20:00:00Z')));
  assert.throws(() => validateRequest({ ...request, fecha: '2026-10-06' }, config, new Date('2026-10-06T14:59:00Z')));
  assert.throws(() => validateRequest(request, config, new Date('2026-10-06T23:00:00Z')));
  assert.doesNotThrow(() => validateRequest({ ...request, hora: '22:30' }, config, now));
});
test('Concurrent replay creates one durable request and rejects changed content', async t => {
  const { service, dir } = await fixture(t);
  const p = payload();
  const results = await Promise.all(Array.from({ length: 5 }, () => service.submit(p)));
  assert.equal(new Set(results.map(r => r.id)).size, 1);
  assert.equal(service.snapshot().solicitudes.length, 1);
  await assert.rejects(service.submit({ ...p, data: { ...p.data, hora: '20:30' } }), /cambió/);
  const reopened = await createReservations({ dataDir: dir, mailer: null, now: () => now, startWorker: false });
  assert.equal((await reopened.submit(p)).id, results[0].id);
  assert.equal(reopened.snapshot().solicitudes.length, 1);
  assert(!JSON.stringify(reopened.snapshot()).includes(p.key));
  reopened.close();
});
test('Failed email never loses or duplicates a request; durable retry sends later', async t => {
  let attempts = 0, failing = true;
  const mailer = { send: async () => { attempts++; if (failing) throw new Error('SMTP failed'); } };
  const { service, dir } = await fixture(t, { mailer });
  const p = payload(), result = await service.submit(p);
  await service.flush();
  assert.equal(service.snapshot().solicitudes[0].aviso.estado, 'pendiente');
  assert.equal((await service.submit(p)).id, result.id);
  failing = false;
  const reopened = await createReservations({ dataDir: dir, mailer, now: () => now, startWorker: false });
  await reopened.manage({ action: 'reintentar', id: result.id });
  await reopened.flush();
  assert.equal(reopened.snapshot().solicitudes[0].aviso.estado, 'enviado');
  assert.equal(reopened.snapshot().solicitudes.length, 1);
  assert.equal(attempts, 2);
  reopened.close();
});
test('Pause, blocked dates and status survive; overlapping acceptance needs explicit acknowledgement', async t => {
  const { service } = await fixture(t);
  await service.manage({ action: 'pausa', pausado: true, mensaje: '<img src=x>' });
  await assert.rejects(service.submit(payload()), /pausa/);
  await service.manage({ action: 'pausa', pausado: false, mensaje: '' });
  await service.manage({ action: 'bloquear', fecha: request.fecha, motivo: 'Evento' });
  await assert.rejects(service.submit(payload()), /disponible/);
  await service.manage({ action: 'desbloquear', fecha: request.fecha });
  const a = await service.submit(payload()), b = await service.submit(payload({ email: 'otro@example.com', hora: '20:30' }));
  assert.equal(service.snapshot().solicitudes[0].conflictos.length, 1);
  await service.manage({ action: 'estado', id: a.id, estado: 'aceptada' });
  await assert.rejects(service.manage({ action: 'estado', id: b.id, estado: 'aceptada' }), /conflicto/);
  await service.manage({ action: 'estado', id: b.id, estado: 'aceptada', confirmOverlap: true });
  await assert.rejects(service.manage({ action: 'estado', id: a.id, estado: '<img>' }), /inválido/);
});
test('Abuse limits, honeypot and input types are enforced', async t => {
  const { service } = await fixture(t);
  await assert.rejects(service.submit(null), /inválida/);
  await assert.rejects(service.submit({ ...payload(), website: 'bot' }), /permitida/);
  await assert.rejects(service.submit({ ...payload(), key: 'bad' }), /permitida/);
  for (let i = 0; i < 3; i++) await service.submit(payload());
  await assert.rejects(service.submit(payload()), /Demasiadas/);
});
test('Gmail connection check reports failure safely without exposing credentials or sending messages', async t => {
  let sends = 0;
  const { service } = await fixture(t, { mailer: { send: async () => { sends++; }, verify: async () => { throw new Error('secret-password'); } } });
  await assert.rejects(service.manage({ action: 'verificar-correo' }), error => error.status === 503 && !error.message.includes('secret-password'));
  assert.equal(sends, 0);
});
test('Accept and reject email the stored client and change status only after sending, without duplicate clicks', async t => {
  const sent = [];
  const { service } = await fixture(t, { mailer: { mode: 'gmail-api', send: async m => { sent.push(m); return { id: 'message-' + sent.length }; } } });
  const { id } = await service.submit(payload());
  await service.manage({ action: 'responder', id, estado: 'aceptada', to: 'attacker@example.com' });
  assert.equal(sent[0].to, request.email);
  assert.equal(sent[0].replyTo, 'trattorialapasta@gmail.com');
  assert(sent[0].text.includes('Te confirmamos'));
  assert.equal(service.snapshot().solicitudes[0].estado, 'aceptada');
  await service.manage({ action: 'responder', id, estado: 'aceptada' });
  assert.equal(sent.length, 1);
  await service.manage({ action: 'responder', id, estado: 'rechazada' });
  assert(sent[1].text.includes('Lamentablemente'));
  assert.equal(service.snapshot().solicitudes[0].estado, 'rechazada');
});
test('Failed client email preserves reservation status and allows explicit retry', async t => {
  let failing = true;
  const { service, dir } = await fixture(t, { mailer: { mode: 'gmail-api', send: async () => { if (failing) throw new Error('private-secret'); return { id: 'sent' }; } } });
  const { id } = await service.submit(payload());
  await assert.rejects(service.manage({ action: 'responder', id, estado: 'rechazada' }), e => e.status === 503 && !e.message.includes('private-secret'));
  assert.equal(service.snapshot().solicitudes[0].estado, 'pendiente');
  assert.equal(service.snapshot().solicitudes[0].respuesta.estado, 'fallida');
  failing = false;
  await service.manage({ action: 'responder', id, estado: 'rechazada' });
  const stored = JSON.parse(await fs.readFile(path.join(dir, 'reservations.json'), 'utf8'));
  assert.equal(stored.solicitudes[0].estado, 'rechazada');
  assert.equal(stored.solicitudes[0].respuesta.estado, 'enviada');
});
test('Concurrent clicks and manual status changes are blocked while a client response is sending', async t => {
  let started, finish;
  const began = new Promise(resolve => { started = resolve; });
  const wait = new Promise(resolve => { finish = resolve; });
  const { service } = await fixture(t, { mailer: { mode: 'gmail-api', send: async () => { started(); await wait; } } });
  const { id } = await service.submit(payload());
  const sending = service.manage({ action: 'responder', id, estado: 'aceptada' });
  await began;
  assert.equal(service.snapshot().solicitudes[0].estado, 'pendiente');
  await assert.rejects(service.manage({ action: 'responder', id, estado: 'rechazada' }), /enviando/);
  await assert.rejects(service.manage({ action: 'estado', id, estado: 'rechazada' }), /termine/);
  finish(); await sending;
  assert.equal(service.snapshot().solicitudes[0].estado, 'aceptada');
});
test('Mail safely escapes user text, preserves reply links and highlights table conflicts', () => {
  const r = { ...validateRequest({ ...request, nombre: '<img src=x>' }, config, now), id: 'test', estado: 'pendiente' };
  const mail = notification(r, [{ ...r, id: 'other', hora: '20:30' }], 'https://example.com');
  assert(!mail.html.includes('<img src=x>'));
  assert(mail.html.includes('&lt;img src=x&gt;'));
  assert(mail.html.includes('Aceptar por WhatsApp'));
  assert(mail.html.includes('Rechazar por correo'));
  assert(mail.html.includes('Atención:'));
});
test('Reservation HTTP endpoints require auth for management and enforce origin and body size', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tlp-reservations-http-'));
  const child = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, PORT: '3196', DATA_DIR: dir, BOOTSTRAP_DIR: '', SMTP_USER: '', SMTP_PASSWORD: '', RAILWAY_ENVIRONMENT_ID: '', ADMIN_USER: 'test-admin', ADMIN_PASSWORD: 'test-password' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => { child.kill(); await once(child, 'exit').catch(() => {}); await fs.rm(dir, { recursive: true, force: true }); });
  let ready = false;
  for (let i=0;i<100;i++) { try { const r = await fetch('http://127.0.0.1:3196/api/reservations'); if(r.ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 50)); }
  assert(ready);
  const url = 'http://127.0.0.1:3196', headers = { 'X-Requested-With': 'TrattoriaAdmin' };
  assert.equal((await fetch(url+'/api/reservations/manage')).status, 401);
  assert.equal((await fetch(url+'/api/reservations', {method:'POST',body:'{}'})).status, 403);
  assert.equal((await fetch(url+'/api/reservations',{method:'POST',headers:{...headers,Origin:'https://other.example'},body:'{}'})).status,403);
  assert.equal((await fetch(url+'/api/reservations',{method:'POST',headers,body:JSON.stringify({data:'x'.repeat(9000)})})).status,413);
  const login = await fetch(url+'/api/login',{method:'POST',headers,body:JSON.stringify({username:'test-admin',password:'test-password'})});
  assert.equal(login.status,200);
  const admin = {...headers, Cookie: login.headers.get('set-cookie').split(';')[0]};
  assert.equal((await fetch(url+'/api/reservations/manage',{headers:admin})).status,200);
  assert.equal((await fetch(url+'/api/reservations/manage',{method:'POST',headers:admin,body:JSON.stringify({action:'pausa',pausado:true,mensaje:'Vacaciones'})})).status,200);
  const publicConfig = await (await fetch(url+'/api/reservations')).json();
  assert(publicConfig.config.pausado); assert.equal(publicConfig.plan.mesas.length,29);
  assert(!JSON.stringify(publicConfig).includes('SMTP'));
});
