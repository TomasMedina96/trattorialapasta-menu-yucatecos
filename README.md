# Trattoria La Pasta — dos menús y administración

React + Vite + TypeScript con un servidor Node.js (sin dependencias adicionales) para guardar el catálogo y las imágenes para todos los visitantes.

## Rutas

- `/`: menú normal, 121 productos importados del archivo proporcionado.
- `/yucatecos`: menú especial, conserva los 40 productos y precios yucatecos anteriores.
- `/admin`: administración. También hay un enlace discreto al final de cada menú.
- `/menu`: alias del menú normal para enlaces anteriores.

Los productos comparten nombre, descripción, imagen y categoría. Cada menú tiene su propio precio, disponibilidad, recomendación y selección de novedades estilo TikTok. Un producto desactivado no aparece en el menú ni en su feed. Si el producto asociado a una imagen o video está desactivado, esa novedad también se oculta. No se inventaron precios para los productos que no estaban en Yucatecos: se activan desde el panel después de asignarles un precio.

## Ejecutar

Requiere Node.js 20 o superior y las dependencias instaladas (`npm install`).

En desarrollo, ejecutar en dos terminales:

```powershell
npm run server
```

```powershell
npm run dev
```

Vite sirve la interfaz en el puerto 5173 y reenvía `/api` y `/uploads` al servidor del puerto 3001.

Para producción o una vista previa completa:

```powershell
npm run build
npm start
```

Abrir `http://localhost:3001`. `PORT` permite cambiar el puerto. El servidor atiende las rutas directas `/yucatecos` y `/admin`, las imágenes y los videos. `npm run preview` solo sirve archivos estáticos; usar `npm start` para probar también la administración.

## Acceso y edición

Credenciales fijas solicitadas, definidas solamente en `server/index.mjs`:

- Usuario: `admin`
- Contraseña: `Trattoria2026!`

El servidor valida el acceso y emite una cookie HttpOnly con una sesión de ocho horas. En producción con HTTPS, configurar `NODE_ENV=production` para que la cookie sea Secure. Las sesiones terminan si se reinicia el servidor.

1. Entrar a Administración y elegir **Menú normal** o **Menú Yucatecos**.
2. Buscar o agregar un producto, filtrando por **Todos**, **Activos** o **Inactivos** en el menú seleccionado. Editar los campos compartidos, el precio y la disponibilidad. Los productos nuevos comienzan desactivados y sin precios. **Activo**, **Mostrar en novedades** y **Recomendado de la casa** son opciones independientes: cambiar una no modifica las otras ni sus valores en el otro menú. Es posible recomendar un producto inactivo o todavía sin precio; para activarlo sí debe tener un precio válido.
3. Administrar la lista **Novedades estilo TikTok** de cada menú: agregar imágenes o videos, editar su título, ruta/URL HTTPS y producto asociado, guardar, desactivar y reactivar. Admite subir imágenes de hasta 6 MB y videos MP4 de hasta 50 MB. Las novedades activas aparecen primero en el orden guardado; después, las fotos habituales de los productos marcados en **Mostrar en novedades** que no estén ya representados por una novedad personalizada. Al desactivar una novedad, no se borra su archivo ni se desmarca la opción del producto. No se trata de una integración con cuentas externas de TikTok.
4. Cambiar fotos mediante URL HTTPS/ruta o subir JPG, PNG y WebP de hasta 6 MB. La misma foto se muestra en ambos menús.
5. Administrar **Avisos emergentes**: agregar, editar y guardar avisos con título, texto, imagen opcional y destino (**Menú normal**, **Menú Yucatecos** o **Ambos menús**). Solo puede haber **un aviso activo en total**. Activar uno desactiva automáticamente el anterior. Los inactivos se conservan y pueden reactivarse después.
6. Pulsar **Publicar cambios**. Los cambios se ven al abrir la página; las páginas abiertas consultan actualizaciones cada 30 segundos. Los conflictos entre sesiones se rechazan para evitar sobrescrituras.

El botón **Desactivar página Yucatecos** guarda de inmediato. Si hay cambios pendientes, publicarlos primero. Desactivar la página conserva su contenido y muestra un enlace al menú normal. El mismo botón permite reactivarla.

### Eliminar contenido

Cada editor tiene un botón **Eliminar**. La eliminación es lógica: se conservan los registros, las fotos y los videos, pero el elemento desaparece del sitio y de la lista de administración al publicar los cambios.

- **Productos:** se eliminan únicamente del menú seleccionado, incluyendo su aparición en novedades automáticas y publicaciones vinculadas. El otro menú conserva el producto, sus precios y sus opciones. Las publicaciones vinculadas permanecen guardadas, con un aviso de que su producto está eliminado.
- **Novedades:** se elimina únicamente la publicación seleccionada del menú actual. El producto y las publicaciones del otro menú no se alteran. La foto automática del producto puede seguir apareciendo si tiene marcada la opción **Mostrar en novedades**.
- **Avisos emergentes:** su eliminación es global, independientemente del menú desde el que se editen o del destino configurado.

Los catálogos anteriores reciben automáticamente las marcas de eliminación en `false`, conservando todo su contenido visible. Desactivar sigue siendo la opción para retirar temporalmente contenido y reactivarlo desde la lista; eliminar lo oculta también de esa lista.

## Persistencia y despliegue

Para actualizar el servicio existente de Railway conservando los cambios locales, seguir [RAILWAY.md](RAILWAY.md). El `Dockerfile` prepara Node 22, ejecuta las pruebas y compila la interfaz. Incluye el snapshot inicial de `data/bootstrap/`; solo se importa en un volumen sin catálogo guardado. `/api/health` verifica la interfaz compilada y el acceso al almacenamiento.

`data/menu.seed.json` contiene el catálogo inicial, los precios normales suministrados por el usuario y los precios yucatecos conservados. La primera ejecución lo carga si todavía no existe un catálogo guardado.

Los catálogos de la primera versión se actualizan automáticamente al cargarse: el aviso anterior se conserva como aviso para el menú normal y cada video de portada se convierte en una novedad activa de su menú. La siguiente publicación guarda el formato nuevo, conservando precios, fotos y descripciones.

Las recomendaciones que antes eran compartidas se conservan inicialmente en ambos menús. Desde esta versión, cada menú guarda su recomendación por separado.

El servidor guarda los cambios de forma atómica en `data/runtime/menu.json` y las fotos en `data/runtime/uploads/`. La carpeta está excluida de Git. Se puede cambiar usando `DATA_DIR`.

**El despliegue necesita un servidor Node y un disco persistente.** En Railway, por ejemplo, montar un volumen en `/data` y configurar `DATA_DIR=/data`, build `npm run build` y arranque `npm start`. Usar una sola instancia del servidor con este almacenamiento en archivos. Un despliegue puramente estático de `dist/` no puede guardar cambios. Respaldar todo `DATA_DIR`, tanto el JSON como las imágenes. No borrar los datos al desplegar una nueva versión.

## Verificación

```powershell
npm run typecheck
npm test
npm run build
```

Las pruebas verifican importación, migración de catálogos anteriores, precios independientes, autenticación, validación, conflictos, un solo aviso activo, destinos, carga de imágenes y MP4, disponibilidad y persistencia tras reiniciar el servidor. Usan un directorio temporal aislado y el puerto 3197.
