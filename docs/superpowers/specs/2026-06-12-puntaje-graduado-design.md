# Puntaje graduado (escala de "cerca")

**Fecha:** 2026-06-12
**Estado:** aprobado, listo para plan

## Problema

El scoring actual (`src/lib/scoring.ts`) es un acantilado binario:

- +3 marcador exacto
- +1 acierto de resultado (ganador/empate)
- 0 en otro caso

Predecir 2-1 en un partido que termina 3-2 da lo mismo (+1) que predecir 1-0 a lo bruto. No se distingue "estuve cerca" de "le pegué de casualidad". Eso resta justicia y enganche.

## Solución

Escala graduada que premia acertar la **diferencia de gol** además del ganador:

| Caso | Puntos |
|---|---|
| Marcador exacto | +3 |
| Acertás el resultado (mismo signo) **y** la diferencia de gol | +2 |
| Acertás solo el resultado (mismo signo) | +1 |
| Nada | 0 |

Ejemplos:
- Predijiste 2-1, terminó 3-2 → mismo signo (local gana) y misma diferencia (+1) → **+2**
- Predijiste 1-0, terminó 3-2 → mismo signo y misma diferencia (+1) → **+2** (la diferencia coincide aunque el marcador esté lejos; es aceptado)
- Predijiste 2-0, terminó 1-0 → mismo signo, diferencia distinta (+2 vs +1) → **+1**
- Predijiste 0-0, terminó 1-1 → empate y misma diferencia (0) → **+2**

### Consecuencia con empates (decisión explícita)

Todo empate tiene diferencia 0. Por lo tanto, **cualquier empate bien acertado pero no exacto cae en +2, nunca en +1**. Es coherente con la definición ("acertaste resultado y diferencia") y se acepta a propósito.

### Propiedad: monótono, nadie pierde puntos

La nueva regla nunca baja un puntaje viejo:
- lo que daba +3 sigue +3
- lo que daba +1 sigue +1 o sube a +2
- lo que daba 0 sigue 0

Esto hace seguro aplicar el cambio aún a mitad de torneo: no castiga retroactivamente a nadie.

## Arquitectura

`scorePrediction(pred, result) → number` ya es una función pura y es la única fuente de verdad del puntaje. Se la consume desde `src/lib/actions.ts` (al cargar un resultado) y se la testea en `src/lib/scoring.test.ts`.

### Cambios

1. **`src/lib/scoring.ts`** — agregar rama de diferencia de gol.
   - Nueva constante `CLOSE_RESULT_POINTS = 2`.
   - Lógica: si exacto → 3; si mismo signo y misma diferencia (`h-a`) → 2; si mismo signo → 1; si no → 0.

2. **`src/lib/scoring.test.ts`** — cubrir la rama nueva: caso +2 por diferencia (no-empate), caso empate no-exacto → +2, caso mismo signo distinta diferencia → +1, y reconfirmar +3/0.

3. **`src/app/ranking/page.tsx`** — actualizar la leyenda:
   `+3 marcador exacto · +2 diferencia · +1 resultado`

4. **`scripts/recalc.ts`** (nuevo) — backfill de una corrida.
   - Recorre partidos `status = "finished"` (los marcadores reales viven en `matches`, no se pierde nada).
   - Para cada predicción de esos partidos, re-corre `scorePrediction` y sobrescribe `predictions.points`.
   - Loguea cuántas predicciones y cuántos partidos recalculó.
   - Reusa `scorePrediction` (no duplica la regla). Se corre una vez con `npx tsx scripts/recalc.ts`.

### Flujo de datos

- **Partidos futuros:** automático. `actions.ts` ya llama a `scorePrediction` al cargar resultados; con la función nueva, aplican la regla nueva sin tocar nada.
- **Partidos ya finalizados:** el script `recalc.ts` los actualiza una vez. Al 2026-06-12 hay pocos o cero, así que el costo real es mínimo.

## Testing

- Unit tests en `scoring.test.ts` para todas las ramas (es la fuente de verdad).
- Verificación manual del script: correrlo y confirmar el log de cantidad recalculada.

## Fuera de alcance (YAGNI)

- Multiplicador por fase del torneo (idea separada, se puede sumar después).
- Joker / partido doble.
- Acción de admin reusable para recálculo (se eligió script throwaway).
