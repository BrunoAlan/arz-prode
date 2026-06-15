# Vista de partidos ordenada por fecha en Admin

## Objetivo

Que la vista de `/admin` (Admin · Resultados) ofrezca el mismo toggle "Por grupo / Por fecha" y la barra de navegación sticky con anclas que ya existe en `/predicciones`, reutilizando la lógica existente. Hoy admin solo agrupa por grupo/fase y no tiene navegación entre secciones.

## Contexto

- `/predicciones` (`src/app/predicciones/page.tsx`) ya implementa el patrón completo: lee `?orden=fecha`, alterna entre `groupMatches` y `groupMatchesByDay`, muestra un toggle de pills y una `<nav>` sticky con anclas a cada sección.
- `groupMatchesByDay` (`src/lib/group-matches.ts`) es genérica (`<T extends Groupable>`) y ya tiene cobertura de tests (`src/lib/group-matches.test.ts`). No necesita cambios.
- `/admin` (`src/app/admin/page.tsx`) hoy: `requireAdmin()` → `getMatchesOrdered()` → `groupMatches()` → renderiza secciones con `AdminMatchRow`. No lee `searchParams`, no tiene toggle ni nav.

## Alcance

Mirror completo del comportamiento de predicciones en admin: toggle + nav sticky de saltos.

### Cambios — un solo archivo: `src/app/admin/page.tsx`

1. **Firma del componente:** pasar de `AdminPage()` a `AdminPage({ searchParams })` con `searchParams: Promise<{ [key: string]: string | string[] | undefined }>`. Leer `const { orden } = await searchParams` y derivar `const byDate = orden === "fecha"`. Mismo patrón que `predicciones/page.tsx:12-19`.

2. **Selección de agrupación:** `const sections = byDate ? groupMatchesByDay(allMatches) : groupMatches(allMatches)`.

3. **Toggle UI:** el mismo bloque de pills dentro del `<header>`, con los hrefs apuntando a `/admin`:
   - "Por grupo" → `/admin` (activo cuando `!byDate`)
   - "Por fecha" → `/admin?orden=fecha` (activo cuando `byDate`)
   - Mismo markup, clases y `aria-current` que predicciones.

4. **Nav sticky:** la misma `<nav class="sticky top-14 …">` con un ancla `#${s.key}` por cada sección.

5. **Anclas en secciones:** agregar `id={section.key}` y `className="scroll-mt-28"` a cada `<section>` (hoy no las tiene).

### Imports nuevos en admin

- `Link` desde `next/link`
- `groupMatchesByDay` desde `@/lib/group-matches`

## Lo que NO cambia

- `AdminMatchRow`, las queries, el scoring, ni la grilla de filas.
- `src/lib/group-matches.ts` (ya genérico y testeado).
- La vista por defecto sigue siendo "Por grupo" (date es opt-in vía `?orden=fecha`).

## Testing y verificación

- No se agrega lógica nueva testeable; `groupMatchesByDay` ya está cubierta por `group-matches.test.ts`.
- Verificación visual: que el toggle alterne la agrupación y que las anclas salten a cada sección. Por ser una ruta autenticada, se valida con un harness HTML standalone + screenshot antes de pedir refresh.

## Notas de la versión de Next.js

Este proyecto usa una versión de Next con `searchParams` como `Promise` que se debe `await`. El patrón ya está establecido en `predicciones/page.tsx`; se replica idéntico. Consultar `node_modules/next/dist/docs/` ante cualquier duda de API antes de escribir código.
