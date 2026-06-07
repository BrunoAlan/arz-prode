# Tabla de posiciones por grupo (`/posiciones`)

**Fecha:** 2026-06-07
**Estado:** Aprobado, pendiente de plan

## Problema

El prode del Mundial 2026 ya tiene un ranking de jugadores (`/ranking`), pero no
muestra la **tabla de posiciones de los equipos** ("la de toda la vida") que se va
armando a medida que se cargan los resultados de los partidos de fase de grupos.
Queremos una página nueva `/posiciones` con una tabla por cada grupo (A..L) que se
llene automáticamente con los resultados oficiales ya cargados.

## Objetivo

Una página protegida `/posiciones` que liste los 12 grupos, cada uno con su tabla de
posiciones clásica (PJ G E P GF GC DG Pts), ordenada con reglas de desempate FIFA
(incluyendo head-to-head) y con los puestos de clasificación (1º y 2º) resaltados.

## Arquitectura

Se separa el cálculo puro de la query y la UI, siguiendo el patrón existente
(`scoring.ts` / `ranking.ts` → `computeRanking` → `queries.ts` → page).

### 1. `src/lib/standings.ts` — módulo puro (núcleo)

Función principal:

```
computeGroupStandings(teams: StandingTeam[], matches: StandingMatch[]): StandingRow[]
```

Tipos:

- `StandingTeam`: `{ id: number; name: string; flag: string | null }`
- `StandingMatch`: `{ homeTeamId: number; awayTeamId: number; homeScore: number; awayScore: number }`
  (solo se le pasan partidos ya jugados/válidos; ver query)
- `StandingRow`:
  `{ teamId, name, flag, played, won, drawn, lost, goalsFor, goalsAgainst, goalDiff, points, position, qualifies }`

Reglas:

- Solo cuentan partidos de fase de grupos con resultado cargado. Un grupo sin
  resultados devuelve todas las filas en 0.
- Puntos: victoria 3, empate 1, derrota 0.
- `goalDiff = goalsFor - goalsAgainst`.
- `qualifies = position === 1 || position === 2`.

**Orden de desempate (reglas FIFA):**

1. Puntos totales (desc)
2. Diferencia de gol total (desc)
3. Goles a favor totales (desc)
4. Si dos o más equipos siguen empatados, se construye una **mini-tabla
   head-to-head** solo con los partidos entre los equipos empatados, y se los
   reordena por: puntos h2h → diferencia de gol h2h → goles a favor h2h.
   Si dentro del subgrupo head-to-head persiste un empate en un subconjunto,
   se aplica la regla recursivamente sobre ese subconjunto.
5. Fallback determinista final: nombre del equipo (alfabético). No se trackea
   fair-play ni sorteo, así que el orden queda estable acá.

### 2. `src/lib/queries.ts` — `getGroupStandings()`

```
getGroupStandings(): Promise<{ label: string; rows: StandingRow[] }[]>
```

- Trae los equipos con `group != null` y los partidos con `stage = "group"` y
  `status = "finished"` (con `homeScore`/`awayScore` no nulos).
- Agrupa equipos y partidos por etiqueta de grupo, usando el orden A..L ya
  definido en `group-matches.ts` (se reutiliza/expone esa lista de labels).
- Para cada grupo llama a `computeGroupStandings`.
- Devuelve solo los grupos que tengan equipos.

### 3. `src/components/StandingsTable.tsx`

- Recibe `{ label: string; rows: StandingRow[] }` y renderiza una tabla.
- Columnas: **PJ G E P GF GC DG Pts**. `Pts` en `font-semibold`; números con
  `tabular-nums` y `font-mono` como el resto de la app.
- Reusa `TeamLabel` para bandera + nombre.
- Filas de posición 1 y 2 (`qualifies`) resaltadas con el mismo lenguaje visual
  del ranking (fondo `bg-accent` sutil o barrita de color).

### 4. `src/app/posiciones/page.tsx`

- Server component, ruta protegida con `requireUser()` (como `/ranking`).
- Header "Posiciones · Mundial 2026".
- Llama a `getGroupStandings()` y renderiza un `<StandingsTable>` por grupo.

### 5. `src/app/layout.tsx`

- Agregar link "Posiciones" en el nav, entre "Llaves" y "Ranking".

## Testing (TDD sobre `standings.ts`)

- Grupo sin partidos → todas las filas en 0, orden por nombre.
- Un partido simple → ganador 3 pts, perdedor 0, GF/GC correctos.
- Empate de puntos resuelto por diferencia de gol.
- Empate de puntos y DG resuelto por goles a favor.
- **Triple empate** resuelto por mini-tabla head-to-head.
- Empate total (mismos pts, DG, GF y h2h) → orden alfabético por nombre.
- `qualifies` correcto para posiciones 1 y 2.

## Fuera de alcance

- Cálculo de "mejores terceros".
- Fair-play / sorteo como desempate.
- Posiciones o tablas de la fase de eliminatorias.
- Recálculo en tiempo real (es server component; se actualiza al recargar tras
  cargar resultados en `/admin`).
