# Vista "Por fecha" por defecto con la fecha actual seleccionada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `/predicciones` y `/admin` muestren por defecto la vista "Por fecha", con la fecha actual resaltada en la barra de navegación y la página posicionada (auto-scroll) en esa sección.

**Architecture:** Una función pura nueva (`getActiveDayKey`) calcula qué día está "activo" a partir de las secciones por día. Dos componentes nuevos consumen ese dato: `DaySectionNav` (server) resalta el pill activo, y `ScrollToActiveSection` (client) hace scroll a esa sección en el mount. Ambas páginas invierten el default del toggle y usan estos componentes.

**Tech Stack:** Next.js 16.2.7 (App Router, `searchParams` como `Promise`), React 19, TypeScript estricto, vitest, Tailwind.

## Global Constraints

- Esta versión de Next entrega `searchParams` como `Promise`; siempre `await searchParams`. Ante dudas de API, consultar `node_modules/next/dist/docs/` antes de escribir código (ver `AGENTS.md`).
- Zona horaria de referencia para días: `America/Argentina/Buenos_Aires` (vía `dayKey`/`formatDay` de `src/lib/format.ts`). Argentina no aplica DST: offset fijo UTC-3.
- Tests: `npm test` (vitest run). Lint: `npm run lint`. Typecheck: `npx tsc --noEmit` (tsconfig tiene `noEmit: true`).
- TypeScript `strict: true`, pero **sin** `noUncheckedIndexedAccess`: `section.matches[0]` está tipado como `T` (no `T | undefined`).
- Compatibilidad de links: `?orden=fecha` debe seguir dando la vista por fecha (no romper bookmarks).
- Branch de trabajo: `feat/vista-por-fecha-por-defecto` (ya creada; la spec ya está commiteada ahí).

---

### Task 1: Función `getActiveDayKey` (lógica del día activo)

**Files:**
- Modify: `src/lib/group-matches.ts` (agregar función exportada al final)
- Test: `src/lib/group-matches.test.ts` (agregar describe block)

**Interfaces:**
- Consumes: `MatchSection<T>` y `Groupable` (ya definidos en `group-matches.ts`); `dayKey` (ya importado en ese archivo desde `./format`).
- Produces: `export function getActiveDayKey<T extends Groupable>(sections: MatchSection<T>[], now: Date): string | null`. Devuelve el `key` de la sección activa (formato `dia-YYYY-MM-DD`) o `null` si no hay secciones.

- [ ] **Step 1: Escribir los tests que fallan**

En `src/lib/group-matches.test.ts`, cambiar la línea de import para incluir la función nueva:

```ts
import { groupMatches, groupMatchesByDay, getActiveDayKey } from "./group-matches";
```

Y agregar al final del archivo:

```ts
describe("getActiveDayKey", () => {
  it("devuelve la sección de hoy cuando hoy tiene partidos", () => {
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-17T19:00:00Z"),
      m("group", "B", "2026-06-18T19:00:00Z"),
      m("group", "C", "2026-06-19T19:00:00Z"),
    ]);
    // 2026-06-18T15:00Z = 12:00 del 18 en BA
    expect(getActiveDayKey(secs, new Date("2026-06-18T15:00:00Z"))).toBe("dia-2026-06-18");
  });

  it("devuelve el próximo día con partidos cuando hoy no tiene", () => {
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-16T19:00:00Z"),
      m("group", "B", "2026-06-19T19:00:00Z"),
    ]);
    // 2026-06-17 es día libre; el próximo con partidos es el 19
    expect(getActiveDayKey(secs, new Date("2026-06-17T15:00:00Z"))).toBe("dia-2026-06-19");
  });

  it("devuelve la última sección cuando todo quedó en el pasado", () => {
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-11T19:00:00Z"),
      m("group", "B", "2026-06-12T19:00:00Z"),
    ]);
    expect(getActiveDayKey(secs, new Date("2026-07-01T15:00:00Z"))).toBe("dia-2026-06-12");
  });

  it("devuelve null sin secciones", () => {
    expect(getActiveDayKey([], new Date("2026-06-18T15:00:00Z"))).toBeNull();
  });
});
```

- [ ] **Step 2: Correr los tests para ver que fallan**

Run: `npx vitest run src/lib/group-matches.test.ts -t getActiveDayKey`
Expected: FAIL — `getActiveDayKey is not a function` (o error de import).

- [ ] **Step 3: Implementar la función mínima**

Agregar al final de `src/lib/group-matches.ts` (NO hace falta nuevo import; `dayKey` ya está importado en la línea 1):

```ts
export function getActiveDayKey<T extends Groupable>(
  sections: MatchSection<T>[],
  now: Date,
): string | null {
  if (sections.length === 0) return null;
  const today = dayKey(now);
  let firstFuture: string | null = null;
  for (const section of sections) {
    const day = dayKey(section.matches[0].kickoffAt);
    if (day === today) return section.key;
    if (day > today && firstFuture === null) firstFuture = section.key;
  }
  return firstFuture ?? sections[sections.length - 1].key;
}
```

(`sections` llega ordenado ascendentemente por día desde `groupMatchesByDay`; las claves `YYYY-MM-DD` se comparan lexicográficamente en orden cronológico.)

- [ ] **Step 4: Correr los tests para ver que pasan**

Run: `npx vitest run src/lib/group-matches.test.ts -t getActiveDayKey`
Expected: PASS (4 tests).

- [ ] **Step 5: Correr toda la suite + lint**

Run: `npm test && npm run lint`
Expected: todo verde.

- [ ] **Step 6: Commit**

```bash
git add src/lib/group-matches.ts src/lib/group-matches.test.ts
git commit -m "feat: getActiveDayKey (calcula el día activo para la vista por fecha)"
```

---

### Task 2: Componente `DaySectionNav` (nav sticky con día activo resaltado)

**Files:**
- Create: `src/components/DaySectionNav.tsx`

**Interfaces:**
- Consumes: nada de tasks previas (solo recibe props). Acepta `MatchSection<T>[]` por compatibilidad estructural (usa solo `key` y `title`).
- Produces: `export function DaySectionNav({ sections, activeKey }: { sections: { key: string; title: string }[]; activeKey: string | null })` — server component que renderiza la `<nav>` sticky.

- [ ] **Step 1: Crear el componente**

Crear `src/components/DaySectionNav.tsx` (server component, sin `"use client"`). Replica exacta de la `<nav>` que hoy está inline en las páginas, agregando el resaltado del pill activo:

```tsx
export function DaySectionNav({
  sections,
  activeKey,
}: {
  sections: { key: string; title: string }[];
  activeKey: string | null;
}) {
  return (
    <nav className="sticky top-14 z-10 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b bg-background/80 px-4 py-2 backdrop-blur">
      {sections.map((s) => {
        const active = s.key === activeKey;
        return (
          <a
            key={s.key}
            href={`#${s.key}`}
            aria-current={active ? "true" : undefined}
            className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs transition-colors ${
              active
                ? "border-foreground/40 font-medium text-foreground"
                : "text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {s.title}
          </a>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores. (No hay test unitario: es UI; se valida visualmente en la Task 6.)

- [ ] **Step 3: Commit**

```bash
git add src/components/DaySectionNav.tsx
git commit -m "feat: DaySectionNav (nav por fecha con el día activo resaltado)"
```

---

### Task 3: Componente `ScrollToActiveSection` (auto-scroll en el mount)

**Files:**
- Create: `src/components/ScrollToActiveSection.tsx`

**Interfaces:**
- Consumes: nada de tasks previas.
- Produces: `export function ScrollToActiveSection({ targetId }: { targetId: string })` — client component que no renderiza nada (`return null`); en el mount hace scroll a `#targetId` si la URL no trae hash.

- [ ] **Step 1: Crear el componente**

Crear `src/components/ScrollToActiveSection.tsx` (client component, sigue el patrón de `LocalTime.tsx`):

```tsx
"use client";

import { useEffect } from "react";

export function ScrollToActiveSection({ targetId }: { targetId: string }) {
  useEffect(() => {
    // Respetar links compartidos a un día puntual (#dia-YYYY-MM-DD).
    if (window.location.hash) return;
    document.getElementById(targetId)?.scrollIntoView({ block: "start" });
  }, [targetId]);

  return null;
}
```

(El offset del header sticky lo cubre el `scroll-mt-28` que cada `<section>` ya tiene; `scrollIntoView` respeta `scroll-margin-top`.)

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/ScrollToActiveSection.tsx
git commit -m "feat: ScrollToActiveSection (auto-scroll al día activo en el mount)"
```

---

### Task 4: Integrar en `/predicciones` (flip del default + nav + scroll)

**Files:**
- Modify: `src/app/predicciones/page.tsx`

**Interfaces:**
- Consumes: `getActiveDayKey` (Task 1), `DaySectionNav` (Task 2), `ScrollToActiveSection` (Task 3).
- Produces: nada para tasks posteriores.

- [ ] **Step 1: Ajustar imports**

En `src/app/predicciones/page.tsx`, agregar a los imports existentes:

```tsx
import { groupMatches, groupMatchesByDay, getActiveDayKey } from "@/lib/group-matches";
import { DaySectionNav } from "@/components/DaySectionNav";
import { ScrollToActiveSection } from "@/components/ScrollToActiveSection";
```

(La línea de `group-matches` ya existe importando `groupMatches, groupMatchesByDay`; agregarle `getActiveDayKey`. Las otras dos son nuevas.)

- [ ] **Step 2: Invertir el default y calcular el día activo**

Cambiar la derivación del modo (actualmente `const byDate = orden === "fecha";`) por:

```tsx
  const byDate = orden !== "grupo";
```

Y justo después del cálculo de `sections` (líneas ~25-27, `const sections = byDate ? groupMatchesByDay(allMatches) : groupMatches(allMatches);`), agregar:

```tsx
  const activeKey = byDate ? getActiveDayKey(sections, now) : null;
```

(`const now = new Date()` ya existe en este archivo.)

- [ ] **Step 3: Invertir los hrefs del toggle**

En el bloque de pills del `<header>`, cambiar SOLO los `href` (la lógica de `aria-current` y clases ya depende de `byDate`, así que el activo se invierte solo):

- Link "Por grupo": `href="/predicciones"` → `href="/predicciones?orden=grupo"`
- Link "Por fecha": `href="/predicciones?orden=fecha"` → `href="/predicciones"`

- [ ] **Step 4: Reemplazar la `<nav>` inline por `DaySectionNav` y agregar el scroll**

Reemplazar todo el bloque `<nav className="sticky top-14 …"> … </nav>` (líneas ~68-78) por:

```tsx
      <DaySectionNav sections={sections} activeKey={activeKey} />
      {byDate && activeKey && <ScrollToActiveSection targetId={activeKey} />}
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 6: Build (smoke check de la ruta)**

Run: `npm run build`
Expected: build OK, sin errores de tipo ni de server/client boundaries.

- [ ] **Step 7: Commit**

```bash
git add src/app/predicciones/page.tsx
git commit -m "feat: predicciones arranca en vista por fecha con el día actual seleccionado"
```

---

### Task 5: Integrar en `/admin` (flip del default + nav + scroll)

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `getActiveDayKey` (Task 1), `DaySectionNav` (Task 2), `ScrollToActiveSection` (Task 3).
- Produces: nada.

- [ ] **Step 1: Ajustar imports**

En `src/app/admin/page.tsx`, agregar/ajustar:

```tsx
import { groupMatches, groupMatchesByDay, getActiveDayKey } from "@/lib/group-matches";
import { DaySectionNav } from "@/components/DaySectionNav";
import { ScrollToActiveSection } from "@/components/ScrollToActiveSection";
```

(La línea de `group-matches` ya existe; agregarle `getActiveDayKey`. Las otras dos son nuevas.)

- [ ] **Step 2: Invertir el default, agregar `now` y el día activo**

Cambiar `const byDate = orden === "fecha";` por:

```tsx
  const byDate = orden !== "grupo";
```

Y donde se calcula `sections` (actualmente `const sections = byDate ? groupMatchesByDay(allMatches) : groupMatches(allMatches);`), dejar:

```tsx
  const now = new Date();
  const sections = byDate ? groupMatchesByDay(allMatches) : groupMatches(allMatches);
  const activeKey = byDate ? getActiveDayKey(sections, now) : null;
```

(En admin hoy NO existe `now`; se agrega.)

- [ ] **Step 3: Invertir los hrefs del toggle**

En el bloque de pills del `<header>`, cambiar SOLO los `href`:

- Link "Por grupo": `href="/admin"` → `href="/admin?orden=grupo"`
- Link "Por fecha": `href="/admin?orden=fecha"` → `href="/admin"`

- [ ] **Step 4: Reemplazar la `<nav>` inline por `DaySectionNav` y agregar el scroll**

Reemplazar el bloque `<nav className="sticky top-14 …"> … </nav>` (líneas ~60-70) por:

```tsx
      <DaySectionNav sections={sections} activeKey={activeKey} />
      {byDate && activeKey && <ScrollToActiveSection targetId={activeKey} />}
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 6: Build (smoke check)**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: admin arranca en vista por fecha con el día actual seleccionado"
```

---

### Task 6: Validación visual (harness HTML) + verificación final

**Files:**
- Create (temporal, NO commitear): `/tmp/prode-nav-harness.html`

**Interfaces:**
- Consumes: el markup/clases de `DaySectionNav` (Task 2) y el comportamiento de `ScrollToActiveSection` (Task 3).
- Produces: evidencia visual de que (a) el pill del día activo se resalta y (b) la página arranca scrolleada en la sección activa con el offset del header.

> Rutas autenticadas no se pueden screenshotear directo (ver memoria `validate-visual-changes-in-harness`); se valida con un harness standalone que reproduce el nav + secciones altas + el script de scroll.

- [ ] **Step 1: Crear el harness**

Crear `/tmp/prode-nav-harness.html` reproduciendo la nav sticky (con un pill activo resaltado), varias secciones altas con `scroll-margin-top`, y el mismo efecto de scroll-on-mount:

```html
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: system-ui, sans-serif; margin: 0; }
  header { height: 56px; position: sticky; top: 0; background: #fff; border-bottom: 1px solid #ddd; display: flex; align-items: center; padding: 0 16px; z-index: 20; }
  nav { position: sticky; top: 56px; display: flex; gap: 6px; overflow-x: auto; border-bottom: 1px solid #ddd; padding: 8px 16px; background: rgba(255,255,255,.8); backdrop-filter: blur(6px); z-index: 10; }
  nav a { white-space: nowrap; border-radius: 999px; border: 1px solid #ddd; padding: 4px 10px; font-size: 12px; color: #888; text-decoration: none; }
  nav a[aria-current="true"] { border-color: rgba(0,0,0,.4); color: #111; font-weight: 600; }
  section { scroll-margin-top: 7rem; padding: 16px; min-height: 90vh; border-bottom: 1px solid #eee; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #888; }
</style>
</head>
<body>
<header>Predicciones</header>
<nav>
  <a href="#dia-2026-06-16">mar 16</a>
  <a href="#dia-2026-06-17">mié 17</a>
  <a href="#dia-2026-06-18" aria-current="true">jue 18</a>
  <a href="#dia-2026-06-19">vie 19</a>
</nav>
<section id="dia-2026-06-16"><h2>mar 16</h2><p>partidos…</p></section>
<section id="dia-2026-06-17"><h2>mié 17</h2><p>partidos…</p></section>
<section id="dia-2026-06-18"><h2>jue 18</h2><p>partidos del día activo…</p></section>
<section id="dia-2026-06-19"><h2>vie 19</h2><p>partidos…</p></section>
<script>
  // Reproduce ScrollToActiveSection
  if (!window.location.hash) {
    document.getElementById("dia-2026-06-18").scrollIntoView({ block: "start" });
  }
</script>
</body>
</html>
```

- [ ] **Step 2: Screenshot del harness**

Abrir `/tmp/prode-nav-harness.html` en el browser (Claude-in-Chrome o Playwright) y capturar screenshot.
Expected: la página arranca con la sección "jue 18" arriba (debajo del header+nav, gracias al `scroll-margin-top`), y el pill "jue 18" se ve resaltado (texto oscuro, borde más marcado, bold). Los días previos (16, 17) quedan scrolleados hacia arriba, fuera de vista.

- [ ] **Step 3: Verificación final completa**

Run: `npm test && npm run lint && npm run build`
Expected: todo verde — suite de tests, lint y build sin errores.

- [ ] **Step 4: Limpiar**

```bash
rm -f /tmp/prode-nav-harness.html
```

(No se commitea nada en esta task; es verificación.)

---

## Self-Review (cobertura vs. spec)

- **Default invertido (`byDate = orden !== "grupo"`)** → Tasks 4 (Step 2) y 5 (Step 2). Hrefs del toggle → Tasks 4/5 (Step 3). Compat `?orden=fecha` preservada por la lógica `!== "grupo"`. ✔
- **`getActiveDayKey` (hoy → próximo → último → null)** → Task 1, con 4 tests TDD. ✔
- **`DaySectionNav` con pill activo resaltado** → Task 2; integrado en Tasks 4/5 (Step 4). ✔
- **`ScrollToActiveSection` (scroll si no hay hash)** → Task 3; integrado en Tasks 4/5 (Step 4). ✔
- **`now` en admin** → Task 5 (Step 2). ✔
- **Validación unit + visual harness** → Tasks 1 y 6. ✔
- **Consistencia de tipos:** `getActiveDayKey(sections, now): string | null` se usa idéntico en Tasks 4/5; `DaySectionNav({ sections, activeKey })` y `ScrollToActiveSection({ targetId })` coinciden con sus definiciones (Tasks 2/3). ✔
- **Sin placeholders:** todos los pasos con código tienen el código completo. ✔
