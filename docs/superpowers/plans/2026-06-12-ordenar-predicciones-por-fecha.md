# Ordenar predicciones por fecha — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sumar una vista "por fecha" a `/predicciones` que agrupa los partidos por día (TZ Buenos Aires), conmutable por URL (`?orden=fecha`), sin quitar la vista por grupo.

**Architecture:** Ambos modos producen `MatchSection<T>[]`, así que el render de la página no cambia: solo se branchea qué función arma las secciones según el search param `orden`. Dos helpers nuevos de formato de día y una función de agrupado por día. Toggle como links (sin estado de cliente).

**Tech Stack:** Next.js 16 (App Router, Server Components, `searchParams` async), React 19, Vitest, Tailwind.

---

## File Structure

- `src/lib/format.ts` (modify) — suma `formatDay()` (título de día) y `dayKey()` (clave estable `YYYY-MM-DD` en TZ).
- `src/lib/format.test.ts` (modify) — tests de `formatDay` y `dayKey`.
- `src/lib/group-matches.ts` (modify) — suma `groupMatchesByDay()`.
- `src/lib/group-matches.test.ts` (modify) — tests de `groupMatchesByDay`.
- `src/app/predicciones/page.tsx` (modify) — lee `orden`, branchea agrupado, agrega toggle inline.

---

## Task 1: Helpers de formato de día (`formatDay`, `dayKey`)

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `src/lib/format.test.ts` (debajo de lo existente; actualizar el import de la línea 2 a `import { formatKickoff, formatDay, dayKey } from "./format";`):

```ts
describe("formatDay", () => {
  it("devuelve weekday + día + mes, sin hora, en Buenos Aires por defecto", () => {
    const s = formatDay(new Date("2026-06-11T19:00:00Z")); // 16:00 jueves en BA
    expect(s).toMatch(/jue/i);
    expect(s).toMatch(/11/);
    expect(s).toMatch(/jun/i);
    expect(s).not.toMatch(/\d{1,2}:\d{2}/); // sin hora
  });

  it("respeta una zona horaria explícita en el límite de día", () => {
    // 01:00Z del 12 = 22:00 del 11 en BA (UTC-3)
    const s = formatDay(new Date("2026-06-12T01:00:00Z"), "America/Argentina/Buenos_Aires");
    expect(s).toMatch(/11/);
  });
});

describe("dayKey", () => {
  it("devuelve YYYY-MM-DD en TZ Buenos Aires", () => {
    expect(dayKey(new Date("2026-06-11T19:00:00Z"))).toBe("2026-06-11");
  });

  it("agrupa por día calendario de BA, no UTC", () => {
    // 01:00Z del 12 cae el 11 en BA
    expect(dayKey(new Date("2026-06-12T01:00:00Z"))).toBe("2026-06-11");
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npm test -- format`
Expected: FAIL — `formatDay`/`dayKey` no existen (TypeError / not a function).

- [ ] **Step 3: Implementar los helpers**

Agregar al final de `src/lib/format.ts`:

```ts
export function formatDay(
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

export function dayKey(
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  // en-CA produce YYYY-MM-DD; estable para usar como clave/ancla.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npm test -- format`
Expected: PASS (todos, incluidos los de `formatKickoff`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: helpers formatDay y dayKey (formato de día en TZ)"
```

---

## Task 2: `groupMatchesByDay()`

**Files:**
- Modify: `src/lib/group-matches.ts`
- Test: `src/lib/group-matches.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

Actualizar el import de la línea 2 de `src/lib/group-matches.test.ts` a:
`import { groupMatches, groupMatchesByDay } from "./group-matches";`

Agregar al final del archivo:

```ts
describe("groupMatchesByDay", () => {
  it("agrupa partidos del mismo día (TZ BA) en una sección", () => {
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-11T19:00:00Z"),
      m("round_of_32", null, "2026-06-11T22:00:00Z"),
    ]);
    expect(secs).toHaveLength(1);
    expect(secs[0].key).toBe("dia-2026-06-11");
    expect(secs[0].matches).toHaveLength(2);
  });

  it("separa en días distintos cruzando la medianoche de BA", () => {
    // 02:00Z del 12 = 23:00 del 11 en BA; 04:00Z del 12 = 01:00 del 12 en BA
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-12T02:00:00Z"),
      m("group", "B", "2026-06-12T04:00:00Z"),
    ]);
    expect(secs.map((s) => s.key)).toEqual(["dia-2026-06-11", "dia-2026-06-12"]);
  });

  it("mezcla stages distintos en el mismo día, ordenados por horario", () => {
    const secs = groupMatchesByDay([
      m("final", null, "2026-06-11T22:00:00Z"),
      m("group", "A", "2026-06-11T19:00:00Z"),
    ]);
    expect(secs).toHaveLength(1);
    expect(secs[0].matches.map((x) => x.kickoffAt.toISOString())).toEqual([
      "2026-06-11T19:00:00.000Z",
      "2026-06-11T22:00:00.000Z",
    ]);
  });

  it("devuelve las secciones en orden cronológico de día", () => {
    const secs = groupMatchesByDay([
      m("group", "C", "2026-06-13T19:00:00Z"),
      m("group", "A", "2026-06-11T19:00:00Z"),
    ]);
    expect(secs.map((s) => s.key)).toEqual(["dia-2026-06-11", "dia-2026-06-13"]);
  });

  it("lista vacía devuelve []", () => {
    expect(groupMatchesByDay([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `npm test -- group-matches`
Expected: FAIL — `groupMatchesByDay` no existe.

- [ ] **Step 3: Implementar `groupMatchesByDay`**

En `src/lib/group-matches.ts`, agregar el import al tope del archivo:

```ts
import { formatDay, dayKey } from "./format";
```

Agregar la función (al final del archivo, después de `groupMatches`):

```ts
export function groupMatchesByDay<T extends Groupable>(
  matches: T[],
): MatchSection<T>[] {
  const sorted = [...matches].sort(
    (a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime(),
  );
  const sections: MatchSection<T>[] = [];
  const byKey = new Map<string, MatchSection<T>>();

  for (const mm of sorted) {
    const key = dayKey(mm.kickoffAt);
    let section = byKey.get(key);
    if (!section) {
      section = { key: `dia-${key}`, title: formatDay(mm.kickoffAt), matches: [] };
      byKey.set(key, section);
      sections.push(section);
    }
    section.matches.push(mm);
  }

  return sections;
}
```

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `npm test -- group-matches`
Expected: PASS (todos, incluidos los de `groupMatches`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/group-matches.ts src/lib/group-matches.test.ts
git commit -m "feat: groupMatchesByDay (agrupa por día en TZ BA)"
```

---

## Task 3: Branch en la página + toggle de vista

**Files:**
- Modify: `src/app/predicciones/page.tsx`

No hay tests unitarios de páginas en este repo; la verificación de esta task es typecheck/build + smoke manual.

- [ ] **Step 1: Importar `groupMatchesByDay`**

En `src/app/predicciones/page.tsx`, línea 5, cambiar:

```ts
import { groupMatches } from "@/lib/group-matches";
```

por:

```ts
import { groupMatches, groupMatchesByDay } from "@/lib/group-matches";
```

- [ ] **Step 2: Leer `searchParams` y branchear el agrupado**

Reemplazar la firma y las primeras líneas del componente (líneas 12-19):

```tsx
export default async function PrediccionesPage() {
  const user = await requireUser();
  const [allMatches, preds] = await Promise.all([
    getMatchesOrdered(),
    getUserPredictions(user.id),
  ]);
  const now = new Date();
  const sections = groupMatches(allMatches);
```

por:

```tsx
export default async function PrediccionesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const { orden } = await searchParams;
  const byDate = orden === "fecha";
  const [allMatches, preds] = await Promise.all([
    getMatchesOrdered(),
    getUserPredictions(user.id),
  ]);
  const now = new Date();
  const sections = byDate
    ? groupMatchesByDay(allMatches)
    : groupMatches(allMatches);
```

- [ ] **Step 3: Agregar el toggle en el header**

Dentro del `<header>` (después del `<p>` de la línea 27-29, antes de cerrar `</header>`), agregar:

```tsx
        <div className="mt-4 inline-flex gap-1 rounded-full border p-1 text-xs">
          <Link
            href="/predicciones"
            className={`rounded-full px-3 py-1 transition-colors ${
              byDate
                ? "text-muted-foreground hover:text-foreground"
                : "bg-foreground text-background"
            }`}
          >
            Por grupo
          </Link>
          <Link
            href="/predicciones?orden=fecha"
            className={`rounded-full px-3 py-1 transition-colors ${
              byDate
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Por fecha
          </Link>
        </div>
```

(`Link` ya está importado en la línea 1.)

- [ ] **Step 4: Typecheck / build**

Run: `npm run build`
Expected: build OK, sin errores de tipos (en particular, la firma async de `searchParams`).

- [ ] **Step 5: Smoke manual**

Run: `npm run dev` y abrir:
- `/predicciones` → vista por grupo (default), pill "Por grupo" resaltada.
- `/predicciones?orden=fecha` → secciones por día ("Jue 11 jun"…), partidos cronológicos mezclando grupos y eliminación, pill "Por fecha" resaltada.
- Clic en cada pill navega entre vistas; el nav sticky muestra los anchors de cada sección en ambos modos.

Expected: ambos modos renderizan; el toggle resalta el activo; los partidos del modo fecha salen ordenados por horario.

- [ ] **Step 6: Commit**

```bash
git add src/app/predicciones/page.tsx
git commit -m "feat: vista por fecha en predicciones (toggle ?orden=fecha)"
```

---

## Self-Review

- **Spec coverage:**
  - Modo fecha agrupado por día → Task 2 (`groupMatchesByDay`) + Task 1 (`formatDay`).
  - Persistencia por URL `?orden=fecha` → Task 3 (Step 2-3).
  - Default por grupo → Task 3 (`byDate = orden === "fecha"`, branch estricto).
  - TZ Buenos Aires en el agrupado → Task 1 (`dayKey`/`formatDay` con `DEFAULT_TIME_ZONE`).
  - Render idéntico en ambos modos → Task 3 (solo cambia `sections`).
  - Toggle resaltando el activo → Task 3 (Step 3).
  - Casos borde (valor desconocido → default; lista vacía) → cubiertos por branch estricto y test de `[]`.
- **Placeholder scan:** sin TBD/TODO; todo el código está presente.
- **Type consistency:** `formatDay`/`dayKey`/`groupMatchesByDay` con las mismas firmas en definición y uso; `MatchSection<T>`/`Groupable` reusados del módulo existente; `searchParams: Promise<...>` consistente con Next 16.
