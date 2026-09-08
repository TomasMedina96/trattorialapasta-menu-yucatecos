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

Los 40 productos y 8 categorías se obtienen del adaptador existente. Solo el
producto actual y sus vecinos montan imágenes; esos recursos se cargan de forma
anticipada y el resto se carga progresivamente al navegar. Las fotografías usan
`object-fit: contain` para conservar el plato completo. No se agregan dependencias,
servicios, analytics ni cambios a datos o precios.

## Validación

Comprobados: TypeScript, existencia de ambas variantes de imagen para los 40
productos y orden del acceso respecto a restricciones y secciones.
El proyecto no tiene scripts de lint ni pruebas automatizadas.
El build de Vite quedó bloqueado por `spawn EPERM` del sandbox; no se autorizó
la ejecución fuera de él. La verificación visual en navegador está pendiente.

Antes de publicar, ejecutar `npm run build` y revisar en navegador:

1. Abrir Descubrir desde el menú y volver, comprobando posición y foco.
2. Deslizar en ambas direcciones, usar rueda, trackpad y flechas del teclado;
   comprobar que al detenerse hay un solo producto y que funcionan los extremos.
3. Filtrar cada categoría y confirmar reinicio en el primer producto.
4. Abrir detalles de pizzas y pastas; comprobar extras, salsas, cierre,
   Escape y recorrido del foco con Tab; repetir desde el menú tradicional.
5. Probar 320×568, 390×844, Android, tablet, escritorio y orientación horizontal;
   revisar safe areas, barras móviles, zoom y cambio de tamaño.
6. En Network, comprobar carga de imágenes cercanas y ausencia de descarga
   de todas las imágenes grandes al abrir Descubrir.

Mejora futura opcional: conservar también categoría y producto de Descubrir
entre aperturas. Actualmente cada entrada comienza en Todos, primer producto.
