import nodemailer from 'nodemailer';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const SENDER = 'trattorialapasta@gmail.com';
const sendScopes = new Set(['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.compose', 'https://www.googleapis.com/auth/gmail.modify', 'https://mail.google.com/']);

// Use the same OAuth refresh flow as the existing Railway application, over HTTPS only.
// Nodemailer builds MIME in memory; it never opens an SMTP connection here.
export function createGmailApiMailer(env, fetcher = fetch, now = () => Date.now()) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN || !env.GMAIL_USER) return null;
  if (env.GMAIL_USER.trim().toLowerCase() !== SENDER) throw new Error('GMAIL_USER debe ser trattorialapasta@gmail.com');
  const composer = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows', disableFileAccess: true, disableUrlAccess: true });
  let access = '', expires = 0, refreshing = null;
  async function request(url, options) {
    let response;
    try { response = await fetcher(url, { ...options, signal: AbortSignal.timeout(25000) }); }
    catch { throw new Error('No se pudo conectar con Gmail API por HTTPS. Intenta de nuevo.'); }
    let data;
    try { data = await response.json(); }
    catch { throw new Error('Google devolvió una respuesta inválida al consultar Gmail API.'); }
    return { response, data };
  }
  async function token() {
    if (access && expires > now() + 30000) return access;
    if (!refreshing) refreshing = (async () => {
      const { response, data } = await request(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' }).toString() });
      if (!response.ok || typeof data?.access_token !== 'string' || !data.access_token) {
        if (data?.error === 'invalid_grant') throw new Error('Google rechazó GMAIL_REFRESH_TOKEN. Revisa que pertenezca al mismo cliente OAuth y siga autorizado.');
        throw new Error('No se pudo autorizar Gmail API. Revisa GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y GMAIL_REFRESH_TOKEN.');
      }
      if (data.scope && !data.scope.split(' ').some(scope => sendScopes.has(scope))) throw new Error('El token de Google no tiene permiso para enviar correos mediante Gmail API.');
      access = data.access_token;
      expires = now() + (Number(data.expires_in) > 0 ? Number(data.expires_in) : 3600) * 1000;
      return access;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }
  return {
    mode: 'gmail-api',
    verify: async () => { await token(); return { ok: true }; },
    async send(message) {
      const mime = await composer.sendMail({ from: { name: 'Trattoria La Pasta · Reservas', address: SENDER }, to: SENDER, replyTo: message.replyTo,
        subject: message.subject, text: message.text, html: message.html });
      const raw = mime.message.toString('base64url');
      for (let attempt = 0; attempt < 2; attempt++) {
        const { response, data } = await request(SEND_URL, { method: 'POST', headers: { Authorization: 'Bearer ' + await token(), 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) });
        if (response.ok && typeof data?.id === 'string') return { id: data.id };
        if (response.status === 401 && attempt === 0) { access = ''; expires = 0; continue; }
        if (response.status === 403 || response.status === 429) throw new Error('Gmail API rechazó el envío. Revisa los permisos, que la API esté habilitada y la cuota de la cuenta.');
        throw new Error('Gmail API no pudo enviar el aviso. El envío quedará pendiente para reintentar.');
      }
    },
  };
}
