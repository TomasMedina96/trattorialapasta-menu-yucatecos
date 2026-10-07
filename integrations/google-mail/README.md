# Gmail por HTTPS, sin cambiar el plan de Railway

Esta es una alternativa opcional. Para utilizar las credenciales OAuth del otro proyecto que ya envía correos, configurar **Gmail API directamente** según [RESERVAS.md](../../RESERVAS.md); no hace falta crear este script.

Este script envía únicamente los avisos desde `trattorialapasta@gmail.com` a esa misma cuenta. Las reservas y su administrador permanecen en nuestro servidor. No utiliza Google Sheets ni despliega otro sitio web.

## 1. Crear el script en la cuenta del restaurante

1. Abrir https://script.google.com/home/start con **trattorialapasta@gmail.com**.
2. Nombrar el proyecto **Avisos Reservas Trattoria**.
3. Reemplazar el contenido inicial de `Code.gs` con el archivo [Code.gs](Code.gs) de esta carpeta y guardar.
4. Generar una clave privada aleatoria de 64 caracteres hexadecimales. Si tienes Node instalado, ejecutar en tu propia terminal:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Conservarla de forma privada; no incluirla en el código, Git, el chat ni la URL.
5. En **Configuración del proyecto → Propiedades del script**, agregar:
   - Propiedad: `MAIL_RELAY_TOKEN`
   - Valor: la clave generada.
6. Volver al editor, seleccionar **autorizarCorreo** y pulsar **Ejecutar**. Autorizar el acceso con la cuenta del restaurante. Esta función no envía mensajes. Google puede mostrar una advertencia de aplicación sin verificar por tratarse de un proyecto propio; comprobar la cuenta y el proyecto antes de conceder permisos.

## 2. Publicar el punto de envío

1. **Implementar → Nueva implementación → Aplicación web**.
2. **Ejecutar como:** Yo (`trattorialapasta@gmail.com`).
3. **Quién tiene acceso:** Cualquier persona. Esto permite la conexión del servidor sin una sesión Google; el script rechaza toda operación sin la clave privada correcta y solo envía a la cuenta fija del restaurante.
4. Implementar y copiar la URL que termina en **`/exec`**. No usar `/dev`.

## 3. Configurar Railway

En las variables privadas del servicio agregar ambas:

```dotenv
MAIL_RELAY_URL=https://script.google.com/macros/s/ID_DE_IMPLEMENTACION/exec
MAIL_RELAY_TOKEN=la_misma_clave_de_las_propiedades_del_script
```

Desplegar la versión que incluye estos archivos y aplicar las nuevas variables. La URL y la clave tienen prioridad sobre SMTP; las variables `SMTP_USER` y `SMTP_PASSWORD` pueden eliminarse. La contraseña de aplicación de Gmail no se utiliza en esta modalidad. Si se elimina, también se puede revocar en la cuenta Google cuando ya no la necesite ningún otro servicio.

Si se configura solo una de las dos variables nuevas, el envío se considera incompleto y permanece pendiente. No se vuelve automáticamente a SMTP.

## 4. Comprobar

1. Entrar a `/admin?reservas=1`.
2. Debe aparecer **Envío de avisos: Gmail por HTTPS**.
3. Pulsar **Comprobar conexión con Gmail**. Comprueba la clave, la cuenta propietaria y la autorización sin enviar mensajes.
4. Hacer una solicitud de prueba y comprobar la recepción del aviso. Si ya hay avisos pendientes, el servidor reintentará su envío. **Reintentar aviso** adelanta el siguiente intento.

La conexión y entrega real solo se pueden confirmar después de autorizar/publicar el script y configurar Railway. No se han realizado desde el entorno local.

## Operación

- El endpoint acepta POST por HTTPS, con clave privada dentro del cuerpo. El navegador nunca recibe esa clave.
- Los identificadores enviados durante los últimos 30 días se conservan en las propiedades del script para evitar reenviar un aviso si Railway repite la petición después de perder la respuesta.
- No se puede garantizar un envío exactamente una vez si Google se interrumpe entre enviar el correo y guardar el identificador. La solicitud de reserva conserva su mismo ID.
- Si Google agota su cuota de correo, el aviso permanece pendiente y se reintenta posteriormente. Para una cuenta Gmail personal, la cuota documentada de Apps Script es de 100 destinatarios por día, compartida con otros scripts de la cuenta.
- Para actualizar `Code.gs`, guardar y publicar **una nueva versión de la implementación existente**; así se conserva la URL de Railway.
- El botón de comprobar conexión confirma acceso al script, no que un destinatario haya recibido efectivamente un correo.

Referencias oficiales: [Apps Script como aplicación web](https://developers.google.com/apps-script/guides/web), [MailApp](https://developers.google.com/apps-script/reference/mail/mail-app), [Cuotas de Google](https://developers.google.com/apps-script/guides/services/quotas), [Restricción SMTP de Railway](https://docs.railway.com/networking/outbound-networking).
