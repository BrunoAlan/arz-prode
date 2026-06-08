# Páginas de error coherentes con la app

**Fecha:** 2026-06-07
**Estado:** Aprobado

## Problema

La app no tiene ninguna página de error custom. Next 16 usa sus defaults (sin
estilo, sin nav, en inglés). Las superficies sin cubrir:

1. **404 / ruta inexistente** — falta `app/not-found.tsx`.
2. **Error de runtime** en una página (ej. falla una query) — falta `app/error.tsx`.
3. **Error a nivel raíz** (falla el layout) — falta `app/global-error.tsx`.
4. **Errores de Auth.js OAuth** — caen en la página default de `/api/auth/error`
   (fea) en vez de la home con el banner ya existente.

## Objetivo

Que toda superficie de error use el mismo lenguaje visual que la app (pill,
`font-display`, tokens `muted-foreground`/`primary`, `animate-rise`, `Button`),
en español, con una acción clara (volver / reintentar).

## Decisiones de diseño

- **Componente compartido** `StatusScreen` para no duplicar estilo.
- Auth.js: rutear `pages.error` a la home y reusar el banner `LoginError`
  existente, en vez de crear otra página.
- Next 16: el prop de retry del error boundary es **`unstable_retry`**, NO
  `reset`. (Breaking change respecto de versiones anteriores.)

## Cambios

### 1. `src/components/StatusScreen.tsx` (nuevo)

Componente presentacional puro (sin hooks → usable desde server y client
components). Modelado sobre el hero de `app/page.tsx` para que matcheen.

```tsx
StatusScreen({
  eyebrow?: string,      // texto del pill (ej. "Error 404")
  title: string,         // heading display grande
  description?: string,  // texto muted
  children?: ReactNode,  // slot de acciones (botón/link)
})
```

Markup: columna centrada (`min-h-[70vh] flex flex-col items-center justify-center
text-center`), pill `rounded-full border bg-card px-3 py-1 text-xs font-medium
text-muted-foreground`, título `font-display text-5xl font-semibold
tracking-tight`, descripción `text-muted-foreground`, slot de acciones. Usar
`animate-rise` con delays escalonados como en la home.

### 2. `src/app/not-found.tsx` (nuevo, server component)

```
eyebrow "Error 404" · title "Página no encontrada"
description: explica que la página no existe.
acción: <Link href="/" className={buttonVariants({ size: "lg" })}>Volver al inicio</Link>
```

Nota: `Button` (de `@base-ui/react`) no tiene `asChild`. Para acciones de
navegación se estila un `<Link>` con `buttonVariants()` (exportado por
`ui/button`). Para acciones con `onClick` (reintentar) se usa `<Button>`.

Vive dentro del root layout → muestra el nav si hay sesión. El link a `/` es
seguro: la home redirige a `/predicciones` si estás logueado.

### 3. `src/app/error.tsx` (nuevo, client component)

```tsx
"use client";
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) { ... }
```

- `useEffect` que hace `console.error(error)`.
- `StatusScreen`: eyebrow "Algo salió mal", title "Tuvimos un problema",
  description genérica.
- Acción: `<Button onClick={() => unstable_retry()}>Reintentar</Button>`.

Vive dentro del root layout → nav visible si hay sesión.

### 4. `src/app/global-error.tsx` (nuevo, client component, self-contained)

Reemplaza el root layout: debe declarar su propio `<html>`/`<body>` e importar
`./globals.css`. Sin fuente Bricolage (cae a la del sistema; aceptable por ser el
caso raro y recomendado por los docs).

```tsx
"use client";
import "./globals.css";
// <html lang="es"><body className="min-h-screen bg-background font-sans
//   text-foreground antialiased"><main className="mx-auto max-w-3xl px-4 py-8">
//   <StatusScreen .../></main></body></html>
```

Mismo contenido que `error.tsx` (título "Algo salió mal", botón Reintentar).

### 5. `src/auth.config.ts` (mod)

```ts
pages: { signIn: "/", error: "/" },
```

Efecto: `/api/auth/error?error=CODE` redirige a `/?error=CODE`, donde el banner
`LoginError` muestra el mensaje. `loginErrorMessage` ya mapea `AccessDenied` →
mensaje de dominio y cualquier otro código → mensaje genérico, así que los
códigos OAuth (`Configuration`, `OAuthCallback`, etc.) ya quedan cubiertos.

## Unidades y responsabilidades

| Unidad | Qué hace | Depende de |
|---|---|---|
| `StatusScreen.tsx` (nuevo) | layout visual centrado reusable | `Button`, tokens |
| `not-found.tsx` (nuevo) | UI 404 | `StatusScreen`, `Link` |
| `error.tsx` (nuevo) | boundary de runtime + retry | `StatusScreen`, `unstable_retry` |
| `global-error.tsx` (nuevo) | fallback de layout, self-contained | `StatusScreen`, `globals.css` |
| `auth.config.ts` (mod) | rutea errores Auth.js a la home | — |

## Testing y verificación

- `loginErrorMessage` ya tiene tests (sin cambios de lógica).
- `StatusScreen` es presentacional: verificación visual.
- Visual con screenshots:
  - `/ruta-inexistente` → 404 estilado.
  - `/api/auth/error?error=AccessDenied` → redirige a home con banner.
- `tsc --noEmit` y `eslint` limpios.

## Fuera de alcance

- Refactor del hero de la home para usar `StatusScreen` (ya matchean por diseño).
- Mensaje propio para `Configuration` (el genérico alcanza; YAGNI).
- `global-not-found.js` experimental (la app tiene un solo root layout).
