# Preparar el despliegue existente de Railway

Servicio: `trattorialapasta-menu-yucatecos` · Entorno: `production`.
Repositorio: `TomasMedina96/trattorialapasta-menu-yucatecos` · Rama local: `main`.
Dominio detectado: `trattorialapasta.com`.

La consulta inicial del servicio no mostró un volumen conectado ni `DATA_DIR` configurado. Hay que resolverlo antes de desplegar esta versión. Este documento no implica que la configuración remota ya se haya modificado.

## 1. Preparar el servicio antes del push

En Railway, abrir el servicio de Trattoria del proyecto existente:

| Configuración | Valor |
| --- | --- |
| Root Directory | Raíz del repositorio (`/`) |
| Builder | Dockerfile; Railway detecta `Dockerfile` en la raíz |
| Dockerfile Path | `Dockerfile`, si se solicita |
| Custom Build Command | Vacío; el Dockerfile instala, prueba y compila |
| Custom Start Command | Vacío para usar el `CMD`, o `node server/index.mjs` |
| Healthcheck Path | `/api/health` |
| Healthcheck Timeout | 120 segundos |
| Réplicas | 1 en una sola región |
| Restart Policy | On Failure |
| Dominio existente / Target Port | 3001 |

No dejar el arranque anterior con `vite`, `vite preview`, `serve` o un servidor que solo atienda archivos estáticos. Esta versión sirve la página, la API y los archivos desde el mismo proceso Node.

Crear un **Volume**, conectarlo a **este servicio**, con **Mount Path `/data`**. No montarlo sobre `/app`, `/app/dist` ni `/app/data`, porque ocultaría los archivos de la imagen. El volumen se monta al arrancar, no durante el build ni en un pre-deploy.

En **Variables**, definir:

```dotenv
NODE_ENV=production
DATA_DIR=/data
PORT=3001
```

`BOOTSTRAP_DIR=/app/data/bootstrap` ya viene en la imagen. `RAILWAY_VOLUME_MOUNT_PATH` lo define Railway cuando conecta el volumen; no hay que crearlo manualmente. El servidor rechaza un despliegue Railway si falta el volumen o `DATA_DIR` apunta fuera de él.

El puerto explícito evita conservar por accidente el target port del servidor estático anterior. Mantener el dominio y HTTPS. La cookie de administración usa `Secure` en producción.

Si el push a `main` dispara automáticamente el deploy, completar primero el volumen y los ajustes. Revisar los cambios pendientes de Railway antes de aplicarlos. Un servicio con volumen puede tener una pausa breve al reemplazar un despliegue.

## 2. Conservar los cambios hechos en desarrollo

Se preparó `data/bootstrap/` con la revisión 57 del administrador local: 121 productos, 2 avisos, las listas de novedades y 4 archivos subidos. Contiene también los estados independientes y las eliminaciones lógicas. No modifica `data/runtime/`.

Si haces más cambios locales antes del primer push, vuelve a ejecutar:

```powershell
npm run deploy:snapshot
```

El comando valida el catálogo y la existencia de los archivos locales. Es una copia inicial deliberadamente incluida en Git; revisarla junto con el commit. `data/runtime/`, `.tmp/` y `.env` siguen excluidos.

En el primer arranque, si `/data/menu.json` no existe, se copian el catálogo y los archivos iniciales a `/data`. En los siguientes arranques o despliegues se usa **siempre el catálogo persistente**, sin sobrescribirlo con el snapshot ni con `menu.seed.json`. Si un catálogo persistente está dañado, el servidor falla y no lo reemplaza silenciosamente.

Después del primer despliegue, editar desde el administrador de producción. Los cambios locales posteriores no se sincronizan mediante push: los cambios de código y los datos del volumen son independientes. No eliminar el volumen ni `/data/menu.json` para actualizar la aplicación.

## 3. Verificar y preparar el commit

```powershell
npm test
npm run build
docker build --tag trattoria-railway-check:local .
npm run deploy:check
git status --short
git diff --check
```

La prueba con Docker utiliza Node 22/Linux, un contenedor con nombre propio, el puerto local 3199 y datos aislados en `.tmp/production-check-*`. Comprueba rutas, API, cookies, copia inicial, archivos, guardado, reinicio y reemplazo del contenedor conservando el volumen. No conecta a Railway ni cambia datos locales del administrador. Requiere Docker Desktop con el motor Linux funcionando.

Si Docker no está disponible, `node scripts/check-production.mjs --native` comprueba esas operaciones con el Node instalado y procesos locales en modo producción. Esa alternativa no valida la construcción de la imagen Linux.

El commit debe incluir todos los cambios de la aplicación, `server/`, `scripts/`, `Dockerfile`, `.dockerignore`, `data/menu.seed.json` y **todo `data/bootstrap/`**, incluyendo sus imágenes. No subir únicamente los archivos que Git marca como modificados: también hay carpetas nuevas.

Después de revisar lo que se incluirá:

```powershell
git add .
git diff --cached --stat
git commit -m "Prepare dual menus and persistent admin for Railway"
git push origin main
```

Estos comandos se dejan como instrucciones; la preparación no hace el push automáticamente.

## 4. Comprobar el despliegue

1. En Build Logs debe aparecer la construcción desde Dockerfile, las pruebas y `vite build` completados.
2. En Deploy Logs debe aparecer `servidor listo en puerto 3001` y `copia inicial de desarrollo, revisión 57` en el primer arranque (o la revisión del snapshot actualizado).
3. Abrir `https://trattorialapasta.com/api/health`: debe responder `{"ok":true}`.
4. Abrir directamente `/`, `/yucatecos` y `/admin`; recargar cada ruta.
5. Entrar al administrador con las credenciales existentes. Verificar precios, fotos, avisos, novedades y los estados que se configuraron localmente.
6. Hacer un cambio de prueba reversible y subir una imagen. Reiniciar el servicio y confirmar que ambos persisten. Deshacer el cambio de prueba desde el administrador.

Las sesiones de administración están en memoria: después de un reinicio o despliegue hay que iniciar sesión nuevamente; el catálogo y los archivos permanecen en el volumen.

Activar respaldos del volumen desde **Backups**, preferentemente diarios, y crear un respaldo antes de cambios importantes. Respaldar todo `/data`, no solo `menu.json`. Los backups consumen almacenamiento de Railway. Usar una sola réplica: este backend guarda el catálogo en un archivo y no está diseñado para escrituras desde múltiples procesos.

## Referencias oficiales

- [Dockerfiles en Railway](https://docs.railway.com/builds/dockerfiles)
- [Volúmenes persistentes](https://docs.railway.com/volumes)
- [Healthchecks](https://docs.railway.com/deployments/healthchecks)
- [Backups de volúmenes](https://docs.railway.com/volumes/backups)
