# Reservas en el proyecto

## Uso

- `/reservas`: formulario de solicitudes integrado con el navbar. El formulario y el plano provienen del ZIP final; el contenido está aislado del CSS del menú.
- `/admin?reservas=1`: gestión con el mismo usuario, contraseña y sesión del administrador actual. También se accede con **Administrar reservas** desde `/admin`.
- Las solicitudes se guardan como pendientes. El encargado abre el mensaje preparado de WhatsApp o correo, lo envía y después marca la solicitud como aceptada o rechazada.
- El plano muestra capacidad compatible, no disponibilidad en tiempo real. El panel y los correos avisan cuando hay solicitudes de la misma mesa a menos de dos horas. Si ya existe otra aceptada, confirmar el conflicto explícitamente permite aceptar también la nueva, conservando la decisión del encargado.
- El administrador permite pausar/reactivar solicitudes, configurar el mensaje de pausa, bloquear/desbloquear fechas, buscar solicitudes, consultar el plano y reintentar avisos pendientes.
- El panel consulta cambios cada 30 segundos mientras permanece abierto.

## Reglas conservadas

Zona horaria: `America/Merida`. Reservas de lunes a jueves; de 1 a 6 personas; capacidad exacta de mesa salvo que una persona usa mesa de dos. Servicio de 13:00 a 22:30 en intervalos de 30 minutos. Para hoy, solicitudes de 9:00 a antes de 17:00 con al menos 60 minutos hasta la llegada. Después de las 17:00 tampoco se acepta solicitar para mañana. Máximo 60 días de anticipación. Confirmación manual y tolerancia de diez minutos descrita en el mensaje al cliente.

La liberación física de la mesa por retraso la gestiona el encargado; el sistema no tiene control de llegadas ni elimina automáticamente solicitudes aceptadas. Estas condiciones coinciden con el flujo recibido.

## Correo y Railway

La opción recomendada es **Gmail API con OAuth por HTTPS**, igual que el otro proyecto Railway del restaurante. No necesita Apps Script, Google Sheets, un cambio de plan ni contraseña de aplicación. Se renueva el token de acceso usando el refresh token y se llama a `users.messages.send`.

Variables privadas del servicio:

```dotenv
GOOGLE_CLIENT_ID=el_mismo_cliente_del_proyecto_que_ya_envia
GOOGLE_CLIENT_SECRET=el_secreto_de_ese_cliente
GMAIL_REFRESH_TOKEN=el_refresh_token_asociado_a_ese_cliente_y_cuenta
GMAIL_USER=trattorialapasta@gmail.com
```

Copiar los valores de forma privada entre los servicios de Railway, sin pegarlos en el chat ni en Git. El token debe estar autorizado para enviar con la cuenta del restaurante y corresponder al mismo cliente OAuth. El proyecto de Google debe tener Gmail API habilitada, como en el proyecto que ya funciona. No hace falta regenerar un token válido únicamente por utilizarlo también en este servicio.

Los avisos se envían al mismo correo y `Reply-To` apunta al correo del cliente. Cada aviso contiene datos, plano, advertencias de conflicto, mensajes preparados de aceptar/rechazar y acceso al administrador. El texto y asunto se generan como MIME con codificación UTF-8 y se envían en base64url.

Después de desplegar debe aparecer **Envío de avisos: Gmail API por HTTPS**. Pulsar **Comprobar conexión con Gmail** para verificar OAuth; no envía mensajes. Luego verificar la llegada efectiva mediante una solicitud controlada. Si hay avisos pendientes, **Reintentar aviso** adelanta su próximo intento.

Orden de prioridad: Gmail API (las cuatro variables anteriores), Apps Script (`MAIL_RELAY_URL` + `MAIL_RELAY_TOKEN`), SMTP (`SMTP_USER` + `SMTP_PASSWORD`). Si se configura parcialmente un método de mayor prioridad, se considera incompleto; no vuelve a otro método silenciosamente.

Apps Script queda como alternativa opcional: [guía de Gmail por HTTPS mediante un script](integrations/google-mail/README.md). SMTP usa TLS en el puerto 465. Ninguna de estas alternativas es necesaria al configurar Gmail API.

`PUBLIC_SITE_URL` es opcional y define el origen HTTPS para los enlaces e imágenes de los avisos. Si no está, se usa `RAILWAY_PUBLIC_DOMAIN`; en su ausencia se usa `https://trattorialapasta.com`. Debe coincidir con el dominio que sirve esta versión del proyecto, sin barra final.

**SMTP requiere Railway Pro o superior.** Railway bloquea SMTP en Free, Trial y Hobby. Tener las credenciales configuradas no elimina ese bloqueo. En esos planes es necesario autorizar Gmail mediante una API HTTPS o usar otro proveedor compatible antes de poder enviar avisos. Fuente: https://docs.railway.com/networking/outbound-networking

El botón **Comprobar conexión con Gmail** en el administrador comprueba la autorización desde el servidor sin enviar mensajes. En modo Gmail API renueva el acceso OAuth y comprueba el permiso de envío cuando Google devuelve los scopes; no demuestra por sí solo la entrega ni sustituye la prueba real.

Los avisos pendientes se intentan cada 30 segundos, hasta diez por ciclo. Si falla el envío, se reintenta con espera creciente hasta una hora. La solicitud queda guardada y el cliente recibe su número; un fallo SMTP no le invita a volver a registrar la solicitud. Si falta configuración, las solicitudes y los avisos pendientes se conservan para cuando se configure.

El registro es independiente del correo. Ante una interrupción del proceso justo después de entregar el correo y antes de guardar el estado, un aviso podría reenviarse con el mismo identificador. Esto no duplica la solicitud.

## Almacenamiento y despliegue

Se usa `DATA_DIR/reservations.json` en el mismo volumen persistente del menú. Escrituras serializadas y sustitución atómica; mantener **una sola instancia**, igual que el almacenamiento actual del catálogo. Respaldar todo `DATA_DIR`, incluyendo `menu.json`, `reservations.json` y `uploads/`.

El primer arranque crea el archivo de reservas sin modificar el catálogo. No se requiere Google Sheets ni un sitio externo en Netlify. Apps Script se utiliza únicamente si se elige esa alternativa; Gmail API no lo necesita. El Dockerfile instala las dependencias de ejecución y copia el plano al servidor.

Fuente de mesas: `data/reservations-plan.json` (29 mesas). Renderizador: `public/reservas/plano-config.js`. Imágenes por mesa: `public/reservas/mapa/`. Si se modifica el plano posteriormente, actualizar también las imágenes de correo.

## API

- `GET /api/reservations`: configuración pública, reglas y plano; no expone datos de clientes ni credenciales.
- `POST /api/reservations`: registrar una solicitud. Requiere el encabezado del cliente, origen permitido, clave UUID para evitar duplicados y datos válidos. Tamaño máximo 8 KB. El servidor deriva la zona de la mesa; no confía en lo enviado por el navegador.
- `GET /api/reservations/manage` y `POST /api/reservations/manage`: consulta y acciones protegidas por la sesión del administrador.
- Límites del proceso: diez solicitudes por IP/hora, tres por correo/hora y sesenta en total/hora. Los reintentos de la misma clave y datos devuelven el mismo identificador. Los límites se reinician al reiniciar el proceso; el registro y la cola de avisos se conservan.

## Verificación realizada

`npm test` verifica reglas, intentos de saltarse el formulario, solicitudes simultáneas, persistencia, pausa, bloqueos, estados, acceso, protección de origen, límites, HTML seguro y recuperación de fallos de correo con transporte simulado. `npm run build` compila React y TypeScript.

Se probó en navegador el recorrido navbar → personas → fecha/hora → mesa → datos → registro, login del administrador, aceptación, pausa/reactivación y ajuste de altura en PC, móvil y tablet. Las pruebas locales usan credenciales y solicitudes ficticias y no envían correos reales.

La configuración privada de Railway y la entrega real por Gmail no se comprobaron desde el entorno local. La integración está lista en el repositorio; este trabajo no despliega automáticamente cambios en Railway.
