# Empates en eliminatorias con definición por el admin

**Fecha:** 2026-06-29
**Estado:** Aprobado para implementar

## Problema

En eliminatorias (`round_of_32` → `final`) el sistema hoy **rechaza** cargar un
empate: `confirmResult` llama a `isInvalidKnockoutDraw` y obliga al admin a cargar
un marcador ya "resuelto" (ej. 3-2). El ganador se deriva puramente del marcador
(`homeScore > awayScore`).

Esto trae dos problemas:

1. **No se modela la definición por penales.** Si un partido real terminó 1-1 y se
   definió por penales, no hay forma de representarlo.
2. **Puntaje injusto.** El admin tiene que falsear un marcador (ej. 3-2) para reflejar
   al ganador, y entonces el usuario que acertó el 1-1 real pierde puntos.

## Idea central

Separar **dos datos que hoy están fusionados**: el marcador real y "quién avanza".

- El admin carga el **marcador real** (puede ser empate).
- Si es empate en una eliminatoria, el admin marca **qué equipo avanza** (penales).

Beneficios: el marcador refleja la realidad, los pronósticos se puntúan justo
(un 1-1 acertado vale +3), y la llave avanza con el equipo correcto.

## Alcance

- **Aplica solo a eliminatorias** (`round_of_32`, `round_of_16`, `quarter_final`,
  `semi_final`, `third_place`, `final`). En grupos los empates ya se permiten y no
  cambian.
- **Final y 3er puesto se tratan igual que el resto:** un empate exige que el admin
  marque al ganador (campeón / 3°), aunque no "avance" a ningún cruce. Es uniforme y
  además deja registrado el ganador para mostrarlo.

## Fuera de alcance (YAGNI)

- Los pronósticos siguen siendo **solo marcador**. No se predice el ganador por
  penales. `scoring.ts` no cambia.
- No se guarda el marcador del shootout (ej. 4-2 en penales), solo qué equipo avanza.

## Modelo de datos

Una columna nueva en la tabla `match` (`src/db/schema.ts`):

- `advancingTeamId` → `integer("advancing_team_id")`, **nullable**, FK a `team.id`.
- **Semántica:** equipo que el admin designa como ganador cuando el partido terminó
  empatado (definición por penales). En partidos terminales (final / 3er puesto)
  representa al campeón / 3°. Es **NULL** en todo partido que no sea un empate de
  eliminatoria (grupos, y eliminatorias con ganador por marcador).

### Migración (⚠️ la DB es producción)

La DB es Neon productiva. No hay carpeta de migraciones; el proyecto aplica cambios de
schema con `drizzle-kit push` (`npm run db:push`), que pushea directo contra
`DATABASE_URL`.

- La columna es **aditiva y nullable** → sin pérdida de datos; las filas existentes
  quedan en NULL.
- Aun así, el `db:push` a producción se ejecuta **solo con OK explícito del usuario**,
  revisando antes el plan que genera drizzle, e idealmente en horario de bajo tráfico.

## Resolución de llaves (`src/lib/bracket-advance.ts`)

- `KnockoutMatchInput` suma `advancingTeamId: number | null`.
- En `outcome(from, want)`, cuando el partido fuente está **empatado**
  (`homeScore === awayScore`):
  - si `advancingTeamId` está seteado y es uno de los dos equipos del partido →
    ese es el `winner`, y el otro es el `loser` (el `loser` importa para el cupo
    "Perdedor SF-…" del partido por el 3er puesto);
  - si es empate **sin** `advancingTeamId`, o el id no coincide con ninguno de los dos
    equipos → devuelve `null` (no resoluble, igual que hoy).
- No-empates: comportamiento idéntico al actual.
- `applyBracketAdvance` (en `actions.ts`) ya re-deriva y persiste todo de forma
  idempotente; solo hay que agregar `advancingTeamId: m.advancingTeamId` al mapeo de
  `knockout` que se le pasa a `resolveBracket`. (Llega gratis a `getKnockoutMatches`
  porque devuelve `matches.$inferSelect`.)

## Validación (reemplaza `isInvalidKnockoutDraw`)

Se elimina la regla "empate = inválido en eliminatoria". La nueva regla vive en un
helper **puro y testeable** (en `bracket-advance.ts`, junto a la lógica de llaves):

Dada `(stage, homeScore, awayScore, advancingTeamId, homeTeamId, awayTeamId)`:

- **Grupo:** empate siempre OK; `advancingTeamId` se ignora (se persiste null).
- **Eliminatoria + empate:** se **exige** `advancingTeamId`, y debe ser igual a
  `homeTeamId` o `awayTeamId`. Si falta o no coincide → error claro
  (ej. "Definí qué equipo avanza por penales"). Si los equipos todavía no están
  asignados (`homeTeamId`/`awayTeamId` null) → error pidiendo asignar equipos primero.
- **Eliminatoria + no-empate:** `advancingTeamId` se **fuerza a null** (si se corrige
  un 1-1 a 2-1, se limpia la definición vieja para no dejar datos rancios).

`confirmResult` cambia su firma a:

```
confirmResult(matchId, homeScore, awayScore, advancingTeamId?: number | null)
```

Aplica la validación, normaliza `advancingTeamId` (null salvo empate de eliminatoria)
y lo persiste en el `update` junto a `homeScore`/`awayScore`/`status`. El recálculo de
puntos y `applyBracketAdvance` siguen igual.

## UI admin — inline (`src/components/AdminMatchRow.tsx`)

- Nuevas props: `stage`, `homeTeamId`, `awayTeamId`, `initialAdvancingTeamId`.
- `isKnockout = stage !== "group"`.
- Cuando `isKnockout` **y** el marcador tipeado es un empate (ambos campos con valor e
  iguales), aparece en la **misma fila** un selector compacto:
  **"Avanza: ◉ {Local} ◯ {Visitante}"**, pre-seleccionado con
  `initialAdvancingTeamId` si existe.
- Bloqueo en cliente si es empate de llave sin selección (hint inline), además del
  control en servidor.
- Al confirmar, manda `advancingTeamId` (el id elegido, o null si no es empate de
  llave) a `confirmResult`.
- La página admin (`src/app/admin/page.tsx`) ya itera `AdminMatchRow`; hay que pasarle
  las props nuevas (`stage`, `homeTeamId`, `awayTeamId`, `m.advancingTeamId`).

## Vistas que muestran el resultado

- **`/llaves`** (`BracketMatchCard` + `BracketCardData` + `toCard` en
  `src/app/llaves/page.tsx`):
  - `BracketCardData` suma `advancingSide: "home" | "away" | null`, calculado en
    `toCard` comparando `advancingTeamId` con `homeTeamId`/`awayTeamId`.
  - Si el partido terminó empatado y `advancingSide != null`: resaltar (negrita) la
    fila del equipo que avanzó y mostrar un mini-tag **"(pen.)"**.
  - El cruce siguiente ya muestra al equipo correcto porque `applyBracketAdvance` lo
    propaga; no hay cambio extra ahí.
- **`/partido/[id]`** (`src/app/partido/[id]/page.tsx`):
  - Si `status === "finished"`, es empate y hay `advancingTeamId`: junto al marcador,
    subtítulo "{Equipo} avanza por penales" (nombre derivado de `match.home`/`away`).

## Tests (vitest)

- `src/lib/bracket-advance.test.ts`:
  - Default de `mk` con `advancingTeamId: null`.
  - Nuevo test: "empate con definición propaga ganador y perdedor río abajo" (verifica
    que el `winner` avanza al cruce siguiente y el `loser` cae al 3er puesto).
  - Se mantiene "empate sin definición no resuelve".
  - Tests del nuevo helper de validación: grupo empate OK / llave empate exige avance /
    avance debe ser uno de los dos equipos / no-empate limpia el avance.
- Validación visual de los cambios de UI (selector inline + tag "(pen.)") con un
  harness HTML, porque las rutas con auth no se pueden screenshotear directo.

## Resumen de archivos tocados

| Archivo | Cambio |
|---|---|
| `src/db/schema.ts` | Columna `advancingTeamId` en `match` |
| `src/lib/bracket-advance.ts` | `advancingTeamId` en input; `outcome` usa el avance en empates; nuevo helper de validación; baja `isInvalidKnockoutDraw` |
| `src/lib/actions.ts` | `confirmResult` toma `advancingTeamId`, valida y persiste; mapeo en `applyBracketAdvance` |
| `src/components/AdminMatchRow.tsx` | Props nuevas + selector inline de avance en empates |
| `src/app/admin/page.tsx` | Pasa props nuevas a `AdminMatchRow` |
| `src/components/BracketMatchCard.tsx` | `advancingSide` + resaltado + tag "(pen.)" |
| `src/app/llaves/page.tsx` | `toCard` calcula `advancingSide` |
| `src/app/partido/[id]/page.tsx` | Subtítulo "avanza por penales" |
| `src/lib/bracket-advance.test.ts` | Tests nuevos/actualizados |

## Orden de implementación sugerido

1. Schema + helper de validación + resolución de llaves (con sus tests). Núcleo puro,
   sin tocar la DB todavía.
2. `confirmResult` / `actions.ts`.
3. UI admin (selector inline) + página admin.
4. Vistas de display (`/llaves`, `/partido/[id]`).
5. `db:push` a producción (con OK explícito) y verificación.
