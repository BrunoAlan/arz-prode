# Puntaje Graduado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el scoring binario (+3/+1/0) por una escala graduada que premia acertar la diferencia de gol con +2, y recalcular los partidos ya finalizados.

**Architecture:** `scorePrediction(pred, result) → number` en `src/lib/scoring.ts` es la única fuente de verdad del puntaje (la consume `actions.ts` al cargar resultados y la testea `scoring.test.ts`). Se le agrega una rama de "misma diferencia de gol". Un script throwaway recorre los partidos `finished` y re-corre la función para sobrescribir los `points` viejos. La nueva regla es monótona: nadie pierde puntos.

**Tech Stack:** TypeScript, Vitest, Drizzle ORM (Neon Postgres), tsx para el script.

---

## Regla nueva (referencia)

| Caso | Puntos |
|---|---|
| Marcador exacto | +3 |
| Mismo signo (ganador/empate) **y** misma diferencia de gol (`home − away`) | +2 |
| Mismo signo solamente | +1 |
| Nada | 0 |

Nota: todo empate tiene diferencia 0, así que un empate bien acertado pero no exacto siempre da +2 (decisión explícita del spec).

---

## Task 1: Escala graduada en scorePrediction (TDD)

**Files:**
- Modify: `src/lib/scoring.ts`
- Test: `src/lib/scoring.test.ts`

- [ ] **Step 1: Escribir los tests (rojo)**

Reemplazar **todo** el contenido de `src/lib/scoring.test.ts` por:

```ts
import { describe, it, expect } from "vitest";
import { scorePrediction } from "./scoring";

const pred = (h: number, a: number) => ({ homeScorePred: h, awayScorePred: a });
const res = (h: number, a: number) => ({ homeScore: h, awayScore: a });

describe("scorePrediction (exacto +3, diferencia +2, resultado +1)", () => {
  it("marcador exacto da 3", () => {
    expect(scorePrediction(pred(2, 1), res(2, 1))).toBe(3);
  });
  it("empate exacto da 3", () => {
    expect(scorePrediction(pred(0, 0), res(0, 0))).toBe(3);
  });
  it("mismo signo y misma diferencia (no exacto) da 2", () => {
    expect(scorePrediction(pred(2, 1), res(3, 2))).toBe(2);
  });
  it("misma diferencia aunque el marcador esté lejos da 2", () => {
    expect(scorePrediction(pred(1, 0), res(3, 2))).toBe(2);
  });
  it("empate no exacto da 2 (toda diferencia de empate es 0)", () => {
    expect(scorePrediction(pred(1, 1), res(2, 2))).toBe(2);
  });
  it("mismo signo pero distinta diferencia da 1", () => {
    expect(scorePrediction(pred(2, 0), res(1, 0))).toBe(1);
  });
  it("acierta ganador con diferencia distinta da 1", () => {
    expect(scorePrediction(pred(2, 1), res(3, 0))).toBe(1);
  });
  it("erra el resultado da 0", () => {
    expect(scorePrediction(pred(2, 1), res(0, 1))).toBe(0);
  });
  it("marcador invertido (gana el otro) da 0", () => {
    expect(scorePrediction(pred(0, 1), res(1, 0))).toBe(0);
  });
});
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npm test -- scoring`
Expected: FAIL. Los casos nuevos de +2 (ej. "mismo signo y misma diferencia... da 2") fallan porque la implementación vieja devuelve 1.

- [ ] **Step 3: Implementar la rama de diferencia**

Reemplazar **todo** el contenido de `src/lib/scoring.ts` por:

```ts
export type ScoreInput = { homeScore: number; awayScore: number };
export type PredictionInput = { homeScorePred: number; awayScorePred: number };

export const CORRECT_RESULT_POINTS = 1;
export const CLOSE_RESULT_POINTS = 2;
export const EXACT_SCORE_POINTS = 3;

const sign = (h: number, a: number): -1 | 0 | 1 =>
  h > a ? 1 : h < a ? -1 : 0;

/** +3 marcador exacto, +2 acierta resultado y diferencia, +1 acierta solo el resultado, 0 en otro caso. */
export function scorePrediction(
  pred: PredictionInput,
  result: ScoreInput,
): number {
  if (
    pred.homeScorePred === result.homeScore &&
    pred.awayScorePred === result.awayScore
  ) {
    return EXACT_SCORE_POINTS;
  }
  if (
    sign(pred.homeScorePred, pred.awayScorePred) ===
    sign(result.homeScore, result.awayScore)
  ) {
    const predDiff = pred.homeScorePred - pred.awayScorePred;
    const resultDiff = result.homeScore - result.awayScore;
    return predDiff === resultDiff ? CLOSE_RESULT_POINTS : CORRECT_RESULT_POINTS;
  }
  return 0;
}
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npm test -- scoring`
Expected: PASS (9 tests verdes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat: puntaje graduado (+2 por acertar la diferencia de gol)"
```

---

## Task 2: Actualizar la leyenda del ranking

**Files:**
- Modify: `src/app/ranking/page.tsx`

- [ ] **Step 1: Actualizar el texto de la leyenda**

En `src/app/ranking/page.tsx`, reemplazar el bloque de la leyenda:

```tsx
        <p className="mt-1 text-xs text-muted-foreground">
          +3 marcador exacto · +1 resultado
        </p>
```

por:

```tsx
        <p className="mt-1 text-xs text-muted-foreground">
          +3 marcador exacto · +2 diferencia · +1 resultado
        </p>
```

- [ ] **Step 2: Verificar que el lint pasa**

Run: `npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/app/ranking/page.tsx
git commit -m "feat: leyenda del ranking refleja el +2 por diferencia"
```

---

## Task 3: Script de backfill para partidos finalizados

**Files:**
- Create: `scripts/recalc.ts`

- [ ] **Step 1: Crear el script**

Crear `scripts/recalc.ts` con:

```ts
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { matches, predictions } from "../src/db/schema";
import { scorePrediction } from "../src/lib/scoring";

async function main() {
  const finished = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "finished"));

  let updated = 0;
  for (const m of finished) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const preds = await db
      .select()
      .from(predictions)
      .where(eq(predictions.matchId, m.id));
    for (const p of preds) {
      const points = scorePrediction(
        { homeScorePred: p.homeScorePred, awayScorePred: p.awayScorePred },
        { homeScore: m.homeScore, awayScore: m.awayScore },
      );
      await db
        .update(predictions)
        .set({ points })
        .where(eq(predictions.id, p.id));
      updated++;
    }
  }

  console.log(
    `recalculadas ${updated} predicciones (${finished.length} partidos finished)`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Correr el backfill**

Run: `npx tsx --env-file=.env.local scripts/recalc.ts`
Expected: una línea tipo `recalculadas N predicciones (M partidos finished)`. Al 2026-06-12, N y M probablemente son 0 o muy chicos. El comando debe terminar sin error (exit 0).

- [ ] **Step 3: Commit**

```bash
git add scripts/recalc.ts
git commit -m "chore: script de recálculo de puntajes para partidos finalizados"
```

---

## Notas de cierre

- **Partidos futuros:** no requieren nada. `src/lib/actions.ts` ya llama a `scorePrediction` al cargar cada resultado; con la función nueva aplican la regla nueva automáticamente.
- **Sin push:** según preferencia del usuario, confirmar antes de pushear.
- El script `scripts/recalc.ts` queda en el repo como herramienta reutilizable ante futuros cambios de regla o correcciones de resultados, aunque su uso sea on-demand.
