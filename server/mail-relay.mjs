const errors = {
  TOKEN_INVALIDO: 'La clave privada del correo no coincide entre Google y Railway.',
  CUOTA_AGOTADA: 'Google agotó la cuota de correo. El aviso seguirá pendiente para reintentar.',
  CUENTA_INCORRECTA: 'Publica el script desde trattorialapasta@gmail.com y ejecuta como propietario.',
  CONFIGURACION_INCOMPLETA: 'Configura MAIL_RELAY_TOKEN en las propiedades del script de Google.',
  ENVIO_FALLIDO: 'Google no pudo enviar el aviso. El envío se reintentará.',
};

export function createMailRelay(env, fetcher = fetch) {
  if (!env.MAIL_RELAY_URL || !env.MAIL_RELAY_TOKEN) return null;
  let url;
  try { url = new URL(env.MAIL_RELAY_URL); } catch { throw new Error('MAIL_RELAY_URL inválida'); }
  if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username || url.password || url.search || url.hash || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) throw new Error('MAIL_RELAY_URL debe ser la URL HTTPS de Google Apps Script terminada en /exec');
  if (!/^[a-f0-9]{64}$/i.test(env.MAIL_RELAY_TOKEN)) throw new Error('MAIL_RELAY_TOKEN debe contener 64 caracteres hexadecimales');
  async function call(data) {
    let response;
    try { response = await fetcher(url.href, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, token: env.MAIL_RELAY_TOKEN }), signal: AbortSignal.timeout(45000) }); }
    catch { throw new Error('No se pudo conectar con Google por HTTPS. Revisa el despliegue del script.'); }
    let result;
    try { result = await response.json(); } catch { throw new Error('Google no devolvió una respuesta válida. Publica la aplicación web con acceso para cualquier persona.'); }
    if (!response.ok || result?.ok !== true) throw new Error(errors[result?.error] || 'El servicio de correo de Google rechazó la solicitud.');
    return result;
  }
  return { mode: 'https', verify: () => call({ action: 'verify' }), send: message => call({ action: 'send', id: message.id, subject: message.subject, text: message.text, html: message.html, replyTo: message.replyTo }) };
}
