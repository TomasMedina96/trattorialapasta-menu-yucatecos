# Trattoria La Pasta — Menú Yucateco

Menú web estático construido con **React + Vite + TypeScript**. No usa backend, base de datos ni variables de entorno.

Está preparado para trabajar directamente con **Node.js 21.7.2 + npm 10.5.0**, que es el entorno local actual. Para no generar advertencias `EBADENGINE`, el proyecto usa **Vite 5.4.21** y `@vitejs/plugin-react 4.3.4`, fijados a versiones compatibles con Node 21.

## Ejecutar en local

Si vienes de otra versión del proyecto, elimina primero `node_modules` y `package-lock.json` para no conservar dependencias de Next.js o Vite 8.

En PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npm run dev
```

Vite mostrará la URL local, normalmente:

```text
http://localhost:5173
```

Para abrirlo desde otro dispositivo de la misma red:

```powershell
npm run dev -- --host
```

## Verificar antes de producción

```powershell
npm run typecheck
npm run build
npm run preview
```

El build de producción queda en `dist/`.

## Arquitectura

- `src/App.tsx`: página, categorías, tarjetas y modal.
- `src/styles.css`: diseño y responsive.
- `src/data/menu.json`: categorías, productos, precios y textos.
- `src/data/menu.ts`: adaptación tipada de los datos.
- `public/menu/`: imágenes WebP optimizadas en tamaño de tarjeta y tamaño de modal.
- `public/trattoria-logo.webp`: logotipo optimizado.
- `public/menu-background-clean.webp`: fondo principal.

## Rendimiento

- SPA completamente estática: no hay renderizado en servidor por cada visita.
- Build minificado de Vite.
- Imágenes WebP optimizadas.
- Imágenes de 480 px para tarjetas y versiones grandes solo cuando hacen falta.
- `srcset`, `loading="lazy"` y `decoding="async"`.
- Precarga de recursos críticos del primer viewport.
- Sin Next.js, servidor Node, base de datos ni variables de entorno en producción.
- `dist/` puede servirse directamente desde una CDN, que es lo apropiado para absorber muchas visitas concurrentes.

## Versiones fijadas

El proyecto fija las herramientas de desarrollo para evitar que `npm install` suba automáticamente a una versión que deje de aceptar Node 21:

- Vite `5.4.21`
- `@vitejs/plugin-react` `4.3.4`
- TypeScript `5.8.3`

React se mantiene en la versión usada por el menú; esto no cambia el diseño ni la lógica.

## GitHub

```powershell
git init
git add .
git commit -m "Initial commit - Trattoria La Pasta menu"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

## Despliegue

En un hosting de sitios estáticos:

- Build command: `npm run build`
- Output directory: `dist`
- Variables de entorno: ninguna

Node se usa solamente para desarrollar/compilar. El menú publicado es estático y puede servirse desde CDN sin mantener un proceso Node atendiendo las visitas.
