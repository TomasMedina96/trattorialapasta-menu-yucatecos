import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGmailApiMailer } from './gmail-api.mjs';
import { createMailer } from './reservations.mjs';

const env = { GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', GMAIL_REFRESH_TOKEN: 'test-refresh', GMAIL_USER: 'trattorialapasta@gmail.com' };
const reply = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const grant = { access_token: 'test-access', expires_in: 3600, scope: 'https://www.googleapis.com/auth/gmail.send' };
test('Gmail API refreshes via HTTPS and composes UTF-8 MIME with fixed recipient and reply-to', async () => {
  const calls = [];
  const mailer = createGmailApiMailer(env, async (url, options) => {
    calls.push({ url, options });
    return url.includes('oauth2') ? reply(grant) : reply({ id: 'google-message' });
  });
  await Promise.all([mailer.verify(), mailer.verify()]);
  assert.equal(calls.length, 1);
  const params = new URLSearchParams(calls[0].options.body);
  assert.equal(params.get('refresh_token'), env.GMAIL_REFRESH_TOKEN);
  assert.equal(params.get('grant_type'), 'refresh_token');
  const result = await mailer.send({ subject: 'Reserva miércoles · 2 personas', text: 'Texto español', html: '<p>Texto español</p>', replyTo: 'client@example.com' });
  assert.equal(result.id, 'google-message');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-access');
  const raw = JSON.parse(calls[1].options.body).raw;
  assert(!/[+/=]/.test(raw));
  const mime = Buffer.from(raw, 'base64url').toString('utf8');
  assert(mime.includes('To: trattorialapasta@gmail.com'));
  assert(mime.includes('Reply-To: client@example.com'));
  assert(mime.includes('multipart/alternative'));
  assert(mime.includes('=?UTF-8?'));
  assert(!mime.includes('ignored@example.com'));
  await mailer.send({ subject: 'Respuesta', text: 'Confirmada', html: '<p>Confirmada</p>', replyTo: 'trattorialapasta@gmail.com', to: 'client@example.com' });
  const clientMime = Buffer.from(JSON.parse(calls[2].options.body).raw, 'base64url').toString('utf8');
  assert(clientMime.includes('To: client@example.com'));
  assert(clientMime.includes('Reply-To: trattorialapasta@gmail.com'));
});
test('Gmail API has priority and incomplete OAuth never falls back silently to SMTP', () => {
  assert.equal(createMailer({ ...env, SMTP_USER: 'unused', SMTP_PASSWORD: 'unused', MAIL_RELAY_URL: 'unused', MAIL_RELAY_TOKEN: 'unused' }).mode, 'gmail-api');
  assert.equal(createMailer({ GOOGLE_CLIENT_ID: 'incomplete', SMTP_USER: 'unused', SMTP_PASSWORD: 'unused' }), null);
  assert.throws(() => createGmailApiMailer({ ...env, GMAIL_USER: 'someone@example.com' }), /GMAIL_USER/);
});
test('OAuth failure, absent send permission and network errors never expose secrets', async () => {
  const invalid = createGmailApiMailer(env, async () => reply({ error: 'invalid_grant', error_description: env.GMAIL_REFRESH_TOKEN }, 400));
  await assert.rejects(invalid.verify(), error => /rechazó/.test(error.message) && !error.message.includes(env.GMAIL_REFRESH_TOKEN));
  const scope = createGmailApiMailer(env, async () => reply({ ...grant, scope: 'openid' }));
  await assert.rejects(scope.verify(), /permiso/);
  const network = createGmailApiMailer(env, async () => { throw new Error(env.GOOGLE_CLIENT_SECRET); });
  await assert.rejects(network.verify(), error => !error.message.includes(env.GOOGLE_CLIENT_SECRET));
});
test('Expired access token is renewed and a 401 causes only one retry', async () => {
  let time = 0, grants = 0, sends = 0;
  const mailer = createGmailApiMailer(env, async url => {
    if (url.includes('oauth2')) { grants++; return reply({ ...grant, access_token: 'access-' + grants }); }
    sends++; return sends === 1 ? reply({}, 401) : reply({ id: 'sent' });
  }, () => time);
  await mailer.verify();
  time = 3600000;
  await mailer.verify();
  assert.equal(grants, 2);
  await mailer.send({ subject: 'Test', text: 'Test', html: '<p>Test</p>', replyTo: 'client@example.com' });
  assert.equal(grants, 3); assert.equal(sends, 2);
});
