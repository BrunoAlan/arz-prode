# Tabla de posiciones por grupo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una página `/posiciones` que muestre la tabla de posiciones (PJ G E P GF GC DG Pts) de cada grupo del Mundial 2026, llenándose con los resultados de fase de grupos ya cargados, ordenada con desempate FIFA (head-to-head) y con los puestos 1º/2º resaltados.

**Architecture:** Cálculo puro y testeable en `src/lib/standings.ts` (sin DB ni React), expuesto por una query `getGroupStandings()` en `src/lib/queries.ts`, renderizado por `src/components/StandingsTable.tsx` dentro de la ruta protegida `src/app/posiciones/page.tsx`. Sigue el patrón existente `scoring.ts`/`ranking.ts` → `queries.ts` → page.

**Tech Stack:** Next.js 16 (App Router, React Server Components), TypeScript, Drizzle ORM, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-07-tabla-posiciones-grupo-design.md`

---

## File Structure

- **Create** `src/lib/standings.ts` — tipos `StandingTeam`/`StandingMatch`/`StandingRow` y `computeGroupStandings()`. Núcleo puro.
- **Create** `src/lib/standings.test.ts` — tests unitarios del cálculo y desempates.
- **Modify** `src/lib/group-matches.ts` — exportar `GROUP_LABELS` (hoy es `const` privado).
- **Modify** `src/lib/queries.ts` — agregar `getGroupStandings()`.
- **Create** `src/components/StandingsTable.tsx` — render de la tabla de un grupo.
- **Create** `src/app/posiciones/page.tsx` — página protegida.
- **Modify** `src/app/layout.tsx` — link "Posiciones" en el nav.

**Comandos de referencia:**
- Un archivo de tests: `npm test -- src/lib/standings.test.ts`
- Un test por nombre: `npx vitest run src/lib/standings.test.ts -t "fragmento del nombre"`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`

---

## Task 1: `computeGroupStandings` — acumulación y orden básico

Calcula estadísticas y ordena por puntos → diferencia de gol → goles a favor → nombre (todavía sin head-to-head; eso es la Task 2).

**Files:**
- Create: `src/lib/standings.ts`
- Test: `src/lib/standings.test.ts`

- [ ] **Step 1: Escribir los tests que fallan**

```ts
// src/lib/standings.test.ts
import { describe, it, expect } from "vitest";
import { computeGroupStandings } from "./standings";

const T = (id: number, name: string) => ({ id, name, flag: null });

describe("computeGroupStandings", () => {
  it("grupo sin partidos: todo en cero y orden alfabético", () => {
    const rows = computeGroupStandings([T(2, "Brasil"), T(1, "Argentina")], []);
    expect(rows.map((r) => r.name)).toEqual(["Argentina", "Brasil"]);
    expect(rows[0]).toMatchObject({ played: 0, won: 0, points: 0, goalDiff: 0, position: 1 });
  });

  it("un partido: ganador 3 pts, perdedor 0, goles correctos", () => {
    const rows = computeGroupStandings(
      [T(1, "Argentina"), T(2, "Brasil")],
      [{ homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 }],
    );
    expect(rows[0]).toMatchObject({
      teamId: 1, played: 1, won: 1, drawn: 0, lost: 0,
      goalsFor: 2, goalsAgainst: 1, goalDiff: 1, points: 3, position: 1,
    });
    expect(rows[1]).toMatchObject({ teamId: 2, lost: 1, points: 0, goalDiff: -1 });
  });

  it("empata en puntos, desempata por diferencia de gol", () => {
    // A y B ganan 3 pts pero A tiene mejor DG; no juegan entre sí
    const rows = computeGroupStandings(
      [T(1, "A"), T(2, "B"), T(3, "X"), T(4, "Y")],
      [
        { homeTeamId: 1, awayTeamId: 3, homeScore: 3, awayScore: 0 }, // A dg+3
        { homeTeamId: 2, awayTeamId: 4, homeScore: 1, awayScore: 0 }, // B dg+1
      ],
    );
    expect(rows[0].teamId).toBe(1);
    expect(rows[1].teamId).toBe(2);
  });

  it("empata en puntos y DG, desempata por goles a favor", () => {
    const rows = computeGroupStandings(
      [T(1, "A"), T(2, "B"), T(3, "X"), T(4, "Y")],
      [
        { homeTeamId: 1, awayTeamId: 3, homeScore: 2, awayScore: 0 }, // A dg+2 gf2
        { homeTeamId: 2, awayTeamId: 4, homeScore: 3, awayScore: 1 }, // B dg+2 gf3
      ],
    );
    expect(rows[0].teamId).toBe(2); // B más goles a favor
    expect(rows[1].teamId).toBe(1);
  });

  it("empate total sin enfrentamiento: orden alfabético", () => {
    // Zeta(1) y Alfa(2) idénticos y no juegan entre sí -> Alfa primero por nombre
    const rows = computeGroupStandings(
      [T(1, "Zeta"), T(2, "Alfa"), T(3, "X"), T(4, "Y")],
      [
        { homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 },
        { homeTeamId: 2, awayTeamId: 4, homeScore: 1, awayScore: 0 },
      ],
    );
    expect(rows[0].teamId).toBe(2);
    expect(rows[1].teamId).toBe(1);
  });

  it("qualifies: true para puestos 1 y 2, false del 3 en adelante", () => {
    const rows = computeGroupStandings(
      [T(1, "A"), T(2, "B"), T(3, "C")],
      [
        { homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 },
        { homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 0 },
      ],
    );
    expect(rows[0].qualifies).toBe(true);
    expect(rows[1].qualifies).toBe(true);
    expect(rows[2].qualifies).toBe(false);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- src/lib/standings.test.ts`
Expected: FAIL — "Cannot find module './standings'" / `computeGroupStandings is not a function`.

- [ ] **Step 3: Implementar `standings.ts` (orden básico, sin head-to-head)**

```ts
// src/lib/standings.ts
export type StandingTeam = { id: number; name: string; flag: string | null };

export type StandingMatch = {
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
};

export type StandingRow = {
  teamId: number;
  name: string;
  flag: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  position: number;
  qualifies: boolean;
};

type Stat = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

function emptyStat(): Stat {
  return {
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
  };
}

/** Acumula estadísticas de un conjunto de equipos sobre los partidos en los que
 *  ambos equipos pertenecen al conjunto (los demás partidos se ignoran). */
function accumulate(teamIds: number[], matches: StandingMatch[]): Map<number, Stat> {
  const stats = new Map<number, Stat>();
  for (const id of teamIds) stats.set(id, emptyStat());

  for (const m of matches) {
    const home = stats.get(m.homeTeamId);
    const away = stats.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++; away.played++;
    home.goalsFor += m.homeScore; home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore; away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++; home.points += 3; away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  }

  for (const s of stats.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;
  return stats;
}

export function computeGroupStandings(
  teams: StandingTeam[],
  matches: StandingMatch[],
): StandingRow[] {
  const teamIds = teams.map((t) => t.id);
  const byId = new Map(teams.map((t) => [t.id, t]));
  const stats = accumulate(teamIds, matches);

  const ordered = [...teamIds].sort((a, b) => {
    const sa = stats.get(a)!;
    const sb = stats.get(b)!;
    return (
      sb.points - sa.points ||
      sb.goalDiff - sa.goalDiff ||
      sb.goalsFor - sa.goalsFor ||
      byId.get(a)!.name.localeCompare(byId.get(b)!.name)
    );
  });

  return ordered.map((id, idx) => {
    const s = stats.get(id)!;
    const t = byId.get(id)!;
    return {
      teamId: id,
      name: t.name,
      flag: t.flag,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff: s.goalDiff,
      points: s.points,
      position: idx + 1,
      qualifies: idx < 2,
    };
  });
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- src/lib/standings.test.ts`
Expected: PASS — los 6 tests en verde.

- [ ] **Step 5: Commit**

```bash
git add src/lib/standings.ts src/lib/standings.test.ts
git commit -m "feat: computeGroupStandings (acumulación + orden pts/dg/gf)"
```

---

## Task 2: Desempate head-to-head (FIFA)

Cuando dos o más equipos quedan empatados en puntos, diferencia de gol y goles a favor, se los reordena con una mini-tabla construida solo con los partidos entre ellos (puntos → DG → GF head-to-head), y recién al final por nombre.

**Files:**
- Modify: `src/lib/standings.ts`
- Test: `src/lib/standings.test.ts`

- [ ] **Step 1: Agregar el test que falla**

```ts
// añadir dentro del describe("computeGroupStandings", ...) en src/lib/standings.test.ts
it("empate total en pts/dg/gf se resuelve por enfrentamiento directo", () => {
  // Zeta(1) y Alfa(2): ambos 6 pts, DG +2, GF 3 — idénticos en lo global.
  // Zeta le ganó a Alfa 1-0, así que Zeta va primero pese a ir después por nombre.
  const rows = computeGroupStandings(
    [
      { id: 1, name: "Zeta", flag: null },
      { id: 2, name: "Alfa", flag: null },
      { id: 3, name: "Carla", flag: null },
      { id: 4, name: "Delta", flag: null },
    ],
    [
      { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0 }, // Zeta 1-0 Alfa
      { homeTeamId: 3, awayTeamId: 1, homeScore: 1, awayScore: 0 }, // Carla 1-0 Zeta
      { homeTeamId: 1, awayTeamId: 4, homeScore: 2, awayScore: 0 }, // Zeta 2-0 Delta
      { homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 0 }, // Alfa 1-0 Carla
      { homeTeamId: 2, awayTeamId: 4, homeScore: 2, awayScore: 0 }, // Alfa 2-0 Delta
      { homeTeamId: 4, awayTeamId: 3, homeScore: 1, awayScore: 0 }, // Delta 1-0 Carla
    ],
  );
  // Zeta y Alfa: 6 pts, DG +2, GF 3 cada uno -> desempata el 1-0 de Zeta sobre Alfa
  expect(rows[0].teamId).toBe(1);
  expect(rows[1].teamId).toBe(2);
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/standings.test.ts -t "enfrentamiento directo"`
Expected: FAIL — `rows[0].teamId` es `2` (Alfa, por nombre) en vez de `1`, porque todavía no hay head-to-head.

- [ ] **Step 3: Reemplazar el bloque de orden por la versión con head-to-head**

En `src/lib/standings.ts`, reemplazar exactamente este bloque:

```ts
  const ordered = [...teamIds].sort((a, b) => {
    const sa = stats.get(a)!;
    const sb = stats.get(b)!;
    return (
      sb.points - sa.points ||
      sb.goalDiff - sa.goalDiff ||
      sb.goalsFor - sa.goalsFor ||
      byId.get(a)!.name.localeCompare(byId.get(b)!.name)
    );
  });
```

por:

```ts
  const tiedOverall = (a: number, b: number) => {
    const sa = stats.get(a)!;
    const sb = stats.get(b)!;
    return (
      sa.points === sb.points &&
      sa.goalDiff === sb.goalDiff &&
      sa.goalsFor === sb.goalsFor
    );
  };

  // Reordena un grupo de empatados con la mini-tabla de partidos entre ellos.
  const breakTie = (ids: number[]): number[] => {
    const set = new Set(ids);
    const h2h = accumulate(
      ids,
      matches.filter((m) => set.has(m.homeTeamId) && set.has(m.awayTeamId)),
    );
    return [...ids].sort((a, b) => {
      const sa = h2h.get(a)!;
      const sb = h2h.get(b)!;
      return (
        sb.points - sa.points ||
        sb.goalDiff - sa.goalDiff ||
        sb.goalsFor - sa.goalsFor ||
        byId.get(a)!.name.localeCompare(byId.get(b)!.name)
      );
    });
  };

  const byOverall = (a: number, b: number) => {
    const sa = stats.get(a)!;
    const sb = stats.get(b)!;
    return (
      sb.points - sa.points ||
      sb.goalDiff - sa.goalDiff ||
      sb.goalsFor - sa.goalsFor
    );
  };

  const sorted = [...teamIds].sort(byOverall);
  const ordered: number[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && tiedOverall(sorted[i], sorted[j])) j++;
    const run = sorted.slice(i, j);
    ordered.push(...(run.length === 1 ? run : breakTie(run)));
    i = j;
  }
```

- [ ] **Step 4: Correr toda la suite del archivo y verificar que pasa**

Run: `npm test -- src/lib/standings.test.ts`
Expected: PASS — los 7 tests en verde (los 6 previos siguen pasando: el empate sin enfrentamiento cae al fallback por nombre dentro de `breakTie`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/standings.ts src/lib/standings.test.ts
git commit -m "feat: desempate head-to-head FIFA en computeGroupStandings"
```

---

## Task 3: Query `getGroupStandings()`

**Files:**
- Modify: `src/lib/group-matches.ts` (exportar `GROUP_LABELS`)
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Exportar `GROUP_LABELS` en `group-matches.ts`**

Cambiar la línea:

```ts
const GROUP_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
```

por:

```ts
export const GROUP_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
```

- [ ] **Step 2: Agregar `getGroupStandings()` en `queries.ts`**

En `src/lib/queries.ts`, cambiar el import de drizzle para incluir `and`:

```ts
import { eq, asc, and } from "drizzle-orm";
```

Agregar los imports del módulo y los labels (junto a los imports existentes):

```ts
import { computeGroupStandings, type StandingRow } from "@/lib/standings";
import { GROUP_LABELS } from "@/lib/group-matches";
```

Agregar al final del archivo:

```ts
export async function getGroupStandings(): Promise<
  { label: string; rows: StandingRow[] }[]
> {
  const allTeams = await db.select().from(teams);
  const finishedGroupMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.stage, "group"), eq(matches.status, "finished")));

  const groups: { label: string; rows: StandingRow[] }[] = [];
  for (const label of GROUP_LABELS) {
    const groupTeams = allTeams
      .filter((t) => t.group === label)
      .map((t) => ({ id: t.id, name: t.name, flag: t.flag }));
    if (groupTeams.length === 0) continue;

    const ids = new Set(groupTeams.map((t) => t.id));
    const groupMatches = finishedGroupMatches
      .filter(
        (m) =>
          m.homeTeamId != null &&
          m.awayTeamId != null &&
          m.homeScore != null &&
          m.awayScore != null &&
          ids.has(m.homeTeamId) &&
          ids.has(m.awayTeamId),
      )
      .map((m) => ({
        homeTeamId: m.homeTeamId!,
        awayTeamId: m.awayTeamId!,
        homeScore: m.homeScore!,
        awayScore: m.awayScore!,
      }));

    groups.push({ label, rows: computeGroupStandings(groupTeams, groupMatches) });
  }
  return groups;
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — sin errores de tipos.

- [ ] **Step 4: Commit**

```bash
git add src/lib/group-matches.ts src/lib/queries.ts
git commit -m "feat: query getGroupStandings (tabla por grupo desde resultados cargados)"
```

---

## Task 4: Componente `StandingsTable`

**Files:**
- Create: `src/components/StandingsTable.tsx`

- [ ] **Step 1: Crear el componente**

```tsx
// src/components/StandingsTable.tsx
import { TeamLabel } from "@/components/TeamLabel";
import type { StandingRow } from "@/lib/standings";

const NUM = "text-right font-mono tabular-nums";

export function StandingsTable({
  label,
  rows,
}: {
  label: string;
  rows: StandingRow[];
}) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold tracking-tight">
        Grupo {label}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1 text-left font-medium">Equipo</th>
            <th className={`w-7 ${NUM} font-medium`}>PJ</th>
            <th className={`w-7 ${NUM} font-medium`}>G</th>
            <th className={`w-7 ${NUM} font-medium`}>E</th>
            <th className={`w-7 ${NUM} font-medium`}>P</th>
            <th className={`w-8 ${NUM} font-medium`}>GF</th>
            <th className={`w-8 ${NUM} font-medium`}>GC</th>
            <th className={`w-8 ${NUM} font-medium`}>DG</th>
            <th className={`w-8 ${NUM} font-medium`}>Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.teamId} className={r.qualifies ? "bg-accent/50" : ""}>
              <td className="py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {r.position}
                  </span>
                  <TeamLabel team={{ name: r.name, flag: r.flag }} />
                </div>
              </td>
              <td className={NUM}>{r.played}</td>
              <td className={NUM}>{r.won}</td>
              <td className={NUM}>{r.drawn}</td>
              <td className={NUM}>{r.lost}</td>
              <td className={NUM}>{r.goalsFor}</td>
              <td className={NUM}>{r.goalsAgainst}</td>
              <td className={NUM}>
                {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
              </td>
              <td className={`${NUM} font-semibold`}>{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/StandingsTable.tsx
git commit -m "feat: componente StandingsTable (tabla de posiciones de un grupo)"
```

---

## Task 5: Página `/posiciones` y link en el nav

**Files:**
- Create: `src/app/posiciones/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Crear la página protegida**

```tsx
// src/app/posiciones/page.tsx
import { requireUser } from "@/lib/session";
import { getGroupStandings } from "@/lib/queries";
import { StandingsTable } from "@/components/StandingsTable";

export default async function PosicionesPage() {
  await requireUser();
  const groups = await getGroupStandings();
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Posiciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fase de grupos · Mundial 2026
        </p>
      </header>
      <div className="space-y-8">
        {groups.map((g) => (
          <StandingsTable key={g.label} label={g.label} rows={g.rows} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Agregar el link "Posiciones" en el nav**

En `src/app/layout.tsx`, después del bloque del link "Llaves" y antes del de "Ranking", insertar:

```tsx
                <Link href="/posiciones" className="transition-colors hover:text-foreground">
                  Posiciones
                </Link>
```

El bloque queda así:

```tsx
                <Link href="/llaves" className="transition-colors hover:text-foreground">
                  Llaves
                </Link>
                <Link href="/posiciones" className="transition-colors hover:text-foreground">
                  Posiciones
                </Link>
                <Link href="/ranking" className="transition-colors hover:text-foreground">
                  Ranking
                </Link>
```

- [ ] **Step 3: Typecheck y lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: PASS — sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/posiciones/page.tsx src/app/layout.tsx
git commit -m "feat: página /posiciones + link en el nav"
```

---

## Task 6: Verificación visual (harness HTML)

`/posiciones` es una ruta autenticada, así que no se puede screenshotear directo: se valida el estilo de la tabla en un harness HTML estático con datos de ejemplo (ver memoria "validate-visual-changes-in-harness").

**Files:**
- Create (temporal, no commitear): `/tmp/standings-harness.html`

- [ ] **Step 1: Crear un harness con una tabla de ejemplo**

Generar un HTML estático que cargue Tailwind por CDN y reproduzca el markup de `StandingsTable` con 4 filas de ejemplo (las dos primeras con `bg-accent/50`), para revisar alineación de columnas, `tabular-nums` y el resaltado de clasificados. Abrirlo y sacar screenshot.

- [ ] **Step 2: Revisar el screenshot**

Confirmar: columnas numéricas alineadas a la derecha, `Pts` en negrita, DG con signo `+`, y las dos primeras filas resaltadas. Ajustar clases en `StandingsTable.tsx` si algo se ve mal (y re-correr `npx tsc --noEmit`).

- [ ] **Step 3 (opcional): Verificación end-to-end en la app real**

Si hay resultados de grupo cargados en la base, levantar `npm run dev`, loguearse y entrar a `/posiciones` para confirmar que las tablas se llenan con datos reales.

---

## Self-Review (autor del plan)

- **Cobertura del spec:** módulo puro `standings.ts` (Task 1-2), reglas FIFA con head-to-head (Task 2), query desde resultados cargados (Task 3), componente con columnas completas PJ G E P GF GC DG Pts y top-2 resaltado (Task 4), página `/posiciones` protegida + nav (Task 5), validación visual por harness (Task 6). Cubierto.
- **Nombres/tipos consistentes:** `StandingTeam`/`StandingMatch`/`StandingRow`, `computeGroupStandings`, `getGroupStandings`, `GROUP_LABELS`, `StandingsTable` usados igual en todas las tasks.
- **Nota de alcance:** el desempate implementa puntos/DG/GF globales → head-to-head (pts/DG/GF entre empatados) → nombre. No incluye fair-play ni "mejores terceros" (fuera de alcance por el spec).
