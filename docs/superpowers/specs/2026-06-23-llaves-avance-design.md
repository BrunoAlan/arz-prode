# Poblar llaves y resolver pasajes — Diseño

**Fecha:** 2026-06-23
**Estado:** Aprobado para escribir plan de implementación

## Problema

El cuadro de eliminatorias (`/llaves`) muestra siempre su estructura estática con
*placeholders* (`1F`, `2C`, `3 A/B/C/D/F`, `Ganador R32-74`, `Perdedor SF-101`).
Cada celda muestra el equipo real solo si el partido de la DB tiene `homeTeamId` /
`awayTeamId` cargados. Hoy:

- Cargar un resultado (`confirmResult`) solo setea marcador + estado y recalcula
  puntos. **No avanza equipos** al cruce siguiente.
- Existe `assignTeams(matchId, homeTeamId, awayTeamId)` pero **no está cableado a
  ninguna UI**.

Resultado: aunque se carguen todos los resultados, las llaves nunca se completan.

## Objetivo

Que las llaves se **pueblen y avancen solas** a medida que el admin carga
resultados, con la mínima intervención manual posible.

## Decisiones tomadas (brainstorming)

1. **Control: automático + override.** Al cargar un resultado, el equipo que
   corresponde avanza solo al cruce siguiente. La corrección se hace cambiando los
   *inputs* (recargar el marcador, reasignar un tercero), no editando equipos a mano.
2. **Empates en eliminatorias: no existen en los datos.** El marcador que se carga
   en una llave **ya refleja la definición** (ej. un 2-2 que se va a penales se
   carga como `3-2` a favor del que ganó). Por lo tanto:
   - El que avanza es **siempre el del marcador más alto**.
   - **No hace falta** un campo `winnerTeamId` ni campos de penales → **sin cambio
     de schema**.
   - Se **rechaza** cargar un partido de eliminatoria empatado.
3. **Terceros: asignación manual.** El sistema rankea los 12 terceros y marca los 8
   que clasifican; el admin asigna cuál tercero va a cada slot `3 X/Y/Z`. No se
   implementa la tabla oficial de FIFA.
4. **UI: extender el flujo actual** (resultados) + un **panel chico de terceros**.

## Dominio (formato Mundial 2026)

- 48 equipos, 12 grupos (A–L), 104 partidos: 72 de grupos (números 1–72) + 32 de
  eliminatorias (números 73–104).
- Placeholders de eliminatoria, dos tipos:
  - **Posición de grupo**: `1F` (ganador grupo F), `2C` (segundo grupo C),
    `3 A/B/C/D/F` (uno de los mejores terceros, de alguno de esos grupos).
  - **Referencia a partido previo**: `Ganador R32-74`, `Perdedor SF-101`.
- En R32 hay **8 slots de tercero**, todos en el lado *away*, con formato
  `"3 " + grupos separados por "/"`.

> **Ojo — dos cosas distintas que se llaman "tercero":**
> - **Terceros de grupo** (slots `3 X/Y/Z` en R32): los 8 mejores terceros que
>   clasifican → **asignación manual** (panel de terceros).
> - **Partido por el tercer puesto** (la finalita: `Perdedor SF-101` vs
>   `Perdedor SF-102`): son *slots de perdedor* → **automático**, lo llena el
>   resolver desde las semis, igual que la final.
- `buildBracket()` (en `src/lib/bracket.ts`) ya parsea cada placeholder en
  `{ kind: "group" | "winner" | "loser", ... }` y asigna a cada nodo un
  `matchNumber` (posición en el fixture, 1–104) y sus `feeders`.

## Arquitectura

### 1. Resolver puro e idempotente — `src/lib/bracket-advance.ts`

Función nueva `resolveBracket(input)` que **no toca la DB**: recibe el estado y
devuelve, para cada partido de eliminatoria, los equipos que le corresponden.

```ts
type ResolveInput = {
  // partidos de eliminatoria de la DB (id, matchNumber derivado, placeholders,
  // homeTeamId/awayTeamId actuales, homeScore/awayScore, status)
  knockout: KnockoutMatchState[];
  // standings ya calculados por grupo (reusa computeGroupStandings)
  standingsByGroup: Map<string, StandingRow[]>;
  // grupos completos (los 6 partidos finished) — para saber si 1X/2X ya son firmes
  completedGroups: Set<string>;
};

// devuelve solo los slots que el resolver "posee" (auto), con su valor resuelto
type ResolvedSlot = {
  matchId: number;
  side: "home" | "away";
  teamId: number;
};

function resolveBracket(input: ResolveInput): ResolvedSlot[];
```

**Cómo resuelve cada slot** (usando el parse de `buildBracket`):

| Placeholder            | Tipo        | Resolución                                                        | ¿Quién lo escribe? |
|------------------------|-------------|-------------------------------------------------------------------|--------------------|
| `1F` / `2C`            | grupo, pos. | `standingsByGroup[X][pos-1].teamId`, si el grupo X está completo  | **resolver (auto)**|
| `3 A/B/C/D/F`          | grupo, 3ero | — (lo deja intacto)                                               | **admin (manual)** |
| `Ganador R32-74`       | winner      | equipo con **mayor marcador** del partido nº 74 (si finished)     | **resolver (auto)**|
| `Perdedor SF-101`      | loser       | el **otro** equipo del partido nº 101 (si finished)               | **resolver (auto)**|

- Distinción de slots de grupo: `^([12])([A-L])$` → posición (auto);
  `^3 ` → tercero (manual, se omite).
- El mapeo `matchNumber → partido DB` se hace vía el placeholder-key
  (`homePlaceholder::awayPlaceholder`), igual que hoy en `llaves/page.tsx`,
  cruzando los nodos de `buildBracket()` (que tienen `matchNumber`) con los
  partidos de la DB.
- Procesa por orden de ronda: R32 → R16 → cuartos → semis → {3er puesto, final},
  para que los ganadores de arriba ya estén disponibles al resolver los de abajo.
- **Idempotente y propagante**: re-correrlo siempre re-deriva lo mismo; si cambia un
  marcador de arriba, al re-correr se actualizan los slots de abajo.
- **No escribe** los slots de tercero (`3 ...`): esos son del admin y el resolver no
  los pisa.

### 2. Persistencia — en `src/lib/actions.ts`

Helper `applyBracketAdvance()` que:
1. Lee los partidos de eliminatoria + standings.
2. Llama a `resolveBracket()`.
3. Persiste solo los **deltas** (slots cuyo `teamId` resuelto difiere del actual)
   con `UPDATE match SET home_team_id / away_team_id`.
4. `revalidatePath("/llaves")` (+ `/predicciones`, `/admin` si aplica).

`confirmResult(matchId, homeScore, awayScore)` queda así:
1. `requireAdmin()` + validación de marcador existente.
2. **Nuevo:** si `stage` ∈ eliminatorias y `homeScore === awayScore` → `throw`
   *"En eliminatorias cargá el resultado con la definición ya reflejada (ej. 3-2);
   no puede quedar empate."*
3. `UPDATE match` (marcador + `status: "finished"`).
4. Recalcular puntos de las predicciones (igual que hoy).
5. **Nuevo:** `await applyBracketAdvance()`.

### 3. Asignación de terceros — action nueva + panel

- **Action** `assignThird(matchId, teamId)`:
  - `requireAdmin()`.
  - Valida que el partido sea R32 y tenga un slot `3 ...` (en el lado *away*).
  - Valida que `teamId` sea el **tercero** de uno de los grupos permitidos del slot
    (parseando los grupos del placeholder) **y** que ese grupo esté completo.
  - Setea el `teamId` en el lado del slot de tercero.
  - Llama a `applyBracketAdvance()` (para propagar cuando ese equipo avance) +
    revalidate.
- **Helper de ranking** `computeThirdPlaceRanking(...)`: rankea los 12 terceros por
  puntos / dif. de gol / goles a favor y marca los 8 mejores (clasifican). Reusa la
  lógica de `standings.ts`.

### 4. UI de admin

- **Resultados (`AdminMatchRow` → `confirmResult`)**: sin cambios de UX salvo el
  manejo del error de empate en eliminatorias (mostrar el mensaje del `throw`).
- **Panel de terceros** (sección nueva en la vista de admin): se habilita cuando los
  12 grupos están completos. Muestra los 12 terceros rankeados (8 marcados como
  clasificados) y, por cada uno de los 8 slots `3 X/Y/Z` de R32, un selector para
  asignar el tercero correspondiente (solo equipos válidos para ese slot).

## Flujo del admin (end-to-end)

1. **Grupos**: cargar el marcador de cada partido (como hoy). Esto recalcula puntos
   de predicciones y, al completarse un grupo, llena sus `1X`/`2X` en R32.
2. **Terminados los 12 grupos**: en el panel de terceros, asignar cada uno de los 8
   terceros clasificados a su slot. R32 queda 100% poblado.
3. **Eliminatorias**: cargar el marcador de cada llave con la definición ya reflejada
   (ej. `3-2`, nunca empate). El ganador avanza solo al cruce siguiente.
4. Repetir ronda por ronda hasta final + 3er puesto.
5. **Correcciones**: recargar el marcador correcto → el avance se re-propaga solo.

> Los **puntos de las predicciones** son 100% automáticos; el admin solo carga
> **marcadores**. Lo único manual nuevo es asignar los 8 terceros (una vez).

## Testing

`resolveBracket` y los helpers se testean como funciones puras (vitest, igual que
`bracket.test.ts`):

- R32: `1X`/`2X` resueltos desde standings cuando el grupo está completo; no resueltos
  si el grupo está incompleto.
- R32: slots `3 ...` **no** los toca el resolver.
- Cadena ganador: `Ganador R32-74` → equipo de mayor marcador del 74; propaga hasta
  semis.
- `Perdedor SF-101` → el otro equipo; 3er puesto y final desde semis.
- **Idempotencia**: correr `resolveBracket` dos veces da el mismo resultado.
- `computeThirdPlaceRanking`: ordena y marca 8 correctamente (incluye desempates).
- Validación de no-empate en `confirmResult` para eliminatorias (vs. permitido en
  grupos).

## Fuera de alcance

- **Scoring de predicciones**: no cambia. Sigue por marcador; los penales reflejados
  en el score no afectan el cálculo de puntos.
- **Tabla FIFA automática de terceros**: se eligió asignación manual.
- **Override directo de equipos** (forzar un equipo salteando los inputs): no se
  implementa; la corrección es vía inputs (marcador / tercero). Se puede agregar más
  adelante si aparece un caso raro.

## Sin migración de DB

El schema de `match` ya tiene `homeTeamId`, `awayTeamId`, `homeScore`, `awayScore`,
`status`, `stage`, `homePlaceholder`, `awayPlaceholder`. No se agrega ninguna columna.
