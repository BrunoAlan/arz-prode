# Páginas de error coherentes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el 404, los errores de runtime, el error global y los errores de Auth.js OAuth usen el mismo lenguaje visual que la app, en español, con acción clara.

**Architecture:** Un componente presentacional compartido `StatusScreen` (modelado sobre el hero de la home) que reusan las tres páginas de error de Next. Los errores de Auth.js se rutean a la home (`pages.error: "/"`) para reusar el banner `LoginError` ya existente.

**Tech Stack:** Next.js 16 (App Router, file conventions `not-found`/`error`/`global-error`), React 19, Auth.js v5 beta, Tailwind v4, `@base-ui/react` Button, lucide-react.

**Notas clave de Next 16 (breaking changes vs. training data):**
- El prop de retry del error boundary es **`unstable_retry`**, NO `reset`.
- `global-error.tsx` reemplaza el root layout: necesita su propio `<html>`/`<body>` y `import "./globals.css"`.
- `Button` (de `@base-ui/react`) no tiene `asChild`; para navegación se estila un `<Link>` con `buttonVariants()`.

---

### Task 1: Componente compartido `StatusScreen`

**Files:**
- Create: `src/components/StatusScreen.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
import type { ReactNode } from "react";

/**
 * Pantalla de estado centrada (404, error, etc.). Presentacional puro: sin
 * hooks, usable desde server y client components. Modelado sobre el hero de
 * app/page.tsx para mantener coherencia visual.
 */
export function StatusScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center text-center">
      {eyebrow && (
        <span className="animate-rise mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" /> {eyebrow}
        </span>
      )}
      <h1
        className="animate-rise font-display text-5xl font-semibold tracking-tight"
        style={{ animationDelay: "60ms" }}
      >
        {title}
      </h1>
      {description && (
        <p
          className="animate-rise mt-4 max-w-md text-lg text-muted-foreground"
          style={{ animationDelay: "120ms" }}
        >
          {description}
        </p>
      )}
      {children && (
        <div className="animate-rise mt-8" style={{ animationDelay: "180ms" }}>
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatusScreen.tsx
git commit -m "feat: componente StatusScreen para pantallas de estado/error"
```

---

### Task 2: Página 404 (`not-found.tsx`)

**Files:**
- Create: `src/app/not-found.tsx`

- [ ] **Step 1: Crear la página**

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusScreen } from "@/components/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      eyebrow="Error 404"
      title="Página no encontrada"
      description="La página que buscás no existe o se movió. Volvé al inicio para seguir."
    >
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        Volver al inicio
      </Link>
    </StatusScreen>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación visual**

Levantar dev server (`npm run dev`), navegar a `http://localhost:3000/ruta-que-no-existe`, screenshot.
Expected: pill "Error 404", título "Página no encontrada", botón "Volver al inicio", nav arriba si hay sesión.

- [ ] **Step 4: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat: página 404 (not-found) estilada"
```

---

### Task 3: Error boundary de runtime (`error.tsx`)

**Files:**
- Create: `src/app/error.tsx`

- [ ] **Step 1: Crear la página**

```tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/StatusScreen";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      eyebrow="Algo salió mal"
      title="Tuvimos un problema"
      description="Ocurrió un error inesperado. Probá de nuevo en un momento."
    >
      <Button size="lg" onClick={() => unstable_retry()}>
        Reintentar
      </Button>
    </StatusScreen>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores. (Confirma que `unstable_retry` es el prop correcto en Next 16.)

- [ ] **Step 3: Commit**

```bash
git add src/app/error.tsx
git commit -m "feat: error boundary de runtime estilado"
```

---

### Task 4: Error global (`global-error.tsx`)

**Files:**
- Create: `src/app/global-error.tsx`

- [ ] **Step 1: Crear la página**

Reemplaza el root layout, por eso declara su propio `<html>`/`<body>` e importa los estilos globales. Sin fuente Bricolage (cae a la del sistema; aceptable por ser el caso raro).

```tsx
"use client";

import "./globals.css";
import { Button } from "@/components/ui/button";
import { StatusScreen } from "@/components/StatusScreen";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <main className="mx-auto max-w-3xl px-4 py-8">
          <StatusScreen
            eyebrow="Error"
            title="Algo salió mal"
            description="Ocurrió un error inesperado. Probá de nuevo en un momento."
          >
            <Button size="lg" onClick={() => unstable_retry()}>
              Reintentar
            </Button>
          </StatusScreen>
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores nuevos (el único error de lint preexistente es en `LocalTime.tsx`).

- [ ] **Step 3: Commit**

```bash
git add src/app/global-error.tsx
git commit -m "feat: global-error estilado (fallback de layout)"
```

---

### Task 5: Rutear errores de Auth.js a la home

**Files:**
- Modify: `src/auth.config.ts:6`

- [ ] **Step 1: Agregar `error` a `pages`**

Cambiar:

```ts
  pages: { signIn: "/" },
```

por:

```ts
  pages: { signIn: "/", error: "/" },
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación visual**

Con el dev server arriba, navegar a `http://localhost:3000/api/auth/error?error=AccessDenied`, screenshot.
Expected: redirige a `/?error=AccessDenied` y muestra el banner `LoginError` de dominio (@arzion). Probar también `?error=Configuration` → banner genérico.

- [ ] **Step 4: Commit**

```bash
git add src/auth.config.ts
git commit -m "feat: rutear errores de Auth.js a la home (reusa banner LoginError)"
```

---

### Task 6: Verificación final

- [ ] **Step 1: Suite completa**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: tests verdes, tsc limpio, lint sin errores nuevos.

- [ ] **Step 2: Limpiar artefactos**

Borrar cualquier screenshot temporal generado en la verificación (no debe quedar en el repo).

- [ ] **Step 3: Merge a main local (sin push)**

```bash
git checkout main
git merge <rama> --ff-only
```

Confirmar con el usuario antes de pushear.

---

## Self-Review

- **Cobertura del spec:** 404 (Task 2), error runtime (Task 3), global-error (Task 4), Auth.js OAuth incl. `/api/auth/error` (Task 5), componente compartido (Task 1). ✅
- **Sin placeholders:** todos los pasos tienen el código/comando completo. ✅
- **Consistencia de tipos:** `StatusScreen({ eyebrow?, title, description?, children? })` se usa igual en Tasks 2/3/4; `unstable_retry: () => void` idéntico en 3 y 4; `buttonVariants` importado de `@/components/ui/button` (existe). ✅
