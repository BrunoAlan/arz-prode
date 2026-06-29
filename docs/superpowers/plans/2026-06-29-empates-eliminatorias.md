# Empates en eliminatorias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir cargar empates en eliminatorias y que el admin marque qué equipo avanza (penales), separando el marcador real de la definición.

**Architecture:** Se agrega una columna nullable `advancingTeamId` a `match`. La resolución de llaves (`resolveBracket`) usa ese campo para decidir el ganador/perdedor cuando un partido terminó empatado. Un helper puro (`validateKnockoutResult`) reemplaza la regla "empate = inválido". El admin elige el equipo que avanza en un selector inline en la misma fila de carga. Las vistas `/llaves` y `/partido/[id]` muestran la definición por penales.

**Tech Stack:** Next.js 16.2.7 (App Router, Server Actions), React 19.2.4, drizzle-orm 0.45.2 (Postgres/Neon), vitest 4.1.8, Tailwind v4.

## Global Constraints

- **La DB es producción (Neon, en vivo).** No hay DB de dev/test. No se hacen mutaciones de prueba contra prod. El `db:push` se corre **solo con OK explícito del usuario** (Task 8).
- **Next.js modificado:** este repo usa una versión de Next con cambios respecto al conocido. Para código Next-específico, consultar `node_modules/next/dist/docs/`. En este plan se replican patrones ya existentes en el repo (Server Actions + client components), así que el riesgo es bajo.
- **Commits:** conventional commits en español (`feat:`, `fix:`, `refactor:`), como el historial del repo.
- **Verificación por task:** cada task termina en verde con `npx tsc --noEmit` (0 errores) y `npx vitest run` (todos los tests pasando). Baseline actual: tsc limpio, 82 tests OK.
- **No tocar `scoring.ts` ni los pronósticos.** El alcance es solo marcador + equipo que avanza.

---

### Task 1: Resolución de empates definidos en `bracket-advance.ts`

Cuando un partido fuente terminó empatado, `outcome()` debe usar `advancingTeamId` para determinar ganador (y perdedor, que alimenta el cupo "Perdedor SF-…" del 3er puesto). El campo se agrega como **opcional** a `KnockoutMatchInput` para no romper el tipado de `actions.ts` antes de la Task 3.

**Files:**
- Modify: `src/lib/bracket-advance.ts`
- Test: `src/lib/bracket-advance.test.ts`

**Interfaces:**
- Produces: `KnockoutMatchInput` con campo nuevo `advancingTeamId?: number | null`. `resolveBracket(input)` sin cambios de firma; ahora resuelve empates con definición.

- [ ] **Step 1: Escribir el test que falla**

En `src/lib/bracket-advance.test.ts`, agregar `advancingTeamId: null` al objeto base del helper `mk` (queda explícito el default):

```ts
  return {
    id,
    stage: "round_of_32",
    homePlaceholder,
    awayPlaceholder,
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    advancingTeamId: null,
    finished: false,
    ...over,
  };
```

Y agregar este test dentro de `describe("resolveBracket", ...)`:

```ts
  it("empate definido propaga ganador al cruce siguiente y perdedor al 3er puesto", () => {
    // Dos semis empatadas, definidas por penales vía advancingTeamId.
    const knockout = [
      mk(101, "Ganador CF-97", "Ganador CF-98", {
        stage: "semi_final", homeTeamId: 11, awayTeamId: 12,
        homeScore: 1, awayScore: 1, advancingTeamId: 12, finished: true,
      }), // empate: avanza 12 (away)
      mk(102, "Ganador CF-99", "Ganador CF-100", {
        stage: "semi_final", homeTeamId: 21, awayTeamId: 22,
        homeScore: 0, awayScore: 0, advancingTeamId: 21, finished: true,
      }), // empate: avanza 21 (home)
      mk(103, "Perdedor SF-101", "Perdedor SF-102", { stage: "third_place" }),
      mk(104, "Ganador SF-101", "Ganador SF-102", { stage: "final" }),
    ];
    const slots = resolveBracket({ knockout, groupOrder: new Map() });
    expect(slots).toContainEqual({ matchId: 104, side: "home", teamId: 12 }); // ganador SF-101
    expect(slots).toContainEqual({ matchId: 104, side: "away", teamId: 21 }); // ganador SF-102
    expect(slots).toContainEqual({ matchId: 103, side: "home", teamId: 11 }); // perdedor SF-101
    expect(slots).toContainEqual({ matchId: 103, side: "away", teamId: 22 }); // perdedor SF-102
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/bracket-advance.test.ts -t "empate definido propaga"`
Expected: FAIL — hoy `outcome` devuelve `null` ante cualquier empate, así que no se emiten los slots 103/104.

- [ ] **Step 3: Implementar el cambio en `outcome` y el campo opcional**

En `src/lib/bracket-advance.ts`, agregar el campo a `KnockoutMatchInput` (después de `awayScore`):

```ts
  homeScore: number | null;
  awayScore: number | null;
  advancingTeamId?: number | null;
  finished: boolean;
```

Y reemplazar la función `outcome` completa por:

```ts
  // Ganador / perdedor de un partido fuente (por número de cuadro).
  const outcome = (from: number, want: "winner" | "loser"): number | null => {
    const src = numberToDb.get(from);
    if (!src || !src.finished) return null;
    if (src.homeScore == null || src.awayScore == null) return null;
    const t = teamOf.get(src.id);
    if (!t || t.home == null || t.away == null) return null;
    let winner: number;
    let loser: number;
    if (src.homeScore === src.awayScore) {
      // Empate: lo define el equipo que el admin marcó como avanzando (penales).
      if (src.advancingTeamId == null) return null; // sin definición => no resoluble.
      if (src.advancingTeamId !== t.home && src.advancingTeamId !== t.away) {
        return null; // definición inconsistente con los equipos del partido.
      }
      winner = src.advancingTeamId;
      loser = src.advancingTeamId === t.home ? t.away : t.home;
    } else {
      const homeWon = src.homeScore > src.awayScore;
      winner = homeWon ? t.home : t.away;
      loser = homeWon ? t.away : t.home;
    }
    return want === "winner" ? winner : loser;
  };
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run src/lib/bracket-advance.test.ts`
Expected: PASS (incluido el test viejo "no resuelve ganador si el partido fuente está empatado", que sigue valiendo porque su `mk` no define `advancingTeamId`).

Run: `npx tsc --noEmit`
Expected: 0 errores (el campo es opcional, así que el literal de `actions.ts` aún tipa).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bracket-advance.ts src/lib/bracket-advance.test.ts
git commit -m "feat: resolver empates de eliminatoria con el equipo que avanza (penales)"
```

---

### Task 2: Helper de validación `validateKnockoutResult`

Helper puro que centraliza la regla nueva: en grupos el empate es libre; en eliminatoria el empate exige un `advancingTeamId` válido; el no-empate normaliza el avance a `null`.

**Files:**
- Modify: `src/lib/bracket-advance.ts`
- Test: `src/lib/bracket-advance.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type KnockoutResultValidation =
    | { ok: true; advancingTeamId: number | null }
    | { ok: false; error: string };
  function validateKnockoutResult(args: {
    stage: string;
    homeScore: number;
    awayScore: number;
    advancingTeamId: number | null | undefined;
    homeTeamId: number | null;
    awayTeamId: number | null;
  }): KnockoutResultValidation;
  ```

- [ ] **Step 1: Escribir el test que falla**

Agregar al import del test (`src/lib/bracket-advance.test.ts`) el nombre `validateKnockoutResult`:

```ts
import {
  resolveBracket,
  rankThirdPlaces,
  isInvalidKnockoutDraw,
  validateKnockoutResult,
  type KnockoutMatchInput,
  type ThirdPlaceInput,
} from "./bracket-advance";
```

Y agregar este bloque al final del archivo:

```ts
describe("validateKnockoutResult", () => {
  const teams = { homeTeamId: 10, awayTeamId: 20 };

  it("grupo: empate OK y avance se normaliza a null", () => {
    expect(
      validateKnockoutResult({ stage: "group", homeScore: 1, awayScore: 1, advancingTeamId: null, ...teams }),
    ).toEqual({ ok: true, advancingTeamId: null });
  });

  it("eliminatoria con ganador por marcador: avance se fuerza a null", () => {
    expect(
      validateKnockoutResult({ stage: "final", homeScore: 2, awayScore: 1, advancingTeamId: 10, ...teams }),
    ).toEqual({ ok: true, advancingTeamId: null });
  });

  it("eliminatoria + empate sin avance: error", () => {
    const r = validateKnockoutResult({ stage: "round_of_16", homeScore: 1, awayScore: 1, advancingTeamId: null, ...teams });
    expect(r.ok).toBe(false);
  });

  it("eliminatoria + empate: el avance debe ser uno de los dos equipos", () => {
    const r = validateKnockoutResult({ stage: "round_of_16", homeScore: 1, awayScore: 1, advancingTeamId: 99, ...teams });
    expect(r.ok).toBe(false);
  });

  it("eliminatoria + empate con avance válido: ok y conserva el id", () => {
    expect(
      validateKnockoutResult({ stage: "final", homeScore: 0, awayScore: 0, advancingTeamId: 20, ...teams }),
    ).toEqual({ ok: true, advancingTeamId: 20 });
  });

  it("eliminatoria + empate sin equipos asignados: error", () => {
    const r = validateKnockoutResult({ stage: "quarter_final", homeScore: 1, awayScore: 1, advancingTeamId: 10, homeTeamId: null, awayTeamId: null });
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/bracket-advance.test.ts -t "validateKnockoutResult"`
Expected: FAIL — `validateKnockoutResult` no existe todavía (error de import/referencia).

- [ ] **Step 3: Implementar el helper**

Agregar al final de `src/lib/bracket-advance.ts` (debajo de `isInvalidKnockoutDraw`, que se mantiene por ahora):

```ts
export type KnockoutResultValidation =
  | { ok: true; advancingTeamId: number | null }
  | { ok: false; error: string };

/**
 * Valida el resultado de una eliminatoria y normaliza el equipo que avanza.
 * - Grupo o no-empate: avance => null.
 * - Eliminatoria + empate: exige advancingTeamId y que sea uno de los dos equipos.
 */
export function validateKnockoutResult(args: {
  stage: string;
  homeScore: number;
  awayScore: number;
  advancingTeamId: number | null | undefined;
  homeTeamId: number | null;
  awayTeamId: number | null;
}): KnockoutResultValidation {
  const { stage, homeScore, awayScore, advancingTeamId, homeTeamId, awayTeamId } = args;
  const isDraw = homeScore === awayScore;

  if (stage === "group" || !isDraw) {
    return { ok: true, advancingTeamId: null };
  }
  if (homeTeamId == null || awayTeamId == null) {
    return { ok: false, error: "Asigná los equipos antes de cargar un empate en eliminatorias." };
  }
  if (advancingTeamId == null) {
    return { ok: false, error: "Definí qué equipo avanza por penales." };
  }
  if (advancingTeamId !== homeTeamId && advancingTeamId !== awayTeamId) {
    return { ok: false, error: "El equipo que avanza debe ser uno de los dos del partido." };
  }
  return { ok: true, advancingTeamId };
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx vitest run src/lib/bracket-advance.test.ts`
Expected: PASS (los 6 casos nuevos + todo lo anterior).

Run: `npx tsc --noEmit`
Expected: 0 errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bracket-advance.ts src/lib/bracket-advance.test.ts
git commit -m "feat: validateKnockoutResult para empates de eliminatoria"
```

---

### Task 3: Schema + `confirmResult` y baja de `isInvalidKnockoutDraw`

Agrega la columna a `match`, cambia `confirmResult` para tomar/validar/persistir el equipo que avanza, mapea el campo en `applyBracketAdvance`, y elimina `isInvalidKnockoutDraw` (y sus tests viejos).

**Files:**
- Modify: `src/db/schema.ts:83-96`
- Modify: `src/lib/actions.ts`
- Modify: `src/lib/bracket-advance.ts` (eliminar `isInvalidKnockoutDraw`)
- Test: `src/lib/bracket-advance.test.ts` (eliminar el `describe("isInvalidKnockoutDraw")` y su import)

**Interfaces:**
- Consumes: `validateKnockoutResult` (Task 2), `resolveBracket` con `advancingTeamId` (Task 1).
- Produces: `confirmResult(matchId: number, homeScore: number, awayScore: number, advancingTeamId?: number | null)`. Columna `matches.advancingTeamId` disponible en `matches.$inferSelect` (y por ende en `MatchRow`).

- [ ] **Step 1: Agregar la columna al schema**

En `src/db/schema.ts`, dentro de `export const matches = pgTable("match", { ... })`, agregar la columna después de `awayScore`:

```ts
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  advancingTeamId: integer("advancing_team_id").references(() => teams.id),
});
```

(La tabla `teams` ya está declarada antes que `matches`, así que la FK por callback es válida. NO se corre `db:push` todavía — eso es la Task 8.)

- [ ] **Step 2: Actualizar `actions.ts`**

En `src/lib/actions.ts`:

1. Cambiar el import:

```ts
import { resolveBracket, validateKnockoutResult } from "@/lib/bracket-advance";
```

2. Cambiar la firma de `confirmResult` para aceptar el equipo que avanza:

```ts
export async function confirmResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
  advancingTeamId?: number | null,
) {
```

3. Reemplazar el bloque contiguo que va **desde** `const match = await db.query.matches.findFirst(...)` **hasta el cierre** del `if (isInvalidKnockoutDraw(...)) { throw ... }` por este (deja intacto el bloque de "Marcador inválido" que está arriba; no duplicar el lookup de `match`):

```ts
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new Error("Partido inexistente");

  const validation = validateKnockoutResult({
    stage: match.stage,
    homeScore,
    awayScore,
    advancingTeamId,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  });
  if (!validation.ok) throw new Error(validation.error);
```

4. Persistir el avance normalizado en el `update`:

```ts
  await db
    .update(matches)
    .set({
      homeScore,
      awayScore,
      status: "finished",
      advancingTeamId: validation.advancingTeamId,
    })
    .where(eq(matches.id, matchId));
```

5. En `applyBracketAdvance`, agregar `advancingTeamId` al `.map` que arma el input de `resolveBracket`:

```ts
    knockout: knockout.map((m) => ({
      id: m.id,
      stage: m.stage,
      homePlaceholder: m.homePlaceholder,
      awayPlaceholder: m.awayPlaceholder,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      advancingTeamId: m.advancingTeamId,
      finished: m.status === "finished",
    })),
```

- [ ] **Step 3: Eliminar `isInvalidKnockoutDraw` y sus tests**

En `src/lib/bracket-advance.ts`, eliminar la función `isInvalidKnockoutDraw` completa (las líneas del `export function isInvalidKnockoutDraw(...) { ... }`).

En `src/lib/bracket-advance.test.ts`:
- Quitar `isInvalidKnockoutDraw` del import (dejar `resolveBracket`, `rankThirdPlaces`, `validateKnockoutResult`, y los tipos).
- Borrar el bloque `describe("isInvalidKnockoutDraw", () => { ... })` completo.

- [ ] **Step 4: Verificar tipado y tests**

Run: `npx tsc --noEmit`
Expected: 0 errores (ningún archivo importa ya `isInvalidKnockoutDraw`; `confirmResult` y el map tipan con la columna nueva).

Run: `npx vitest run`
Expected: PASS — todos los tests, sin el `describe` borrado.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/lib/actions.ts src/lib/bracket-advance.ts src/lib/bracket-advance.test.ts
git commit -m "feat: confirmResult valida y persiste el equipo que avanza por penales"
```

---

### Task 4: Selector inline de avance en `AdminMatchRow` + página admin

Cuando el stage es de eliminatoria y el marcador tipeado queda empatado, aparece en la misma fila un selector "Avanza: Local / Visitante". Bloquea el submit si falta elegir.

**Files:**
- Modify: `src/components/AdminMatchRow.tsx`
- Modify: `src/app/admin/page.tsx:88-100`

**Interfaces:**
- Consumes: `confirmResult(matchId, homeScore, awayScore, advancingTeamId?)` (Task 3).
- Produces: `AdminMatchRow` con props nuevas `stage: string`, `homeTeamId: number | null`, `awayTeamId: number | null`, `initialAdvancingTeamId: number | null`.

- [ ] **Step 1: Reescribir `AdminMatchRow.tsx`**

Reemplazar el contenido completo de `src/components/AdminMatchRow.tsx` por:

```tsx
"use client";

import { useState, useTransition } from "react";
import { confirmResult } from "@/lib/actions";
import { TeamLabel } from "@/components/TeamLabel";
import { LocalTime } from "@/components/LocalTime";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TeamLite = { name: string; flag: string | null };

export function AdminMatchRow({
  matchId,
  kickoffIso,
  stage,
  home,
  away,
  homeTeamId,
  awayTeamId,
  homePlaceholder,
  awayPlaceholder,
  initialHome,
  initialAway,
  initialAdvancingTeamId,
  finished,
}: {
  matchId: number;
  kickoffIso: string;
  stage: string;
  home: TeamLite | null;
  away: TeamLite | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  initialHome: number | null;
  initialAway: number | null;
  initialAdvancingTeamId: number | null;
  finished: boolean;
}) {
  const [homeScore, setHomeScore] = useState(initialHome?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(initialAway?.toString() ?? "");
  const [advancingTeamId, setAdvancingTeamId] = useState<number | null>(
    initialAdvancingTeamId,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isKnockout = stage !== "group";
  const bothFilled = homeScore !== "" && awayScore !== "";
  const isDraw = bothFilled && Number(homeScore) === Number(awayScore);
  const showAdvancer =
    isKnockout && isDraw && homeTeamId != null && awayTeamId != null;

  function submit() {
    setError(null);
    if (showAdvancer && advancingTeamId == null) {
      setError("Elegí qué equipo avanza por penales");
      return;
    }
    startTransition(async () => {
      try {
        await confirmResult(
          matchId,
          Number(homeScore || 0),
          Number(awayScore || 0),
          showAdvancer ? advancingTeamId : null,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="border-b py-2 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">
            <LocalTime iso={kickoffIso} />
          </div>
          <div className="truncate text-sm">
            <TeamLabel team={home} placeholder={homePlaceholder} />
            <span className="text-muted-foreground"> vs </span>
            <TeamLabel team={away} placeholder={awayPlaceholder} />
          </div>
        </div>
        <Input
          type="number"
          min={0}
          value={homeScore}
          disabled={pending}
          onChange={(e) => setHomeScore(e.target.value)}
          className="w-12 text-center font-mono tabular-nums"
        />
        <span className="text-muted-foreground">:</span>
        <Input
          type="number"
          min={0}
          value={awayScore}
          disabled={pending}
          onChange={(e) => setAwayScore(e.target.value)}
          className="w-12 text-center font-mono tabular-nums"
        />
        <Button
          onClick={submit}
          disabled={pending}
          size="sm"
          variant={finished ? "secondary" : "default"}
        >
          {pending ? "…" : finished ? "Actualizar" : "Confirmar"}
        </Button>

        {showAdvancer && (
          <div className="flex w-full flex-wrap items-center gap-4 pl-1 text-xs">
            <span className="text-muted-foreground">Avanza por penales:</span>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`adv-${matchId}`}
                checked={advancingTeamId === homeTeamId}
                onChange={() => setAdvancingTeamId(homeTeamId)}
                disabled={pending}
              />
              {home?.name ?? "Local"}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`adv-${matchId}`}
                checked={advancingTeamId === awayTeamId}
                onChange={() => setAdvancingTeamId(awayTeamId)}
                disabled={pending}
              />
              {away?.name ?? "Visitante"}
            </label>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Pasar las props nuevas desde la página admin**

En `src/app/admin/page.tsx`, reemplazar el `<AdminMatchRow ... />` por:

```tsx
                {section.matches.map((m) => (
                  <AdminMatchRow
                    key={m.id}
                    matchId={m.id}
                    kickoffIso={m.kickoffAt.toISOString()}
                    stage={m.stage}
                    home={m.home}
                    away={m.away}
                    homeTeamId={m.homeTeamId}
                    awayTeamId={m.awayTeamId}
                    homePlaceholder={m.homePlaceholder}
                    awayPlaceholder={m.awayPlaceholder}
                    initialHome={m.homeScore}
                    initialAway={m.awayScore}
                    initialAdvancingTeamId={m.advancingTeamId}
                    finished={m.status === "finished"}
                  />
                ))}
```

- [ ] **Step 3: Verificar tipado y tests**

Run: `npx tsc --noEmit`
Expected: 0 errores (`m` es `MatchRow`, que ya incluye `stage`, `homeTeamId`, `awayTeamId`, `advancingTeamId`).

Run: `npx vitest run`
Expected: PASS (sin cambios de tests; verificación visual en Task 7).

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminMatchRow.tsx src/app/admin/page.tsx
git commit -m "feat: selector inline de avance por penales en la carga de resultados"
```

---

### Task 5: Display de la definición en `/llaves`

El card del cuadro resalta el equipo que avanzó y muestra un tag "(pen.)" cuando el partido terminó empatado y hay definición.

**Files:**
- Modify: `src/components/BracketMatchCard.tsx`
- Modify: `src/app/llaves/page.tsx:28-49`

**Interfaces:**
- Produces: `BracketCardData` con campo nuevo `advancingSide: "home" | "away" | null`.

- [ ] **Step 1: Agregar `advancingSide` y el resaltado en `BracketMatchCard.tsx`**

En `src/components/BracketMatchCard.tsx`:

1. Agregar el campo al tipo `BracketCardData` (después de `finished: boolean;`):

```ts
  finished: boolean;
  advancingSide: "home" | "away" | null;
```

2. Reemplazar el componente `Row` por una versión que acepta `advancing`:

```tsx
function Row({
  team,
  placeholder,
  score,
  finished,
  advancing,
}: {
  team: TeamLite | null;
  placeholder: string;
  score: number | null;
  finished: boolean;
  advancing?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <TeamLabel
        team={team}
        placeholder={placeholder}
        className={`min-w-0 truncate ${advancing ? "font-semibold" : ""}`}
      />
      <span className="flex items-center gap-1">
        {advancing && (
          <span className="rounded bg-muted px-1 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
            pen.
          </span>
        )}
        <span className="font-mono tabular-nums text-muted-foreground">
          {finished && score != null ? score : "–"}
        </span>
      </span>
    </div>
  );
}
```

3. En `BracketMatchCard`, pasar `advancing` a cada `Row`:

```tsx
      <Row
        team={data.home}
        placeholder={data.homePlaceholder}
        score={data.homeScore}
        finished={data.finished}
        advancing={data.finished && data.advancingSide === "home"}
      />
      <Row
        team={data.away}
        placeholder={data.awayPlaceholder}
        score={data.awayScore}
        finished={data.finished}
        advancing={data.finished && data.advancingSide === "away"}
      />
```

- [ ] **Step 2: Calcular `advancingSide` en `toCard` (`llaves/page.tsx`)**

En `src/app/llaves/page.tsx`, dentro de `toCard`, agregar el cálculo antes del `return` y el campo en el objeto devuelto:

```tsx
  function toCard(node: BracketNode): BracketCardData {
    const m = matchByKey.get(key(node.homePlaceholder, node.awayPlaceholder)) ?? null;
    const pred = m ? preds.get(m.id) ?? null : null;
    const advancingSide: "home" | "away" | null =
      m && m.advancingTeamId != null
        ? m.advancingTeamId === m.homeTeamId
          ? "home"
          : m.advancingTeamId === m.awayTeamId
            ? "away"
            : null
        : null;
    return {
      matchId: m?.id ?? null,
      kickoffIso: m ? m.kickoffAt.toISOString() : null,
      home: m?.home ?? null,
      away: m?.away ?? null,
      homePlaceholder: node.homePlaceholder,
      awayPlaceholder: node.awayPlaceholder,
      homeScore: m?.homeScore ?? null,
      awayScore: m?.awayScore ?? null,
      finished: m?.status === "finished",
      advancingSide,
      pred: pred
        ? {
            homeScorePred: pred.homeScorePred,
            awayScorePred: pred.awayScorePred,
            points: pred.points,
          }
        : null,
    };
  }
```

- [ ] **Step 3: Verificar tipado y tests**

Run: `npx tsc --noEmit`
Expected: 0 errores.

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/BracketMatchCard.tsx src/app/llaves/page.tsx
git commit -m "feat: marca (pen.) y resalta al equipo que avanza en el cuadro de llaves"
```

---

### Task 6: Display en `/partido/[id]`

Mostrar bajo el marcador, cuando el partido terminó empatado y hay definición, "{Equipo} avanza por penales".

**Files:**
- Modify: `src/app/partido/[id]/page.tsx:33-38`

**Interfaces:**
- Consumes: `match.advancingTeamId`, `match.homeTeamId`, `match.awayTeamId`, `match.home`, `match.away` (todos en `MatchRow`).

- [ ] **Step 1: Agregar la línea de "avanza por penales"**

En `src/app/partido/[id]/page.tsx`, justo después del `</div>` que cierra el bloque flex del título+marcador (la línea 38, antes del `<h2>` de Pronósticos), agregar:

```tsx
      {match.status === "finished" &&
        match.homeScore === match.awayScore &&
        match.advancingTeamId != null && (
          <p className="mt-1 text-sm text-muted-foreground">
            {(match.advancingTeamId === match.homeTeamId
              ? match.home
              : match.away)?.name}{" "}
            avanza por penales
          </p>
        )}
```

- [ ] **Step 2: Verificar tipado y tests**

Run: `npx tsc --noEmit`
Expected: 0 errores.

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/partido/[id]/page.tsx
git commit -m "feat: detalle de partido muestra el avance por penales"
```

---

### Task 7: Verificación visual con harness

Las rutas con auth no se pueden screenshotear directo, así que se valida el layout con un harness HTML estático que reproduce los tres cambios visuales. No produce cambios en el repo (el harness vive en scratchpad).

**Files:**
- Create: `<scratchpad>/empates-harness.html` (fuera del repo)

- [ ] **Step 1: Crear el harness**

Crear un HTML estático en el scratchpad que reproduzca, con Tailwind por CDN o estilos inline equivalentes, tres bloques:
1. Una fila de admin con marcador empatado (ej. `1 : 1`) mostrando el selector "Avanza por penales: ◉ Argentina ◯ Brasil".
2. Un card de llave terminado en empate, con el equipo que avanza en negrita y el tag "pen." al lado del marcador.
3. El encabezado de `/partido/[id]` con el marcador y debajo "Argentina avanza por penales".

Copiar las clases exactas de `AdminMatchRow.tsx`, `BracketMatchCard.tsx` y `partido/[id]/page.tsx` para que el harness refleje el markup real.

- [ ] **Step 2: Screenshot y revisión**

Abrir el harness en el browser (tool `navigate` → `file://<ruta>`), tomar screenshot y verificar:
- El selector de avance aparece en su propia línea, legible, alineado bajo los inputs.
- El tag "pen." no rompe el layout del card ni pisa el marcador.
- La línea "avanza por penales" se lee clara bajo el marcador.

Si algo se ve mal, ajustar las clases en el componente correspondiente (Tasks 4/5/6) y re-commitear ahí.

- [ ] **Step 3: (sin commit)**

El harness es temporal; no se commitea nada salvo que un ajuste de clases requiera enmendar un componente.

---

### Task 8: `db:push` a producción (gated)

Aplicar la columna `advancing_team_id` a la DB productiva. **Es el único cambio destructivo-potencial del plan y requiere OK explícito del usuario.**

**Files:** (ninguno; operación de DB)

- [ ] **Step 1: STOP — pedir OK explícito**

Antes de tocar la DB, confirmar con el usuario que se va a correr `db:push` contra **producción**. No avanzar sin un "sí" explícito. Recordar: la columna es **aditiva y nullable** (filas existentes → NULL, sin pérdida de datos).

- [ ] **Step 2: Revisar el plan de drizzle y aplicar**

Run: `npm run db:push`
(Si el script no levanta la env de prod automáticamente, correr `npx drizzle-kit push` con `DATABASE_URL` de producción en el entorno, igual que para otros cambios de schema del proyecto.)

Antes de confirmar cualquier prompt de drizzle, **verificar que el único cambio listado es `ALTER TABLE "match" ADD COLUMN "advancing_team_id"`** (con su FK). Si aparece cualquier otro cambio inesperado (drift), abortar y avisar al usuario.

- [ ] **Step 3: Confirmar sincronización**

Run: `npm run db:push` (segunda vez)
Expected: drizzle reporta que no hay cambios pendientes (schema en sync). No crear partidos ni resultados de prueba en prod: la confianza funcional viene de los unit tests + harness, y la primera carga real de un empate de eliminatoria es la verificación en vivo.

---

## Cierre (workflow)

Tras completar las tasks 1–8, seguir el workflow de git del usuario: mergear `feat/empates-eliminatorias` a `main` localmente y **confirmar antes de hacer `git push`**.

## Self-Review (cobertura del spec)

- Modelo de datos (`advancingTeamId` nullable) → Task 3 (schema) + Task 8 (push). ✅
- Resolución de llaves con empate definido (winner + loser) → Task 1. ✅
- Validación que reemplaza `isInvalidKnockoutDraw` → Task 2 (helper) + Task 3 (uso y baja). ✅
- `confirmResult` con `advancingTeamId` → Task 3. ✅
- UI admin inline → Task 4. ✅
- Display `/llaves` (tag "pen." + resaltado) → Task 5. ✅
- Display `/partido/[id]` → Task 6. ✅
- Tests vitest (resolución + validación) → Tasks 1 y 2. ✅
- Verificación visual por harness → Task 7. ✅
- Grupos sin cambios / pronósticos sin cambios (`scoring.ts` intacto) → respetado en todas las tasks. ✅
