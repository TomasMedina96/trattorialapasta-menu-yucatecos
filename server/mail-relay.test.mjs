import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createMailRelay } from './mail-relay.mjs';
import { createMailer } from './reservations.mjs';
const env = { MAIL_RELAY_URL: 'https://script.google.com/macros/s/test-script/exec', MAIL_RELAY_TOKEN: 'a'.repeat(64) };
test('HTTPS relay takes precedence over SMTP, sends only to the script and verifies without sending', async () => {
  const calls = [];
  const relay = createMailRelay(env, async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ ok: true }) }; });
  await relay.verify();
  await relay.send({ id: 'TLP-' + randomUUID(), subject: 'Test', text: 'Test', html: '<p>Test</p>', replyTo: 'test@example.com' });
  assert.equal(relay.mode, 'https');
  assert.equal(calls[0].url, env.MAIL_RELAY_URL);
  assert.equal(JSON.parse(calls[0].options.body).action, 'verify');
  assert.equal(JSON.parse(calls[1].options.body).action, 'send');
  assert.equal(JSON.parse(calls[1].options.body).token, env.MAIL_RELAY_TOKEN);
  assert(!calls[0].url.includes(env.MAIL_RELAY_TOKEN));
  assert.equal(createMailer({ ...env, SMTP_USER: 'ignored', SMTP_PASSWORD: 'ignored' }).mode, 'https');
  assert.equal(createMailer({ MAIL_RELAY_URL: env.MAIL_RELAY_URL, SMTP_USER: 'ignored', SMTP_PASSWORD: 'ignored' }), null);
});
test('Relay rejects untrusted URLs and hides upstream/network details', async () => {
  for (const url of ['http://script.google.com/macros/s/id/exec', 'https://other.example/macros/s/id/exec', 'https://script.google.com/macros/s/id/dev', env.MAIL_RELAY_URL+'?token=secret']) assert.throws(() => createMailRelay({ ...env, MAIL_RELAY_URL: url }));
  const denied = createMailRelay(env, async () => ({ ok: true, json: async () => ({ ok: false, error: 'TOKEN_INVALIDO' }) }));
  await assert.rejects(denied.verify(), /no coincide/);
  const network = createMailRelay(env, async () => { throw new Error(env.MAIL_RELAY_TOKEN); });
  await assert.rejects(network.verify(), error => !error.message.includes(env.MAIL_RELAY_TOKEN));
  const html = createMailRelay(env, async () => ({ ok: true, json: async () => { throw new Error('login page'); } }));
  await assert.rejects(html.verify(), /respuesta válida/);
});
test('Apps Script rejects unauthorized senders, checks quota and deduplicates by reservation ID', async () => {
  const sent = [], properties = new Map([['MAIL_RELAY_TOKEN', env.MAIL_RELAY_TOKEN]]);
  let quota = 100, owner = 'trattorialapasta@gmail.com';
  const store = { getProperty: k => properties.get(k), setProperty: (k,v) => properties.set(k,v), getProperties: () => Object.fromEntries(properties), deleteProperty: k => properties.delete(k) };
  const context = vm.createContext({ console, Date, JSON, Object, PropertiesService: { getScriptProperties: () => store },
    Session: { getEffectiveUser: () => ({ getEmail: () => owner }) },
    MailApp: { getRemainingDailyQuota: () => quota, sendEmail: data => sent.push(data) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => text }) } });
  vm.runInContext(await readFile(new URL('../integrations/google-mail/Code.gs', import.meta.url), 'utf8'), context);
  const call = data => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(data) } }));
  const body = { token: env.MAIL_RELAY_TOKEN, action: 'send', id: 'TLP-' + randomUUID(), subject: 'Test', text: 'Test', html: '<p>Test</p>', replyTo: 'test@example.com', to: 'attacker@example.com' };
  assert.equal(call({ ...body, token: 'wrong' }).error, 'TOKEN_INVALIDO');
  assert(call({ token: env.MAIL_RELAY_TOKEN, action: 'verify' }).ok);
  assert.equal(sent.length, 0);
  assert(call(body).ok); assert(call(body).duplicate);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'trattorialapasta@gmail.com');
  quota = 0;
  assert.equal(call({ ...body, id: 'TLP-' + randomUUID() }).error, 'CUOTA_AGOTADA');
  owner = 'another@gmail.com';
  assert.equal(call({ token: env.MAIL_RELAY_TOKEN, action: 'verify' }).error, 'CUENTA_INCORRECTA');
});
