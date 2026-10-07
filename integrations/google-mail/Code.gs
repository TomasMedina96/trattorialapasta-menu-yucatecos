/* Avisos de reservas TLP. No guarda reservas ni utiliza Google Sheets.
 * Publicar desde trattorialapasta@gmail.com, ejecutar como propietario.
 * Configurar MAIL_RELAY_TOKEN (64 caracteres hexadecimales) en Propiedades del script.
 */
var MAIL_ADDRESS = 'trattorialapasta@gmail.com';

function respuesta(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return respuesta({ ok: false, error: 'POST_REQUERIDO' }); }

function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 96000) return respuesta({ ok: false, error: 'DATOS_INVALIDOS' });
    var data = JSON.parse(e.postData.contents);
    if (!data || typeof data !== 'object') return respuesta({ ok: false, error: 'DATOS_INVALIDOS' });
    var properties = PropertiesService.getScriptProperties();
    var secret = properties.getProperty('MAIL_RELAY_TOKEN');
    if (!secret || !/^[a-f0-9]{64}$/i.test(secret)) return respuesta({ ok: false, error: 'CONFIGURACION_INCOMPLETA' });
    if (typeof data.token !== 'string' || data.token !== secret) return respuesta({ ok: false, error: 'TOKEN_INVALIDO' });
    if (Session.getEffectiveUser().getEmail().toLowerCase() !== MAIL_ADDRESS) return respuesta({ ok: false, error: 'CUENTA_INCORRECTA' });
    if (data.action === 'verify') return respuesta({ ok: true, quota: MailApp.getRemainingDailyQuota() });
    if (data.action !== 'send' || typeof data.id !== 'string' || !/^TLP-[a-f0-9-]{36}$/i.test(data.id) ||
      typeof data.subject !== 'string' || !data.subject || data.subject.length > 250 || /[\r\n]/.test(data.subject) ||
      typeof data.text !== 'string' || data.text.length > 6000 ||
      typeof data.html !== 'string' || data.html.length > 40000 ||
      typeof data.replyTo !== 'string' || data.replyTo.length > 254 || !/^[^\s@<>"\\]+@[^\s@<>"\\]+\.[^\s@<>"\\]+$/.test(data.replyTo)) return respuesta({ ok: false, error: 'DATOS_INVALIDOS' });
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var key = 'sent_' + data.id;
      if (properties.getProperty(key)) return respuesta({ ok: true, duplicate: true });
      if (MailApp.getRemainingDailyQuota() < 1) return respuesta({ ok: false, error: 'CUOTA_AGOTADA' });
      MailApp.sendEmail({ to: MAIL_ADDRESS, subject: data.subject, body: data.text, htmlBody: data.html, replyTo: data.replyTo, name: 'Trattoria La Pasta · Reservas' });
      properties.setProperty(key, String(Date.now()));
      // Keep delivery identifiers for 30 days without growing the property store indefinitely.
      var all = properties.getProperties(), cutoff = Date.now() - 30 * 86400000;
      Object.keys(all).forEach(function(k) { if (k.indexOf('sent_') === 0 && Number(all[k]) < cutoff) properties.deleteProperty(k); });
      return respuesta({ ok: true });
    } finally { lock.releaseLock(); }
  } catch (error) { return respuesta({ ok: false, error: 'ENVIO_FALLIDO' }); }
}

// Ejecutar una vez desde el editor para autorizar la cuenta. No envía ningún correo.
function autorizarCorreo() {
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== MAIL_ADDRESS) throw new Error('Abre el proyecto con ' + MAIL_ADDRESS);
  Logger.log('Permiso de envío autorizado. Destinatarios restantes hoy: ' + MailApp.getRemainingDailyQuota());
}
