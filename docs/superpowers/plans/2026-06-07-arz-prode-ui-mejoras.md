# Arz Prode · Mejoras de UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar banderas, horario en la zona del usuario, agrupación de partidos por grupo/ronda en todas las vistas, y una página de llaves (bracket) con resultados + pronóstico.

**Architecture:** Componentes presentacionales chicos (`TeamLabel`, `LocalTime`, `BracketMatchCard`) + lógica pura testeable (`formatKickoff` con timezone, `groupMatches`, `buildBracket`). El bracket se deriva del fixture parseando los placeholders existentes — sin cambios de schema ni re-seed. La hora local se resuelve en el cliente (el server no conoce la zona del usuario).

**Tech Stack:** Next.js 16 (App Router, RSC + client islands), TypeScript, Tailwind v4 + shadcn/ui, Drizzle/Neon, Vitest.

**Spec:** `docs/superpowers/specs/2026-06-07-arz-prode-ui-mejoras-design.md`

---

## File Structure

**Nuevos**
- `src/components/TeamLabel.tsx` — bandera + nombre (o placeholder). Presentacional, sin hooks.
- `src/components/LocalTime.tsx` — `<time>` con hora en la zona del navegador (client).
- `src/lib/group-matches.ts` (+ `.test.ts`) — agrupar partidos por grupo/ronda.
- `src/lib/bracket.ts` (+ `.test.ts`) — derivar el árbol de eliminatorias del fixture.
- `src/components/BracketMatchCard.tsx` — card de una llave (compartida desktop/mobile) + tipos de view-model.
- `src/components/Bracket.tsx` — bracket desktop (columnas + líneas), `hidden md:block`.
- `src/components/BracketTabs.tsx` — bracket mobile (pestañas por ronda), `md:hidden` (client).
- `src/app/llaves/page.tsx` — arma el view-model y renderiza ambos layouts.

**Modificados**
- `src/lib/format.ts` — `formatKickoff(date, timeZone?)` + sigla de zona.
- `src/lib/queries.ts` — `getKnockoutMatches()`.
- `src/app/partido/[id]/page.tsx` — `TeamLabel` + `LocalTime`.
- `src/app/predicciones/page.tsx` — secciones + chip-nav + `TeamLabel` + `LocalTime`.
- `src/app/admin/page.tsx` — secciones por grupo/ronda.
- `src/components/AdminMatchRow.tsx` — props estructuradas, `TeamLabel` + `LocalTime`.
- `src/app/layout.tsx` — link "Llaves" en el header.
- `src/middleware.ts` — matcher `/llaves`.

---

### Task 1: `formatKickoff` con timezone y sigla de zona

**Files:**
- Modify: `src/lib/format.ts`
- Test: `src/lib/format.test.ts` (crear)

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatKickoff } from "./format";

const KICKOFF = new Date("2026-06-11T19:00:00Z"); // 16:00 en Buenos Aires (UTC-3)

describe("formatKickoff", () => {
  it("usa Buenos Aires por defecto e incluye sigla de zona", () => {
    const s = formatKickoff(KICKOFF);
    expect(s).toContain("16:00");
    expect(s).toMatch(/GMT|ART|UTC/); // la sigla exacta depende del runtime ICU
  });

  it("respeta una zona horaria explícita", () => {
    const s = formatKickoff(KICKOFF, "America/Mexico_City"); // UTC-6 → 13:00
    expect(s).toContain("13:00");
  });

  it("usa formato 24h (sin AM/PM)", () => {
    const s = formatKickoff(new Date("2026-06-11T23:00:00Z")); // 20:00 en BA
    expect(s).toContain("20:00");
    expect(s).not.toMatch(/[ap]\.?\s?m\.?/i);
  });
});
```

- [ ] **Step 2: Correr el test y verque falle**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — `formatKickoff` no acepta segundo argumento / falta la sigla de zona.

- [ ] **Step 3: Implementar el cambio mínimo**

Reemplazar el contenido de `src/lib/format.ts`:

```ts
export const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function formatKickoff(
  date: Date,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts
git commit -m "feat: formatKickoff acepta timezone y muestra la sigla de zona"
```

---

### Task 2: Componente `TeamLabel`

**Files:**
- Create: `src/components/TeamLabel.tsx`

- [ ] **Step 1: Implementar el componente**

Crear `src/components/TeamLabel.tsx`:

```tsx
type TeamLite = { name: string; flag: string | null };

export function TeamLabel({
  team,
  placeholder,
  className,
}: {
  team: TeamLite | null;
  placeholder?: string | null;
  className?: string;
}) {
  if (!team) {
    return (
      <span className={`text-muted-foreground ${className ?? ""}`}>
        {placeholder ?? "?"}
      </span>
    );
  }
  return (
    <span className={className}>
      {team.flag && (
        <span aria-hidden className="mr-1.5">
          {team.flag}
        </span>
      )}
      {team.name}
    </span>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/TeamLabel.tsx
git commit -m "feat: componente TeamLabel (bandera + nombre o placeholder)"
```

---

### Task 3: Componente `LocalTime`

**Files:**
- Create: `src/components/LocalTime.tsx`

- [ ] **Step 1: Implementar el componente**

Crear `src/components/LocalTime.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { formatKickoff } from "@/lib/format";

export function LocalTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  // SSR y primer render de cliente usan el fallback determinista (Buenos Aires),
  // así no hay mismatch de hidratación. El effect lo pasa a la zona real del navegador.
  const [text, setText] = useState(() => formatKickoff(new Date(iso)));

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setText(formatKickoff(new Date(iso), tz));
  }, [iso]);

  return (
    <time dateTime={iso} suppressHydrationWarning className={className}>
      {text}
    </time>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/LocalTime.tsx
git commit -m "feat: componente LocalTime (hora en la zona del navegador)"
```

---

### Task 4: Integrar `TeamLabel` + `LocalTime` en la página de Partido

**Files:**
- Modify: `src/app/partido/[id]/page.tsx`

- [ ] **Step 1: Reemplazar el archivo**

Reemplazar el contenido de `src/app/partido/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getMatchById, getPredictionsForMatch } from "@/lib/queries";
import { isLocked } from "@/lib/match-rules";
import { TeamLabel } from "@/components/TeamLabel";
import { LocalTime } from "@/components/LocalTime";
import { Card, CardContent } from "@/components/ui/card";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const match = await getMatchById(Number(id));
  if (!match) notFound();

  const locked = isLocked(match, new Date());
  const preds = locked ? await getPredictionsForMatch(match.id) : [];

  return (
    <div className="animate-rise">
      <div className="text-sm text-muted-foreground">
        <LocalTime iso={match.kickoffAt.toISOString()} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          <TeamLabel team={match.home} placeholder={match.homePlaceholder} />{" "}
          <span className="text-muted-foreground">vs</span>{" "}
          <TeamLabel team={match.away} placeholder={match.awayPlaceholder} />
        </h1>
        {match.status === "finished" && (
          <span className="font-mono text-3xl font-semibold tabular-nums">
            {match.homeScore}:{match.awayScore}
          </span>
        )}
      </div>

      <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pronósticos
      </h2>
      {!locked ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Los pronósticos se revelan cuando empieza el partido.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-lg border">
          {preds.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium">{p.userName}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono tabular-nums">
                  {p.homeScorePred}:{p.awayScorePred}
                </span>
                {p.points != null && (
                  <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                    +{p.points}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/partido/[id]/page.tsx
git commit -m "feat: banderas y hora local en la página de partido"
```

---

### Task 5: Util `groupMatches`

**Files:**
- Create: `src/lib/group-matches.ts`
- Test: `src/lib/group-matches.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/group-matches.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { groupMatches } from "./group-matches";

function m(stage: string, groupLabel: string | null, iso: string) {
  return { stage, groupLabel, kickoffAt: new Date(iso) };
}

describe("groupMatches", () => {
  it("pone los grupos A..L antes que las rondas de eliminatoria", () => {
    const secs = groupMatches([
      m("final", null, "2026-07-19T19:00:00Z"),
      m("group", "B", "2026-06-12T19:00:00Z"),
      m("group", "A", "2026-06-11T19:00:00Z"),
      m("round_of_32", null, "2026-06-28T19:00:00Z"),
    ]);
    expect(secs.map((s) => s.key)).toEqual(["grupo-a", "grupo-b", "r32", "final"]);
    expect(secs[0].title).toBe("Grupo A");
  });

  it("ordena los partidos de una sección por horario", () => {
    const secs = groupMatches([
      m("group", "A", "2026-06-25T01:00:00Z"),
      m("group", "A", "2026-06-11T19:00:00Z"),
    ]);
    expect(secs).toHaveLength(1);
    expect(secs[0].matches.map((x) => x.kickoffAt.toISOString())).toEqual([
      "2026-06-11T19:00:00.000Z",
      "2026-06-25T01:00:00.000Z",
    ]);
  });

  it("omite las secciones vacías", () => {
    const secs = groupMatches([m("group", "C", "2026-06-13T22:00:00Z")]);
    expect(secs.map((s) => s.key)).toEqual(["grupo-c"]);
  });

  it("respeta el orden de rondas r32 → final", () => {
    const secs = groupMatches([
      m("final", null, "2026-07-19T19:00:00Z"),
      m("semi_final", null, "2026-07-14T19:00:00Z"),
      m("third_place", null, "2026-07-18T21:00:00Z"),
      m("round_of_16", null, "2026-07-04T17:00:00Z"),
      m("quarter_final", null, "2026-07-09T20:00:00Z"),
      m("round_of_32", null, "2026-06-28T19:00:00Z"),
    ]);
    expect(secs.map((s) => s.key)).toEqual(["r32", "r16", "qf", "sf", "third", "final"]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/group-matches.test.ts`
Expected: FAIL — `groupMatches` no existe.

- [ ] **Step 3: Implementar el util**

Crear `src/lib/group-matches.ts`:

```ts
type Groupable = {
  stage: string;
  groupLabel: string | null;
  kickoffAt: Date;
};

export type MatchSection<T> = {
  key: string;
  title: string;
  matches: T[];
};

const GROUP_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const KNOCKOUT_ORDER: { stage: string; key: string; title: string }[] = [
  { stage: "round_of_32", key: "r32", title: "Dieciseisavos" },
  { stage: "round_of_16", key: "r16", title: "Octavos de final" },
  { stage: "quarter_final", key: "qf", title: "Cuartos de final" },
  { stage: "semi_final", key: "sf", title: "Semifinales" },
  { stage: "third_place", key: "third", title: "Tercer puesto" },
  { stage: "final", key: "final", title: "Final" },
];

export function groupMatches<T extends Groupable>(matches: T[]): MatchSection<T>[] {
  const byKickoff = (a: T, b: T) =>
    a.kickoffAt.getTime() - b.kickoffAt.getTime();
  const sections: MatchSection<T>[] = [];

  for (const label of GROUP_LABELS) {
    const inGroup = matches
      .filter((mm) => mm.stage === "group" && mm.groupLabel === label)
      .sort(byKickoff);
    if (inGroup.length > 0) {
      sections.push({
        key: `grupo-${label.toLowerCase()}`,
        title: `Grupo ${label}`,
        matches: inGroup,
      });
    }
  }

  for (const round of KNOCKOUT_ORDER) {
    const inRound = matches
      .filter((mm) => mm.stage === round.stage)
      .sort(byKickoff);
    if (inRound.length > 0) {
      sections.push({ key: round.key, title: round.title, matches: inRound });
    }
  }

  return sections;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/group-matches.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/group-matches.ts src/lib/group-matches.test.ts
git commit -m "feat: util groupMatches (secciones por grupo y ronda)"
```

---

### Task 6: Predicciones con secciones + chip-nav

**Files:**
- Modify: `src/app/predicciones/page.tsx`

- [ ] **Step 1: Reemplazar el archivo**

Reemplazar el contenido de `src/app/predicciones/page.tsx`:

```tsx
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMatchesOrdered, getUserPredictions } from "@/lib/queries";
import { isMatchPredictable, isLocked } from "@/lib/match-rules";
import { groupMatches } from "@/lib/group-matches";
import { PredictionForm } from "@/components/PredictionForm";
import { TeamLabel } from "@/components/TeamLabel";
import { LocalTime } from "@/components/LocalTime";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PrediccionesPage() {
  const user = await requireUser();
  const [allMatches, preds] = await Promise.all([
    getMatchesOrdered(),
    getUserPredictions(user.id),
  ]);
  const now = new Date();
  const sections = groupMatches(allMatches);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Predicciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá el marcador exacto. Cada partido se cierra al arrancar.
        </p>
      </header>

      <nav className="sticky top-14 z-10 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b bg-background/80 px-4 py-2 backdrop-blur">
        {sections.map((s) => (
          <a
            key={s.key}
            href={`#${s.key}`}
            className="whitespace-nowrap rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.key} id={section.key} className="scroll-mt-28">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h2>
            <ul className="space-y-2">
              {section.matches.map((m, i) => {
                const p = preds.get(m.id);
                const predictable = isMatchPredictable(m, now);
                const locked = isLocked(m, now);
                return (
                  <li
                    key={m.id}
                    className="animate-rise"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <Card className="transition-colors hover:border-foreground/20">
                      <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <LocalTime iso={m.kickoffAt.toISOString()} />
                            {m.venue && <span className="truncate">· {m.venue}</span>}
                            {m.status === "finished" ? (
                              <Badge
                                variant="secondary"
                                className="font-mono tabular-nums"
                              >
                                {m.homeScore}:{m.awayScore}
                              </Badge>
                            ) : locked ? (
                              <Badge variant="outline">cerrado</Badge>
                            ) : null}
                          </div>
                          <Link
                            href={`/partido/${m.id}`}
                            className="font-medium tracking-tight hover:underline"
                          >
                            <TeamLabel team={m.home} placeholder={m.homePlaceholder} />{" "}
                            <span className="text-muted-foreground">vs</span>{" "}
                            <TeamLabel team={m.away} placeholder={m.awayPlaceholder} />
                          </Link>
                          {m.status === "finished" && p?.points != null && (
                            <span className="ml-2 font-mono text-xs font-semibold tabular-nums text-primary">
                              +{p.points}
                            </span>
                          )}
                        </div>
                        <PredictionForm
                          matchId={m.id}
                          initialHome={p?.homeScorePred ?? null}
                          initialAway={p?.awayScorePred ?? null}
                          disabled={!predictable}
                        />
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/predicciones/page.tsx
git commit -m "feat: predicciones agrupadas por grupo/ronda con chip-nav, banderas y hora local"
```

---

### Task 7: Admin con secciones + `AdminMatchRow` estructurado

**Files:**
- Modify: `src/components/AdminMatchRow.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Reemplazar `AdminMatchRow`**

Reemplazar el contenido de `src/components/AdminMatchRow.tsx`:

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
  home,
  away,
  homePlaceholder,
  awayPlaceholder,
  initialHome,
  initialAway,
  finished,
}: {
  matchId: number;
  kickoffIso: string;
  home: TeamLite | null;
  away: TeamLite | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  initialHome: number | null;
  initialAway: number | null;
  finished: boolean;
}) {
  const [homeScore, setHomeScore] = useState(initialHome?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(initialAway?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await confirmResult(matchId, Number(homeScore || 0), Number(awayScore || 0));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
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
    </div>
  );
}
```

- [ ] **Step 2: Reemplazar la página de Admin**

Reemplazar el contenido de `src/app/admin/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/session";
import { getMatchesOrdered } from "@/lib/queries";
import { groupMatches } from "@/lib/group-matches";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  await requireAdmin();
  const allMatches = await getMatchesOrdered();
  const sections = groupMatches(allMatches);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Admin · Resultados
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá el marcador final; al confirmar se recalculan puntos y ranking.
        </p>
      </header>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h2>
            <Card>
              <CardContent className="px-4 py-1">
                {section.matches.map((m) => (
                  <AdminMatchRow
                    key={m.id}
                    matchId={m.id}
                    kickoffIso={m.kickoffAt.toISOString()}
                    home={m.home}
                    away={m.away}
                    homePlaceholder={m.homePlaceholder}
                    awayPlaceholder={m.awayPlaceholder}
                    initialHome={m.homeScore}
                    initialAway={m.awayScore}
                    finished={m.status === "finished"}
                  />
                ))}
              </CardContent>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminMatchRow.tsx src/app/admin/page.tsx
git commit -m "feat: admin agrupado por grupo/ronda con banderas y hora local"
```

---

### Task 8: Query `getKnockoutMatches`

**Files:**
- Modify: `src/lib/queries.ts`

- [ ] **Step 1: Agregar la query**

Agregar al final de `src/lib/queries.ts` (después de `getRanking`):

```ts
const KNOCKOUT_STAGES = new Set([
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
]);

export async function getKnockoutMatches(): Promise<MatchRow[]> {
  const all = await getMatchesOrdered();
  return all.filter((m) => KNOCKOUT_STAGES.has(m.stage));
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts
git commit -m "feat: query getKnockoutMatches"
```

---

### Task 9: Módulo `buildBracket`

**Files:**
- Create: `src/lib/bracket.ts`
- Test: `src/lib/bracket.test.ts`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/lib/bracket.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildBracket } from "./bracket";

describe("buildBracket", () => {
  const bracket = buildBracket();

  it("arma 5 rondas con tamaños 16/8/4/2/1", () => {
    expect(bracket.rounds.map((r) => r.nodes.length)).toEqual([16, 8, 4, 2, 1]);
    expect(bracket.rounds.map((r) => r.key)).toEqual(["r32", "r16", "qf", "sf", "final"]);
  });

  it("separa el tercer puesto del árbol principal", () => {
    expect(bracket.thirdPlace).not.toBeNull();
    expect(bracket.thirdPlace!.stage).toBe("third_place");
    expect(
      bracket.rounds.some((r) => r.nodes.some((n) => n.stage === "third_place")),
    ).toBe(false);
  });

  it("ubica los dos alimentadores de cada llave contiguos en la ronda previa", () => {
    for (let i = 1; i < bracket.rounds.length; i++) {
      const prevNumbers = bracket.rounds[i - 1].nodes.map((n) => n.matchNumber);
      for (const node of bracket.rounds[i].nodes) {
        expect(node.feeders).toHaveLength(2);
        const positions = node.feeders
          .map((f) => prevNumbers.indexOf(f))
          .sort((a, b) => a - b);
        expect(positions[0]).toBeGreaterThanOrEqual(0);
        expect(positions[1]).toBe(positions[0] + 1);
      }
    }
  });

  it("las llaves de R32 son hojas de grupo (sin alimentadores)", () => {
    for (const node of bracket.rounds[0].nodes) {
      expect(node.feeders).toHaveLength(0);
      expect(node.home.kind).toBe("group");
      expect(node.away.kind).toBe("group");
    }
  });

  it("la final toma los ganadores de las dos semifinales", () => {
    const final = bracket.rounds[4].nodes[0];
    expect(final.home).toEqual({ kind: "winner", from: 101 });
    expect(final.away).toEqual({ kind: "winner", from: 102 });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx vitest run src/lib/bracket.test.ts`
Expected: FAIL — `buildBracket` no existe.

- [ ] **Step 3: Implementar el módulo**

Crear `src/lib/bracket.ts`:

```ts
import { SEED_MATCHES } from "@/db/fixture-data";

export type BracketSlot =
  | { kind: "group"; label: string }
  | { kind: "winner"; from: number }
  | { kind: "loser"; from: number };

export type BracketNode = {
  matchNumber: number;
  stage: string;
  homePlaceholder: string;
  awayPlaceholder: string;
  home: BracketSlot;
  away: BracketSlot;
  feeders: number[]; // matchNumbers que alimentan este nodo (0 o 2)
};

export type BracketRound = {
  stage: string;
  key: string;
  title: string;
  nodes: BracketNode[]; // en orden vertical de display
};

export type Bracket = {
  rounds: BracketRound[]; // round_of_32 → final (sin tercer puesto)
  thirdPlace: BracketNode | null;
};

const ROUND_META: { stage: string; key: string; title: string }[] = [
  { stage: "round_of_32", key: "r32", title: "Dieciseisavos" },
  { stage: "round_of_16", key: "r16", title: "Octavos" },
  { stage: "quarter_final", key: "qf", title: "Cuartos" },
  { stage: "semi_final", key: "sf", title: "Semis" },
  { stage: "final", key: "final", title: "Final" },
];

function parseSlot(placeholder: string): BracketSlot {
  const match = /^(Ganador|Perdedor)\s+\S+-(\d+)$/.exec(placeholder);
  if (match) {
    const from = Number(match[2]);
    return match[1] === "Ganador"
      ? { kind: "winner", from }
      : { kind: "loser", from };
  }
  return { kind: "group", label: placeholder };
}

export function buildBracket(): Bracket {
  // matchNumber por posición en el fixture (grupos 1..72, eliminatorias 73..104).
  const nodes: BracketNode[] = [];
  const byNumber = new Map<number, BracketNode>();

  SEED_MATCHES.forEach((m, i) => {
    if (m.stage === "group") return;
    const home = parseSlot(m.homePlaceholder ?? "");
    const away = parseSlot(m.awayPlaceholder ?? "");
    const feeders = [home, away]
      .filter((s): s is Extract<BracketSlot, { from: number }> => s.kind !== "group")
      .map((s) => s.from);
    const node: BracketNode = {
      matchNumber: i + 1,
      stage: m.stage,
      homePlaceholder: m.homePlaceholder ?? "",
      awayPlaceholder: m.awayPlaceholder ?? "",
      home,
      away,
      feeders,
    };
    nodes.push(node);
    byNumber.set(node.matchNumber, node);
  });

  // Orden vertical por DFS desde la final (subárbol "home" antes que "away").
  const finalNode = nodes.find((n) => n.stage === "final");
  const orderKey = new Map<number, number>();
  let counter = 0;
  function dfs(mn: number): number {
    const node = byNumber.get(mn);
    if (!node) return counter++;
    if (node.feeders.length === 0) {
      const k = counter++;
      orderKey.set(mn, k);
      return k;
    }
    const k = Math.min(...node.feeders.map((f) => dfs(f)));
    orderKey.set(mn, k);
    return k;
  }
  if (finalNode) dfs(finalNode.matchNumber);

  const rounds: BracketRound[] = ROUND_META.map((meta) => ({
    stage: meta.stage,
    key: meta.key,
    title: meta.title,
    nodes: nodes
      .filter((n) => n.stage === meta.stage)
      .sort(
        (a, b) =>
          (orderKey.get(a.matchNumber) ?? 0) - (orderKey.get(b.matchNumber) ?? 0),
      ),
  }));

  const thirdPlace = nodes.find((n) => n.stage === "third_place") ?? null;

  return { rounds, thirdPlace };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx vitest run src/lib/bracket.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/bracket.ts src/lib/bracket.test.ts
git commit -m "feat: buildBracket deriva el árbol de eliminatorias del fixture"
```

---

### Task 10: Componente `BracketMatchCard` + tipos de view-model

**Files:**
- Create: `src/components/BracketMatchCard.tsx`

- [ ] **Step 1: Implementar el componente y los tipos**

Crear `src/components/BracketMatchCard.tsx`:

```tsx
import Link from "next/link";
import { TeamLabel } from "@/components/TeamLabel";
import { LocalTime } from "@/components/LocalTime";

type TeamLite = { name: string; flag: string | null };

export type BracketCardData = {
  matchId: number | null;
  kickoffIso: string | null;
  home: TeamLite | null;
  away: TeamLite | null;
  homePlaceholder: string;
  awayPlaceholder: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
  pred: {
    homeScorePred: number;
    awayScorePred: number;
    points: number | null;
  } | null;
};

export type BracketRoundView = {
  key: string;
  title: string;
  cards: BracketCardData[];
};

function predColor(points: number | null): string {
  if (points === 3) return "text-primary";
  if (points === 0) return "text-destructive";
  return "text-muted-foreground";
}

function Row({
  team,
  placeholder,
  score,
  finished,
}: {
  team: TeamLite | null;
  placeholder: string;
  score: number | null;
  finished: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <TeamLabel team={team} placeholder={placeholder} className="min-w-0 truncate" />
      <span className="font-mono tabular-nums text-muted-foreground">
        {finished && score != null ? score : "–"}
      </span>
    </div>
  );
}

export function BracketMatchCard({ data }: { data: BracketCardData }) {
  const inner = (
    <div className="rounded-lg border bg-card px-3 py-2 transition-colors hover:border-foreground/30">
      {data.kickoffIso && (
        <div className="mb-1 text-[10px] text-muted-foreground">
          <LocalTime iso={data.kickoffIso} />
        </div>
      )}
      <Row
        team={data.home}
        placeholder={data.homePlaceholder}
        score={data.homeScore}
        finished={data.finished}
      />
      <Row
        team={data.away}
        placeholder={data.awayPlaceholder}
        score={data.awayScore}
        finished={data.finished}
      />
      {data.finished && data.pred && (
        <div
          className={`mt-1 font-mono text-[10px] tabular-nums ${predColor(
            data.pred.points,
          )}`}
        >
          vos: {data.pred.homeScorePred}:{data.pred.awayScorePred}
          {data.pred.points != null && (
            <span className="ml-1">(+{data.pred.points})</span>
          )}
        </div>
      )}
    </div>
  );

  if (data.matchId) {
    return (
      <Link href={`/partido/${data.matchId}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/BracketMatchCard.tsx
git commit -m "feat: BracketMatchCard (resultado oficial + pronóstico del usuario)"
```

---

### Task 11: Componentes `Bracket` (desktop) y `BracketTabs` (mobile)

**Files:**
- Create: `src/components/Bracket.tsx`
- Create: `src/components/BracketTabs.tsx`

- [ ] **Step 1: Implementar `Bracket` (desktop)**

Crear `src/components/Bracket.tsx`:

```tsx
import {
  BracketMatchCard,
  type BracketCardData,
  type BracketRoundView,
} from "@/components/BracketMatchCard";

export function Bracket({
  rounds,
  thirdPlace,
}: {
  rounds: BracketRoundView[];
  thirdPlace: BracketCardData | null;
}) {
  return (
    <div className="hidden md:block">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {rounds.map((round, roundIdx) => (
          <div key={round.key} className="flex min-w-[180px] flex-col">
            <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {round.title}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.cards.map((card, i) => (
                <div
                  key={i}
                  className={
                    roundIdx < rounds.length - 1
                      ? "relative after:absolute after:left-full after:top-1/2 after:h-px after:w-4 after:bg-border after:content-['']"
                      : undefined
                  }
                >
                  <BracketMatchCard data={card} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {thirdPlace && (
        <div className="mt-6 max-w-[220px]">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tercer puesto
          </h3>
          <BracketMatchCard data={thirdPlace} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implementar `BracketTabs` (mobile)**

Crear `src/components/BracketTabs.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  BracketMatchCard,
  type BracketCardData,
  type BracketRoundView,
} from "@/components/BracketMatchCard";

export function BracketTabs({
  rounds,
  thirdPlace,
}: {
  rounds: BracketRoundView[];
  thirdPlace: BracketCardData | null;
}) {
  const tabs: BracketRoundView[] = thirdPlace
    ? [...rounds, { key: "third", title: "3°", cards: [thirdPlace] }]
    : rounds;
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="md:hidden">
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors ${
              t.key === active
                ? "border-foreground bg-foreground text-background"
                : "text-muted-foreground hover:border-foreground/30"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {current?.cards.map((card, i) => (
          <BracketMatchCard key={i} data={card} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/components/Bracket.tsx src/components/BracketTabs.tsx
git commit -m "feat: bracket desktop (líneas) y mobile (tabs)"
```

---

### Task 12: Página `/llaves` + nav + middleware

**Files:**
- Create: `src/app/llaves/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/middleware.ts`

- [ ] **Step 1: Crear la página `/llaves`**

Crear `src/app/llaves/page.tsx`:

```tsx
import { requireUser } from "@/lib/session";
import { getKnockoutMatches, getUserPredictions } from "@/lib/queries";
import { buildBracket, type BracketNode } from "@/lib/bracket";
import { Bracket } from "@/components/Bracket";
import { BracketTabs } from "@/components/BracketTabs";
import type {
  BracketCardData,
  BracketRoundView,
} from "@/components/BracketMatchCard";

const key = (home: string | null, away: string | null) =>
  `${home ?? ""}::${away ?? ""}`;

export default async function LlavesPage() {
  const user = await requireUser();
  const [knockout, preds] = await Promise.all([
    getKnockoutMatches(),
    getUserPredictions(user.id),
  ]);

  const matchByKey = new Map<string, (typeof knockout)[number]>();
  for (const m of knockout) {
    matchByKey.set(key(m.homePlaceholder, m.awayPlaceholder), m);
  }

  const bracket = buildBracket();

  function toCard(node: BracketNode): BracketCardData {
    const m = matchByKey.get(key(node.homePlaceholder, node.awayPlaceholder)) ?? null;
    const pred = m ? preds.get(m.id) ?? null : null;
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
      pred: pred
        ? {
            homeScorePred: pred.homeScorePred,
            awayScorePred: pred.awayScorePred,
            points: pred.points,
          }
        : null,
    };
  }

  const rounds: BracketRoundView[] = bracket.rounds.map((r) => ({
    key: r.key,
    title: r.title,
    cards: r.nodes.map(toCard),
  }));
  const thirdPlace = bracket.thirdPlace ? toCard(bracket.thirdPlace) : null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Llaves
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El cuadro de eliminatorias. Los cruces se completan a medida que el admin
          carga resultados.
        </p>
      </header>
      <Bracket rounds={rounds} thirdPlace={thirdPlace} />
      <BracketTabs rounds={rounds} thirdPlace={thirdPlace} />
    </div>
  );
}
```

- [ ] **Step 2: Agregar el link "Llaves" en el header**

En `src/app/layout.tsx`, dentro del `<div className="flex items-center gap-4 text-sm text-muted-foreground">`, agregar el link entre Predicciones y Ranking. Reemplazar:

```tsx
                <Link href="/predicciones" className="transition-colors hover:text-foreground">
                  Predicciones
                </Link>
                <Link href="/ranking" className="transition-colors hover:text-foreground">
                  Ranking
                </Link>
```

por:

```tsx
                <Link href="/predicciones" className="transition-colors hover:text-foreground">
                  Predicciones
                </Link>
                <Link href="/llaves" className="transition-colors hover:text-foreground">
                  Llaves
                </Link>
                <Link href="/ranking" className="transition-colors hover:text-foreground">
                  Ranking
                </Link>
```

- [ ] **Step 3: Proteger `/llaves` en el middleware**

En `src/middleware.ts`, agregar `/llaves/:path*` al array del `matcher`. Reemplazar:

```ts
  matcher: ["/predicciones/:path*", "/ranking/:path*", "/partido/:path*", "/admin/:path*"],
```

por:

```ts
  matcher: [
    "/predicciones/:path*",
    "/llaves/:path*",
    "/ranking/:path*",
    "/partido/:path*",
    "/admin/:path*",
  ],
```

> Nota: verificar el formato exacto del `matcher` actual en `src/middleware.ts` antes de editar (puede estar en una sola línea). Mantener el resto de las entradas intactas y solo sumar `"/llaves/:path*"`.

- [ ] **Step 4: Verificar tipos y build**

Run: `npx tsc --noEmit && npm run build`
Expected: tipos OK y build exitoso (Next compila `/llaves` como ruta).

- [ ] **Step 5: Commit**

```bash
git add src/app/llaves/page.tsx src/app/layout.tsx src/middleware.ts
git commit -m "feat: página /llaves (bracket) + nav + ruta protegida"
```

---

### Task 13: Verificación final

**Files:** ninguno (verificación).

- [ ] **Step 1: Suite completa de tests**

Run: `npx vitest run`
Expected: PASS — los 25 tests previos + los nuevos de `format`, `group-matches` y `bracket`.

- [ ] **Step 2: Tipos + build de producción**

Run: `npx tsc --noEmit && npm run build`
Expected: sin errores de tipo, build exitoso.

- [ ] **Step 3: Verificación visual (dev server)**

Con el dev server corriendo (`npm run dev`):
- **Predicciones**: secciones por Grupo A…L y rondas; chip-nav sticky que saltea a cada sección; banderas junto a cada equipo; hora local con sigla de zona.
- **Llaves**: en desktop, columnas R32→Final con líneas y card de tercer puesto; en mobile (ancho < `md`), pestañas por ronda. Cards muestran placeholders donde no hay equipos asignados, y resultado + "vos: x:y (+p)" coloreado en partidos terminados.
- **Admin**: secciones por grupo/ronda; cada fila con bandera, equipos/placeholder y hora local; cargar un resultado sigue funcionando.
- **Partido**: banderas en el encabezado y hora local.

- [ ] **Step 4: Commit final (si hubo ajustes visuales)**

```bash
git add -A
git commit -m "chore: ajustes visuales de las mejoras de UI"
```

---

## Self-Review

**Cobertura del spec:**
- A · Banderas → Task 2 (`TeamLabel`) + integraciones (4, 6, 7, 10).
- B · Hora local + sigla → Task 1 (`formatKickoff`) + Task 3 (`LocalTime`) + integraciones.
- C · Agrupación en todas las vistas → Task 5 (`groupMatches`) + Task 6 (predicciones) + Task 7 (admin).
- D · Bracket `/llaves` (resultado + pronóstico, desktop líneas / mobile tabs) → Tasks 8–12.
- Routing/protección → Task 12 (nav + middleware).
- Tests de lógica pura → Tasks 1, 5, 9. Verificación visual → Task 13.

**Consistencia de tipos:** `TeamLite = { name: string; flag: string | null }` se usa igual en `TeamLabel`, `AdminMatchRow` y `BracketMatchCard`. `BracketCardData`/`BracketRoundView` se definen en `BracketMatchCard.tsx` y se importan en `Bracket`, `BracketTabs` y la página. `buildBracket()` devuelve `{ rounds, thirdPlace }` y la página usa `bracket.rounds`/`bracket.thirdPlace`. `getKnockoutMatches()` devuelve `MatchRow[]` (mismo tipo que `getMatchesOrdered`).

**Sin placeholders:** todos los pasos de código incluyen el código completo.

**Riesgo conocido:** la sigla de zona exacta (`ART` vs `GMT-3`) depende del ICU del runtime; el test la valida con `/GMT|ART|UTC/`. Las líneas del bracket desktop son stubs horizontales + alineación `justify-around` (lee como bracket); los "codos" completos quedan como pulido visual opcional en Task 13.
