# Poblado y avance de llaves — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que las llaves se pueblen y avancen solas a medida que el admin carga resultados, con la única intervención manual de asignar los 8 mejores terceros a sus cupos de R32.

**Architecture:** Una función pura e idempotente `resolveBracket` deriva, para cada partido de eliminatoria, qué equipos le corresponden (`1X`/`2X` desde standings; `Ganador`/`Perdedor` desde el marcador). `confirmResult` y un nuevo action `assignThird` la corren y persisten los deltas en `match.home_team_id` / `match.away_team_id`. La UI de admin se extiende con un panel de terceros.

**Tech Stack:** Next.js 16 (App Router, server actions), Drizzle ORM (Neon Postgres), React 19, vitest, Tailwind.

## Global Constraints

- **Sin migración de DB.** No se agregan columnas. El schema de `match` ya tiene todo lo necesario (`homeTeamId`, `awayTeamId`, `homeScore`, `awayScore`, `status`, `stage`, `homePlaceholder`, `awayPlaceholder`).
- **El ganador de una llave se deriva del marcador más alto.** Los empates en eliminatorias no existen en los datos (la definición por penales se carga reflejada en el marcador, ej. `3-2`).
- **Rechazar empate** al cargar un resultado de etapa distinta de `"group"`.
- **Terceros de grupo: asignación manual.** No se implementa la tabla oficial de FIFA.
- **Scoring de predicciones: no cambia.**
- **Package manager: npm.** Tests: `npm test` (corre `vitest run`). Test único: `npx vitest run <archivo>`.
- **Next.js modificado:** antes de tocar APIs de Next (server actions, `revalidatePath`, páginas), leer la guía relevante en `node_modules/next/dist/docs/` (ver `AGENTS.md`).
- **Workflow git:** trabajar en la rama `feat/llaves-avance` (ya creada). Commit por tarea. **No** pushear (se confirma aparte con el usuario).

## Estructura de archivos

**Crear:**
- `src/lib/bracket-advance.ts` — resolver puro `resolveBracket` + helpers puros `rankThirdPlaces` e `isInvalidKnockoutDraw`.
- `src/lib/bracket-advance.test.ts` — tests unitarios (vitest).
- `src/components/ThirdPlacePanel.tsx` — panel de admin para asignar terceros (client component).

**Modificar:**
- `src/lib/actions.ts` — validación de empate en `confirmResult`, helper `applyBracketAdvance`, action `assignThird`.
- `src/lib/queries.ts` — `getThirdPlaceData()` para alimentar el panel.
- `src/components/AdminMatchRow.tsx` — mostrar el error de empate rechazado.
- `src/app/admin/page.tsx` — render del `ThirdPlacePanel`.

---

### Task 1: Resolver puro `resolveBracket`

Corazón del feature. Función pura que deriva los equipos de cada partido de eliminatoria a partir del estado actual. No toca la DB.

**Files:**
- Create: `src/lib/bracket-advance.ts`
- Test: `src/lib/bracket-advance.test.ts`

**Interfaces:**
- Consumes: `buildBracket()` de `src/lib/bracket.ts` (devuelve `{ rounds, thirdPlace }`; cada `BracketNode` tiene `matchNumber`, `stage`, `homePlaceholder`, `awayPlaceholder`, `home`, `away` con `home`/`away` de tipo `BracketSlot = { kind: "group"; label } | { kind: "winner"; from } | { kind: "loser"; from }`).
- Produces:
  - `type KnockoutMatchInput = { id: number; stage: string; homePlaceholder: string | null; awayPlaceholder: string | null; homeTeamId: number | null; awayTeamId: number | null; homeScore: number | null; awayScore: number | null; finished: boolean }`
  - `type ResolveInput = { knockout: KnockoutMatchInput[]; groupOrder: Map<string, number[]> }` (`groupOrder`: por grupo COMPLETO, teamIds en orden de posición — idx0 = 1°, idx1 = 2°, idx2 = 3°…)
  - `type ResolvedSlot = { matchId: number; side: "home" | "away"; teamId: number }`
  - `function resolveBracket(input: ResolveInput): ResolvedSlot[]`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/bracket-advance.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { resolveBracket, type KnockoutMatchInput } from "./bracket-advance";

// Helper: arma un KnockoutMatchInput con defaults.
function mk(
  id: number,
  homePlaceholder: string,
  awayPlaceholder: string,
  over: Partial<KnockoutMatchInput> = {},
): KnockoutMatchInput {
  return {
    id,
    stage: "round_of_32",
    homePlaceholder,
    awayPlaceholder,
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    finished: false,
    ...over,
  };
}

describe("resolveBracket", () => {
  it("resuelve posiciones de grupo (1X/2X) de grupos completos", () => {
    // Partido 73 del fixture: "2A" vs "2B".
    const knockout = [mk(73, "2A", "2B")];
    const groupOrder = new Map<string, number[]>([
      ["A", [101, 102, 103, 104]], // 1°=101, 2°=102, 3°=103
      ["B", [201, 202, 203, 204]],
    ]);

    const slots = resolveBracket({ knockout, groupOrder });

    expect(slots).toEqual(
      expect.arrayContaining([
        { matchId: 73, side: "home", teamId: 102 }, // 2A => 2° de A
        { matchId: 73, side: "away", teamId: 202 }, // 2B => 2° de B
      ]),
    );
  });

  it("no toca los cupos de tercero (placeholder '3 ...')", () => {
    // Partido 74 del fixture: "1E" vs "3 A/B/C/D/F".
    const knockout = [mk(74, "1E", "3 A/B/C/D/F")];
    const groupOrder = new Map<string, number[]>([["E", [501, 502, 503, 504]]]);

    const slots = resolveBracket({ knockout, groupOrder });

    expect(slots).toContainEqual({ matchId: 74, side: "home", teamId: 501 }); // 1E => 1° de E
    expect(slots.some((s) => s.matchId === 74 && s.side === "away")).toBe(false);
  });

  it("no resuelve un grupo incompleto (ausente de groupOrder)", () => {
    const knockout = [mk(73, "2A", "2B")];
    const groupOrder = new Map<string, number[]>([["A", [101, 102, 103, 104]]]); // falta B
    const slots = resolveBracket({ knockout, groupOrder });
    expect(slots).toContainEqual({ matchId: 73, side: "home", teamId: 102 });
    expect(slots.some((s) => s.matchId === 73 && s.side === "away")).toBe(false);
  });

  it("propaga el ganador (marcador más alto) al cruce siguiente", () => {
    // R16 partido 90: "Ganador R32-73" vs "Ganador R32-75".
    const knockout = [
      mk(73, "2A", "2B", {
        homeTeamId: 102, awayTeamId: 202, homeScore: 2, awayScore: 1, finished: true,
      }), // gana 102 (home)
      mk(75, "1F", "2C", {
        homeTeamId: 601, awayTeamId: 302, homeScore: 0, awayScore: 3, finished: true,
      }), // gana 302 (away)
      mk(90, "Ganador R32-73", "Ganador R32-75", { stage: "round_of_16" }),
    ];
    const slots = resolveBracket({ knockout, groupOrder: new Map() });
    expect(slots).toContainEqual({ matchId: 90, side: "home", teamId: 102 });
    expect(slots).toContainEqual({ matchId: 90, side: "away", teamId: 302 });
  });

  it("resuelve perdedor para el partido por el tercer puesto y ganador para la final", () => {
    // SF 101: "Ganador CF-97" vs "Ganador CF-98"; SF 102: "Ganador CF-99" vs "Ganador CF-100".
    // 103 third_place: "Perdedor SF-101" vs "Perdedor SF-102".
    // 104 final: "Ganador SF-101" vs "Ganador SF-102".
    const knockout = [
      mk(101, "Ganador CF-97", "Ganador CF-98", {
        stage: "semi_final", homeTeamId: 11, awayTeamId: 12, homeScore: 1, awayScore: 0, finished: true,
      }), // gana 11, pierde 12
      mk(102, "Ganador CF-99", "Ganador CF-100", {
        stage: "semi_final", homeTeamId: 21, awayTeamId: 22, homeScore: 2, awayScore: 3, finished: true,
      }), // gana 22, pierde 21
      mk(103, "Perdedor SF-101", "Perdedor SF-102", { stage: "third_place" }),
      mk(104, "Ganador SF-101", "Ganador SF-102", { stage: "final" }),
    ];
    const slots = resolveBracket({ knockout, groupOrder: new Map() });
    expect(slots).toContainEqual({ matchId: 103, side: "home", teamId: 12 });
    expect(slots).toContainEqual({ matchId: 103, side: "away", teamId: 21 });
    expect(slots).toContainEqual({ matchId: 104, side: "home", teamId: 11 });
    expect(slots).toContainEqual({ matchId: 104, side: "away", teamId: 22 });
  });

  it("no resuelve ganador si el partido fuente está empatado", () => {
    const knockout = [
      mk(73, "2A", "2B", {
        homeTeamId: 102, awayTeamId: 202, homeScore: 1, awayScore: 1, finished: true,
      }),
      mk(90, "Ganador R32-73", "Ganador R32-75", { stage: "round_of_16" }),
    ];
    const slots = resolveBracket({ knockout, groupOrder: new Map() });
    expect(slots.some((s) => s.matchId === 90 && s.side === "home")).toBe(false);
  });

  it("es idempotente (mismo input => mismo output)", () => {
    const build = (): KnockoutMatchInput[] => [
      mk(73, "2A", "2B", {
        homeTeamId: 102, awayTeamId: 202, homeScore: 2, awayScore: 1, finished: true,
      }),
      mk(90, "Ganador R32-73", "Ganador R32-75", { stage: "round_of_16" }),
    ];
    const a = resolveBracket({ knockout: build(), groupOrder: new Map() });
    const b = resolveBracket({ knockout: build(), groupOrder: new Map() });
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npx vitest run src/lib/bracket-advance.test.ts`
Expected: FAIL — `resolveBracket` no existe / no se puede importar.

- [ ] **Step 3: Implementar `resolveBracket`**

Crear `src/lib/bracket-advance.ts`:

```ts
import { buildBracket } from "@/lib/bracket";

export type KnockoutMatchInput = {
  id: number;
  stage: string;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
};

export type ResolveInput = {
  knockout: KnockoutMatchInput[];
  // Por grupo COMPLETO: teamIds en orden de posición (idx0 = 1°, idx1 = 2°, idx2 = 3°...).
  groupOrder: Map<string, number[]>;
};

export type ResolvedSlot = {
  matchId: number;
  side: "home" | "away";
  teamId: number;
};

// Orden de procesamiento: cada ronda depende de la anterior.
const ROUND_SEQUENCE = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

// "1F" / "2C" => posición de grupo. "3 A/B/C/D/F" no matchea (es tercero, manual).
const GROUP_POS = /^([12])([A-L])$/;

const key = (home: string | null, away: string | null) =>
  `${home ?? ""}::${away ?? ""}`;

export function resolveBracket(input: ResolveInput): ResolvedSlot[] {
  const { rounds, thirdPlace } = buildBracket();
  const nodes = [
    ...rounds.flatMap((r) => r.nodes),
    ...(thirdPlace ? [thirdPlace] : []),
  ];

  // matchNumber del cuadro -> partido de la DB, vía placeholder-key.
  const dbByKey = new Map<string, KnockoutMatchInput>();
  for (const m of input.knockout) {
    dbByKey.set(key(m.homePlaceholder, m.awayPlaceholder), m);
  }
  const numberToDb = new Map<number, KnockoutMatchInput>();
  for (const n of nodes) {
    const m = dbByKey.get(key(n.homePlaceholder, n.awayPlaceholder));
    if (m) numberToDb.set(n.matchNumber, m);
  }

  // Overlay de equipos por matchId: arranca del estado DB y se actualiza al resolver,
  // para que el ganador de una ronda recién resuelta sea visible río abajo.
  const teamOf = new Map<number, { home: number | null; away: number | null }>();
  for (const m of input.knockout) {
    teamOf.set(m.id, { home: m.homeTeamId, away: m.awayTeamId });
  }

  const out: ResolvedSlot[] = [];
  const emit = (matchId: number, side: "home" | "away", teamId: number) => {
    out.push({ matchId, side, teamId });
    const cur = teamOf.get(matchId)!;
    teamOf.set(
      matchId,
      side === "home" ? { ...cur, home: teamId } : { ...cur, away: teamId },
    );
  };

  // Ganador / perdedor de un partido fuente (por número de cuadro).
  const outcome = (from: number, want: "winner" | "loser"): number | null => {
    const src = numberToDb.get(from);
    if (!src || !src.finished) return null;
    if (src.homeScore == null || src.awayScore == null) return null;
    if (src.homeScore === src.awayScore) return null; // empate: no resoluble.
    const t = teamOf.get(src.id)!;
    if (t.home == null || t.away == null) return null;
    const homeWon = src.homeScore > src.awayScore;
    const winner = homeWon ? t.home : t.away;
    const loser = homeWon ? t.away : t.home;
    return want === "winner" ? winner : loser;
  };

  for (const stage of ROUND_SEQUENCE) {
    for (const node of nodes.filter((n) => n.stage === stage)) {
      const m = numberToDb.get(node.matchNumber);
      if (!m) continue;
      for (const side of ["home", "away"] as const) {
        const slot = side === "home" ? node.home : node.away;
        if (slot.kind === "group") {
          const mm = GROUP_POS.exec(slot.label);
          if (!mm) continue; // "3 ..." => manual, se omite.
          const pos = Number(mm[1]);
          const order = input.groupOrder.get(mm[2]);
          if (!order || order.length < pos) continue;
          emit(m.id, side, order[pos - 1]);
        } else if (slot.kind === "winner") {
          const t = outcome(slot.from, "winner");
          if (t != null) emit(m.id, side, t);
        } else if (slot.kind === "loser") {
          const t = outcome(slot.from, "loser");
          if (t != null) emit(m.id, side, t);
        }
      }
    }
  }

  return out;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npx vitest run src/lib/bracket-advance.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bracket-advance.ts src/lib/bracket-advance.test.ts
git commit -m "feat: resolveBracket (resolver puro de poblado/avance de llaves)"
```

---

### Task 2: Helpers puros `rankThirdPlaces` e `isInvalidKnockoutDraw`

**Files:**
- Modify: `src/lib/bracket-advance.ts` (agregar al final)
- Modify: `src/lib/bracket-advance.test.ts` (agregar `describe`s)

**Interfaces:**
- Produces:
  - `type ThirdPlaceInput = { group: string; teamId: number; name: string; flag: string | null; points: number; goalDiff: number; goalsFor: number }`
  - `type RankedThird = ThirdPlaceInput & { rank: number; qualifies: boolean }`
  - `function rankThirdPlaces(thirds: ThirdPlaceInput[]): RankedThird[]` (ordena por puntos / dif. de gol / goles a favor / grupo; `qualifies = rank <= 8`)
  - `function isInvalidKnockoutDraw(stage: string, homeScore: number, awayScore: number): boolean`

- [ ] **Step 1: Escribir los tests que fallan**

Agregar a `src/lib/bracket-advance.test.ts`:

```ts
import {
  rankThirdPlaces,
  isInvalidKnockoutDraw,
  type ThirdPlaceInput,
} from "./bracket-advance";

describe("rankThirdPlaces", () => {
  const t = (group: string, points: number, goalDiff = 0, goalsFor = 0): ThirdPlaceInput => ({
    group, teamId: group.charCodeAt(0), name: group, flag: null, points, goalDiff, goalsFor,
  });

  it("marca como clasificados solo a los 8 mejores", () => {
    const thirds = ["A","B","C","D","E","F","G","H","I","J","K","L"]
      .map((g, i) => t(g, 12 - i)); // A=12 pts ... L=1 pt
    const ranked = rankThirdPlaces(thirds);
    expect(ranked.filter((r) => r.qualifies).map((r) => r.group)).toEqual(
      ["A", "B", "C", "D", "E", "F", "G", "H"],
    );
    expect(ranked.find((r) => r.group === "I")!.qualifies).toBe(false);
  });

  it("desempata por dif. de gol y luego goles a favor", () => {
    const ranked = rankThirdPlaces([
      t("A", 4, 1, 2),
      t("B", 4, 3, 5), // mejor dif
      t("C", 4, 3, 9), // misma dif que B, más GF
    ]);
    expect(ranked.map((r) => r.group)).toEqual(["C", "B", "A"]);
  });
});

describe("isInvalidKnockoutDraw", () => {
  it("permite empate en grupos", () => {
    expect(isInvalidKnockoutDraw("group", 1, 1)).toBe(false);
  });
  it("rechaza empate en eliminatorias", () => {
    expect(isInvalidKnockoutDraw("round_of_32", 2, 2)).toBe(true);
    expect(isInvalidKnockoutDraw("final", 0, 0)).toBe(true);
  });
  it("permite no-empate en eliminatorias", () => {
    expect(isInvalidKnockoutDraw("final", 3, 2)).toBe(false);
  });
});
```

- [ ] **Step 2: Correr para verificar que fallan**

Run: `npx vitest run src/lib/bracket-advance.test.ts`
Expected: FAIL — `rankThirdPlaces` / `isInvalidKnockoutDraw` no existen.

- [ ] **Step 3: Implementar los helpers**

Agregar al final de `src/lib/bracket-advance.ts`:

```ts
export type ThirdPlaceInput = {
  group: string;
  teamId: number;
  name: string;
  flag: string | null;
  points: number;
  goalDiff: number;
  goalsFor: number;
};

export type RankedThird = ThirdPlaceInput & { rank: number; qualifies: boolean };

export function rankThirdPlaces(thirds: ThirdPlaceInput[]): RankedThird[] {
  const sorted = [...thirds].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.group.localeCompare(b.group),
  );
  return sorted.map((x, i) => ({ ...x, rank: i + 1, qualifies: i < 8 }));
}

export function isInvalidKnockoutDraw(
  stage: string,
  homeScore: number,
  awayScore: number,
): boolean {
  return stage !== "group" && homeScore === awayScore;
}
```

- [ ] **Step 4: Correr toda la suite**

Run: `npm test`
Expected: PASS (incluye `bracket.test.ts` + los nuevos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bracket-advance.ts src/lib/bracket-advance.test.ts
git commit -m "feat: rankThirdPlaces e isInvalidKnockoutDraw (helpers puros)"
```

---

### Task 3: Wiring backend — `confirmResult`, `applyBracketAdvance`, `assignThird`

Conecta el resolver a la DB y agrega la validación de empate. Sin tests unitarios nuevos (la lógica pura ya está testeada y no hay DB de test en el repo): la verificación es typecheck + smoke manual.

**Files:**
- Modify: `src/lib/actions.ts`
- Modify: `src/components/AdminMatchRow.tsx`

**Interfaces:**
- Consumes: `resolveBracket`, `isInvalidKnockoutDraw`, `KnockoutMatchInput` (Task 1-2); `getKnockoutMatches`, `getGroupStandings` (de `queries.ts`); `GROUP_LABELS` (de `group-matches.ts`).
- Produces: `async function assignThird(matchId: number, teamId: number): Promise<void>` (server action).

- [ ] **Step 1: Agregar imports y el helper `applyBracketAdvance` en `actions.ts`**

En `src/lib/actions.ts`, cambiar la línea de import de drizzle:

```ts
import { eq, and } from "drizzle-orm";
```

Agregar estos imports junto a los existentes:

```ts
import { getKnockoutMatches, getGroupStandings } from "@/lib/queries";
import { GROUP_LABELS } from "@/lib/group-matches";
import { resolveBracket, isInvalidKnockoutDraw } from "@/lib/bracket-advance";
```

Agregar el helper (NO exportado — `actions.ts` solo debe exportar server actions) al final del archivo:

```ts
// Re-deriva y persiste los equipos de las llaves a partir del estado actual.
// Idempotente: solo escribe los cambios (deltas).
async function applyBracketAdvance() {
  const knockout = await getKnockoutMatches();
  const standings = await getGroupStandings();

  // Un grupo está "firme" cuando sus 6 partidos están finished.
  const finishedGroup = await db
    .select({ groupLabel: matches.groupLabel })
    .from(matches)
    .where(and(eq(matches.stage, "group"), eq(matches.status, "finished")));
  const finishedCount = new Map<string, number>();
  for (const r of finishedGroup) {
    if (r.groupLabel) {
      finishedCount.set(r.groupLabel, (finishedCount.get(r.groupLabel) ?? 0) + 1);
    }
  }

  const groupOrder = new Map<string, number[]>();
  for (const g of standings) {
    if ((finishedCount.get(g.label) ?? 0) >= 6) {
      groupOrder.set(g.label, g.rows.map((row) => row.teamId));
    }
  }

  const slots = resolveBracket({
    knockout: knockout.map((m) => ({
      id: m.id,
      stage: m.stage,
      homePlaceholder: m.homePlaceholder,
      awayPlaceholder: m.awayPlaceholder,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      finished: m.status === "finished",
    })),
    groupOrder,
  });

  const current = new Map(knockout.map((m) => [m.id, m]));
  for (const slot of slots) {
    const m = current.get(slot.matchId);
    if (!m) continue;
    const cur = slot.side === "home" ? m.homeTeamId : m.awayTeamId;
    if (cur === slot.teamId) continue; // sin cambios
    await db
      .update(matches)
      .set(
        slot.side === "home"
          ? { homeTeamId: slot.teamId }
          : { awayTeamId: slot.teamId },
      )
      .where(eq(matches.id, slot.matchId));
  }

  revalidatePath("/llaves");
  revalidatePath("/predicciones");
}
```

- [ ] **Step 2: Agregar validación de empate + avance en `confirmResult`**

En `confirmResult`, después del bloque que valida el rango del marcador (el `throw new Error("Marcador inválido")`) y ANTES del `await db.update(matches).set({ homeScore, awayScore, ... })`, insertar:

```ts
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new Error("Partido inexistente");
  if (isInvalidKnockoutDraw(match.stage, homeScore, awayScore)) {
    throw new Error(
      "En eliminatorias cargá el resultado con la definición ya reflejada (ej. 3-2); no puede quedar empate.",
    );
  }
```

Y al final de `confirmResult`, después del `for` que recalcula puntos y ANTES de los `revalidatePath`, insertar:

```ts
  await applyBracketAdvance();
```

(Los `revalidatePath` existentes de `confirmResult` se mantienen.)

- [ ] **Step 3: Agregar el action `assignThird`**

Agregar en `src/lib/actions.ts` (export de server action):

```ts
export async function assignThird(matchId: number, teamId: number) {
  await requireAdmin();
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new Error("Partido inexistente");
  if (match.stage !== "round_of_32") {
    throw new Error("El partido no es de dieciseisavos");
  }

  const side =
    match.homePlaceholder?.startsWith("3 ")
      ? "home"
      : match.awayPlaceholder?.startsWith("3 ")
        ? "away"
        : null;
  if (!side) throw new Error("Este partido no tiene un cupo de tercero");

  const placeholder = (side === "home" ? match.homePlaceholder : match.awayPlaceholder)!;
  // "3 A/B/C/D/F" -> ["A","B","C","D","F"]
  const allowedGroups = placeholder.slice(2).split("/").map((s) => s.trim());

  // El equipo debe ser el 3° de uno de los grupos permitidos (y ese grupo, listado).
  const standings = await getGroupStandings();
  const validThirds = new Set<number>();
  for (const g of standings) {
    if (allowedGroups.includes(g.label) && g.rows[2]) {
      validThirds.add(g.rows[2].teamId);
    }
  }
  if (!validThirds.has(teamId)) {
    throw new Error("Equipo inválido para este cupo de tercero");
  }

  await db
    .update(matches)
    .set(side === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId })
    .where(eq(matches.id, matchId));

  await applyBracketAdvance();
  revalidatePath("/admin");
}
```

> Nota: `GROUP_LABELS` se importó en el Step 1 porque lo usa `getThirdPlaceData` en Task 4 (mismo archivo de imports compartido no aplica — `getThirdPlaceData` vive en `queries.ts`). Si el linter marca `GROUP_LABELS` sin uso en `actions.ts`, quitar ese import de acá (pertenece a `queries.ts`).

- [ ] **Step 4: Mostrar el error de empate en `AdminMatchRow`**

En `src/components/AdminMatchRow.tsx`, reemplazar la función `submit` y agregar estado de error.

Agregar al estado (junto a los otros `useState`):

```ts
  const [error, setError] = useState<string | null>(null);
```

Reemplazar `submit`:

```ts
  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await confirmResult(matchId, Number(homeScore || 0), Number(awayScore || 0));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }
```

Y renderizar el error: envolver el `return (...)` para mostrarlo. Cambiar el `<div className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">` por un contenedor que incluya el mensaje debajo:

```tsx
  return (
    <div className="border-b py-2 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        {/* ...contenido actual sin el border-b/py-2 del div original... */}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
```

(Mover el contenido interno actual — el `<div className="min-w-0 flex-1">…`, los `Input`, el `span` y el `Button` — dentro del nuevo `<div className="flex flex-wrap items-center gap-2">`.)

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores. (Si `GROUP_LABELS` queda sin uso en `actions.ts`, quitar ese import — ver nota del Step 3.)

- [ ] **Step 6: Smoke manual (DB real, opcional pero recomendado)**

Con `.env.local` configurado y la base seedeada:

```bash
npm run dev
```

En `/admin`: cargar todos los resultados de un grupo (6 partidos) → verificar en `/llaves` que los cupos `1X`/`2X` de ese grupo aparecen poblados. Cargar un resultado de eliminatoria con empate (ej. `2-2`) → debe mostrar el mensaje de error y NO guardar.

- [ ] **Step 7: Commit**

```bash
git add src/lib/actions.ts src/components/AdminMatchRow.tsx
git commit -m "feat: avance automático de llaves al confirmar + assignThird + no-empate"
```

---

### Task 4: Query `getThirdPlaceData` + panel de terceros + wiring en admin

Deliverable: el admin puede asignar los 8 terceros desde `/admin`.

**Files:**
- Modify: `src/lib/queries.ts`
- Create: `src/components/ThirdPlacePanel.tsx`
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `rankThirdPlaces`, `type RankedThird` (Task 2); `getGroupStandings`, `getKnockoutMatches`, `GROUP_LABELS`; `assignThird` (Task 3).
- Produces:
  - En `queries.ts`: `async function getThirdPlaceData(): Promise<{ allComplete: boolean; ranking: RankedThird[]; slots: ThirdSlot[] }>` con `type ThirdSlot = { matchId: number; placeholder: string; allowedGroups: string[]; assignedTeamId: number | null; assignedName: string | null }`.

- [ ] **Step 1: Implementar `getThirdPlaceData` en `queries.ts`**

Agregar imports en `src/lib/queries.ts` (ya importa `computeGroupStandings`, `GROUP_LABELS`, `matches`, `teams`, `and`, `eq`):

```ts
import { rankThirdPlaces, type RankedThird } from "@/lib/bracket-advance";
```

Agregar al final del archivo:

```ts
export type ThirdSlot = {
  matchId: number;
  placeholder: string;
  allowedGroups: string[];
  assignedTeamId: number | null;
  assignedName: string | null;
};

export async function getThirdPlaceData(): Promise<{
  allComplete: boolean;
  ranking: RankedThird[];
  slots: ThirdSlot[];
}> {
  const standings = await getGroupStandings();

  const finishedGroup = await db
    .select({ groupLabel: matches.groupLabel })
    .from(matches)
    .where(and(eq(matches.stage, "group"), eq(matches.status, "finished")));
  const finishedCount = new Map<string, number>();
  for (const r of finishedGroup) {
    if (r.groupLabel) {
      finishedCount.set(r.groupLabel, (finishedCount.get(r.groupLabel) ?? 0) + 1);
    }
  }
  const allComplete = GROUP_LABELS.every((g) => (finishedCount.get(g) ?? 0) >= 6);

  const thirds = standings
    .map((g) => {
      const r = g.rows[2];
      return r
        ? {
            group: g.label,
            teamId: r.teamId,
            name: r.name,
            flag: r.flag,
            points: r.points,
            goalDiff: r.goalDiff,
            goalsFor: r.goalsFor,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  const ranking = rankThirdPlaces(thirds);

  const knockout = await getKnockoutMatches();
  const slots: ThirdSlot[] = knockout
    .filter(
      (m) =>
        m.stage === "round_of_32" &&
        (m.homePlaceholder?.startsWith("3 ") || m.awayPlaceholder?.startsWith("3 ")),
    )
    .map((m) => {
      const side = m.homePlaceholder?.startsWith("3 ") ? "home" : "away";
      const placeholder = (side === "home" ? m.homePlaceholder : m.awayPlaceholder)!;
      const assigned = side === "home" ? m.home : m.away;
      return {
        matchId: m.id,
        placeholder,
        allowedGroups: placeholder.slice(2).split("/").map((s) => s.trim()),
        assignedTeamId: side === "home" ? m.homeTeamId : m.awayTeamId,
        assignedName: assigned?.name ?? null,
      };
    });

  return { allComplete, ranking, slots };
}
```

- [ ] **Step 2: Crear el componente `ThirdPlacePanel`**

Crear `src/components/ThirdPlacePanel.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { assignThird } from "@/lib/actions";
import type { RankedThird } from "@/lib/bracket-advance";
import type { ThirdSlot } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";

export function ThirdPlacePanel({
  allComplete,
  ranking,
  slots,
}: {
  allComplete: boolean;
  ranking: RankedThird[];
  slots: ThirdSlot[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!allComplete) {
    return (
      <p className="text-sm text-muted-foreground">
        El panel de terceros se habilita cuando terminen los 12 grupos.
      </p>
    );
  }

  function assign(matchId: number, teamId: number) {
    setError(null);
    startTransition(async () => {
      try {
        await assignThird(matchId, teamId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al asignar");
      }
    });
  }

  const qualified = ranking.filter((r) => r.qualifies);

  return (
    <Card>
      <CardContent className="space-y-4 px-4 py-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mejores terceros
          </h3>
          <ol className="space-y-1 text-sm">
            {ranking.map((r) => (
              <li
                key={r.teamId}
                className={r.qualifies ? "" : "text-muted-foreground line-through"}
              >
                {r.rank}. {r.name} (Grupo {r.group}) · {r.points} pts · DG {r.goalDiff}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Asignar a cada cruce
          </h3>
          {slots.map((slot) => {
            const options = qualified.filter((r) =>
              slot.allowedGroups.includes(r.group),
            );
            return (
              <div key={slot.matchId} className="flex items-center gap-2 text-sm">
                <span className="w-40 font-mono text-xs text-muted-foreground">
                  {slot.placeholder}
                </span>
                <select
                  className="rounded border bg-background px-2 py-1 text-sm"
                  disabled={pending}
                  value={slot.assignedTeamId ?? ""}
                  onChange={(e) =>
                    e.target.value && assign(slot.matchId, Number(e.target.value))
                  }
                >
                  <option value="">— elegir —</option>
                  {options.map((o) => (
                    <option key={o.teamId} value={o.teamId}>
                      {o.name} (Grupo {o.group})
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Renderizar el panel en `/admin`**

En `src/app/admin/page.tsx`:

Agregar imports:

```ts
import { getMatchesOrdered, getThirdPlaceData } from "@/lib/queries";
import { ThirdPlacePanel } from "@/components/ThirdPlacePanel";
```

(reemplaza el import existente de `getMatchesOrdered` para incluir `getThirdPlaceData`.)

Cambiar la carga de datos para traer también los terceros:

```ts
  const allMatches = await getMatchesOrdered();
  const thirdData = await getThirdPlaceData();
```

Agregar una sección con el panel, justo antes del `<div className="space-y-6">` que lista las secciones de partidos:

```tsx
      <section className="mb-8">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Terceros clasificados
        </h2>
        <ThirdPlacePanel
          allComplete={thirdData.allComplete}
          ranking={thirdData.ranking}
          slots={thirdData.slots}
        />
      </section>
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Verificación visual del panel (harness, porque `/admin` es authed)**

Crear un harness HTML estático que reproduzca el markup del panel con datos de ejemplo (todos los grupos completos, 12 terceros, 8 slots) en el scratchpad, abrirlo y screenshotear para validar el layout antes de pedir refresh en vivo. Los routes con auth no se pueden screenshotear directamente (ver memoria del proyecto). Luego, con `npm run dev` y sesión de admin, verificar en vivo que asignar un tercero puebla el cupo en `/llaves`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/queries.ts src/components/ThirdPlacePanel.tsx src/app/admin/page.tsx
git commit -m "feat: panel de admin para asignar terceros (getThirdPlaceData + ThirdPlacePanel)"
```

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec:** resolver puro (Task 1) ✓; terceros ranking + no-empate (Task 2) ✓; `confirmResult` con validación + avance + `assignThird` (Task 3) ✓; panel de terceros + datos + wiring admin (Task 4) ✓; sin migración ✓; scoring sin cambios ✓ (no se toca `scorePrediction`); partido por 3er puesto y final automáticos ✓ (slots `loser`/`winner` en Task 1, test incluido).
- **Sin placeholders:** todos los pasos tienen el código real. No hay "TODO/TBD".
- **Consistencia de tipos:** `KnockoutMatchInput`, `ResolveInput`, `ResolvedSlot`, `RankedThird`, `ThirdSlot` se definen en Task 1-2/4 y se consumen con las mismas firmas en Task 3-4. `resolveBracket`, `rankThirdPlaces`, `isInvalidKnockoutDraw`, `assignThird`, `getThirdPlaceData` coinciden en definición y uso.

## Notas / decisiones diferidas

- **Override directo de equipos** (forzar saltando inputs): fuera de alcance. La corrección es vía inputs (recargar marcador / reasignar tercero), que re-derivan río abajo de forma idempotente.
- **Completitud de grupo en `assignThird`:** la validación principal es "ser 3° de un grupo permitido"; la completitud la garantiza el gating del panel (`allComplete`). Suficiente para v1.
