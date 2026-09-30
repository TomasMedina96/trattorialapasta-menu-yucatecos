# Descubrir platillos

El acceso aparece después de los avisos de `.menu-intro` y antes de las secciones
del menú tradicional. La experiencia usa estado interno, sin modificar la URL
ni su historial. El menú permanece montado y bloqueado con `inert` mientras se
explora; al regresar conserva su posición y recupera el foco en el botón de entrada.

- `src/DiscoverMenu.tsx`: filtros derivados de las categorías existentes,
  IntersectionObserver, navegación por teclado y controles anterior/siguiente.
- `src/DiscoverProduct.tsx`: fotografía, precio vigente, recomendación,
  descripción breve y acceso al mismo modal de `App.tsx`.
- `src/discover.css`: scroll snap obligatorio, altura dinámica, safe areas,
  estilos móviles y disposición horizontal para pantallas bajas y anchas.
- `src/menuPresentation.ts`: formato compartido de precios y variantes de imagen.

Los productos se obtienen del catálogo persistente y del menú actual (`/` o
`/yucatecos`). Cada menú tiene su propia lista de imágenes y videos, con ruta,
producto asociado y estado activo/inactivo, configurados desde `/admin`.
Los precios corresponden al menú que se está viendo. Las novedades personalizadas
activas preceden a las fotos habituales de los productos seleccionados para el
feed; se evita repetir automáticamente los productos ya representados.
Solo el
producto actual y sus vecinos montan imágenes; esos recursos se cargan de forma
anticipada y el resto se carga progresivamente al navegar. Las fotografías usan
`object-fit: contain` para conservar el plato completo. Las fotos y descripciones
se comparten entre los menús. No se agregaron dependencias ni analytics.

## Validación

Verificación: `npm test`, `npm run typecheck` y `npm run build`.
Se comprobó en navegador móvil la separación de novedades entre menús, los
precios independientes, las imágenes compartidas y el panel de administración.

Antes de publicar, ejecutar `npm run build` y revisar en navegador:

1. Abrir Descubrir desde el menú y volver, comprobando posición y foco.
2. Deslizar en ambas direcciones, usar rueda, trackpad y flechas del teclado;
   comprobar que al detenerse hay un solo producto y que funcionan los extremos.
3. Cambiar la selección de novedades desde el administrador y confirmar que
   cada menú muestra únicamente sus productos activos seleccionados.
4. Abrir detalles de pizzas y pastas; comprobar extras, salsas, cierre,
   Escape y recorrido del foco con Tab; repetir desde el menú tradicional.
5. Probar 320×568, 390×844, Android, tablet, escritorio y orientación horizontal;
   revisar safe areas, barras móviles, zoom y cambio de tamaño.
6. En Network, comprobar carga de imágenes cercanas y ausencia de descarga
   de todas las imágenes grandes al abrir Descubrir.

Mejora futura opcional: conservar también categoría y producto de Descubrir
entre aperturas. Actualmente cada entrada comienza en Todos, primer producto.
