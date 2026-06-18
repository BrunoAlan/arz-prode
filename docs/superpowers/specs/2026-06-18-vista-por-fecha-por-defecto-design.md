# Vista "Por fecha" por defecto con la fecha actual seleccionada

## Objetivo

Mejorar la usabilidad de `/predicciones` y `/admin`: que la vista **"Por fecha"** sea la que aparece por defecto (hoy lo es "Por grupo") y que, al entrar, la **fecha actual** quede resaltada en la barra de navegación y la página arranque posicionada (auto-scroll) en esa sección. Así el usuario aterriza directo en los partidos del día sin tocar el toggle ni scrollear.

## Contexto

- Ambas páginas comparten el mismo patrón: leen `?orden`, alternan entre `groupMatches` (por grupo/fase) y `groupMatchesByDay` (por día calendario en TZ Buenos Aires), y renderizan un toggle de pills + una `<nav>` sticky con anclas `#${s.key}` a cada sección.
  - `src/app/predicciones/page.tsx`
  - `src/app/admin/page.tsx`
- Hoy el default es "Por grupo": `const byDate = orden === "fecha"`. La vista por fecha es opt-in vía `?orden=fecha`.
- `groupMatchesByDay` (`src/lib/group-matches.ts`) es genérica (`<T extends Groupable>`) y crea secciones con `key = "dia-" + dayKey(kickoff)`, ya ordenadas ascendentemente por kickoff. Tiene cobertura en `src/lib/group-matches.test.ts`.
- `dayKey` (`src/lib/format.ts`) produce `YYYY-MM-DD` en TZ `America/Argentina/Buenos_Aires`. Las claves `dia-YYYY-MM-DD` son comparables lexicográficamente (orden cronológico).
- La `<nav>` es `sticky top-14` y cada `<section>` ya tiene `scroll-mt-28`, que cubre el offset del header al saltar por ancla.
- El default de Next.js de esta versión entrega `searchParams` como `Promise` que se debe `await` (patrón ya establecido en ambas páginas).

## Decisiones de diseño (confirmadas)

1. **"Por fecha" pasa a ser el default** en ambas páginas. "Por grupo" se mantiene disponible como opción explícita.
2. **"Fecha actual seleccionada"** = se resalta el pill del día activo en la barra **Y** la página arranca scrolleada en esa sección (todos los días siguen visibles y navegables).
3. **Día activo cuando hoy no tiene partidos** = el **próximo día con partidos** (la jornada más cercana hacia adelante).

## Alcance

### 1. Invertir el default del toggle (sin romper links existentes)

En `src/app/predicciones/page.tsx` y `src/app/admin/page.tsx`:

- Cambiar la derivación a: `const byDate = orden !== "grupo";`
  - Sin parámetro → **Por fecha** (nuevo default).
  - `?orden=grupo` → Por grupo (explícito).
  - `?orden=fecha` → sigue dando "Por fecha" (no rompe bookmarks ni links viejos).
- Ajustar el toggle de pills:
  - "Por grupo" → href `?orden=grupo` (`/predicciones?orden=grupo` y `/admin?orden=grupo`), activo cuando `!byDate`.
  - "Por fecha" → href base sin parámetro (`/predicciones` y `/admin`), activo cuando `byDate`.
  - Mismo markup/clases/`aria-current`, solo cambian los hrefs y qué pill es el default activo.

### 2. Calcular el día activo — lógica pura compartida (TDD)

Nueva función en `src/lib/group-matches.ts`:

```ts
export function getActiveDayKey<T extends Groupable>(
  sections: MatchSection<T>[],
  now: Date,
): string | null
```

Reglas (las secciones llegan ordenadas ascendentemente por kickoff):

1. Sin secciones → `null`.
2. Si existe una sección cuyo día == `dayKey(now)` → devolver su `key`.
3. Si no, la **primera sección cuyo día es posterior a hoy** → devolver su `key` (próximo día con partidos).
4. Si todas quedaron en el pasado → devolver el `key` de la **última** sección (fallback razonable: día más reciente).

La comparación se hace por día derivado de cada sección (`dayKey(section.matches[0].kickoffAt)`) contra `dayKey(now)`, ambos en la TZ por defecto. Devuelve el `key` de la sección (formato `dia-YYYY-MM-DD`), no el día crudo.

Tests nuevos en `src/lib/group-matches.test.ts` (vitest), construyendo `sections` con `groupMatchesByDay` y un `now` fijo:
- Hoy tiene partidos → devuelve la sección de hoy.
- Hoy sin partidos, hay días futuros → devuelve el próximo día con partidos.
- Todo el fixture en el pasado → devuelve la última sección.
- `sections` vacío → `null`.

### 3. Nav sticky compartida con resaltado del día activo

Nuevo componente `src/components/DaySectionNav.tsx` (server component) que reemplaza el bloque `<nav>` hoy duplicado idéntico en ambas páginas:

```tsx
DaySectionNav({ sections, activeKey }: {
  sections: { key: string; title: string }[];
  activeKey: string | null;
})
```

- Renderiza la misma `<nav class="sticky top-14 …">` con un ancla `#${s.key}` por sección.
- Cuando `s.key === activeKey`, el pill recibe estilo activo (p. ej. `border-foreground/40 text-foreground font-medium`, distinguible del estado normal `text-muted-foreground`) y `aria-current="true"`.
- El resto de los pills conservan el estilo y hover actuales.

Ambas páginas pasan a usar `<DaySectionNav sections={sections} activeKey={activeKey} />`. `activeKey` se calcula solo en modo `byDate` (en modo "Por grupo" se pasa `null`, sin resaltado — el concepto de "fecha actual" no aplica a la agrupación por grupo).

### 4. Auto-scroll al día activo

Nuevo componente cliente `src/components/ScrollToActiveSection.tsx`:

```tsx
"use client";
ScrollToActiveSection({ targetId }: { targetId: string })
```

- En el `mount` (`useEffect`), si `window.location.hash` está vacío, hace `document.getElementById(targetId)?.scrollIntoView({ block: "start" })`.
- Si la URL ya trae un `#hash` (link compartido a un día puntual), **no** hace nada, respetando esa navegación.
- El offset del header sticky lo cubre el `scroll-mt-28` ya presente en cada `<section>` (scroll-margin lo respeta `scrollIntoView`).

Se renderiza solo cuando `byDate && activeKey != null`, con `targetId={activeKey}`.

### 5. Integración en las páginas

En ambas páginas, dentro del cómputo de `sections`:

```ts
const byDate = orden !== "grupo";
const sections = byDate ? groupMatchesByDay(allMatches) : groupMatches(allMatches);
const activeKey = byDate ? getActiveDayKey(sections, now) : null;
```

- `predicciones` ya tiene `const now = new Date()`; `admin` lo agrega.
- Reemplazar el `<nav>` inline por `<DaySectionNav sections={sections} activeKey={activeKey} />`.
- Si `byDate && activeKey`, renderizar `<ScrollToActiveSection targetId={activeKey} />` (cerca del contenedor de secciones).

### Imports nuevos

- `predicciones` y `admin`: `getActiveDayKey` desde `@/lib/group-matches`; `DaySectionNav` y (condicional) `ScrollToActiveSection` desde `@/components/...`.
- `admin`: además, `now` ya no requiere import (es `new Date()`).

## Lo que NO cambia

- El scoring, las queries (`getMatchesOrdered`, `getUserPredictions`), `AdminMatchRow`, `PredictionForm`, el bracket ni las posiciones.
- `groupMatches` / `groupMatchesByDay` (no se modifican; solo se agrega `getActiveDayKey` al mismo módulo).
- El toggle "Por grupo" sigue existiendo; solo se invierte cuál es el default.
- El comportamiento de las anclas y el `scroll-mt-28`.

## Testing y verificación

- **Unitario (vitest):** `getActiveDayKey` con los 4 escenarios descritos arriba. Es la única pieza con lógica nueva; se implementa con TDD (test primero).
- **Visual:** el resaltado del pill activo y el auto-scroll. Por ser rutas autenticadas (no screenshoteables directo), se valida con un harness HTML standalone que reproduzca la nav + secciones + el componente de scroll, capturando screenshot antes de dar por cerrado.
- Correr la suite existente (`group-matches`, `format`, etc.) para confirmar que no se rompe nada.

## Notas de la versión de Next.js

Esta versión de Next entrega `searchParams` como `Promise` (`await searchParams`) y distingue server/client components (`"use client"` para `ScrollToActiveSection`). El patrón de `searchParams` ya está en ambas páginas. Ante cualquier duda de API, consultar `node_modules/next/dist/docs/` antes de escribir código.
