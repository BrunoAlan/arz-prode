# Ordenar predicciones por fecha

**Fecha:** 2026-06-12
**Estado:** Aprobado para implementación

## Problema

La vista de predicciones (`src/app/predicciones/page.tsx`) muestra los partidos
agrupados únicamente por grupo (A, B, C…) y luego por ronda de eliminación. No
hay forma de ver los partidos en orden cronológico puro, mezclando grupos y
eliminación según el horario real de juego. Cuando hay varios partidos el mismo
día de fases distintas, el usuario no puede verlos juntos.

## Objetivo

Sumar una segunda vista que ordene y agrupe los partidos **por fecha**, sin
quitar la vista por grupo actual.

## Decisiones de diseño

- **Modo fecha = agrupado por día.** Encabezado por día (ej. "Jue 12 jun") y
  debajo los partidos de ese día en orden de horario, mezclando grupos y
  eliminación.
- **Persistencia por URL.** `/predicciones` → vista por grupo (default).
  `/predicciones?orden=fecha` → vista por fecha. El page sigue siendo Server
  Component, la URL es compartible y no se agrega estado de cliente.
- **Default: por grupo.** Mantiene el comportamiento actual; "por fecha" es
  opt-in.
- **Zona horaria del agrupado: Buenos Aires.** El agrupado por día se calcula en
  el server usando `DEFAULT_TIME_ZONE` (`America/Argentina/Buenos_Aires`), igual
  que el fallback determinista de `LocalTime`. Para un prode argentino es lo
  correcto y evita mismatch de hidratación. La hora puntual de cada partido la
  sigue ajustando `LocalTime` a la TZ del navegador en el cliente, sin cambios.

### Alternativa descartada

Reagrupar por día en el cliente según la TZ del navegador (vía localStorage).
Daría límites de día exactos por usuario, pero obliga a convertir la lista en
Client Component, complica las server actions de `PredictionForm` y agrega
hidratación. No se justifica frente al beneficio.

## Arquitectura

El punto central: **ambos modos producen la misma forma de datos**
(`MatchSection<T>[]`). Por eso todo el render actual de
`predicciones/page.tsx` — nav sticky, cards, `PredictionForm`, animaciones —
queda **idéntico**; sólo cambia qué función arma las secciones.

### Componentes

1. **`src/lib/group-matches.ts` → nueva función `groupMatchesByDay()`**
   - Firma: `groupMatchesByDay<T extends Groupable>(matches: T[]): MatchSection<T>[]`.
   - Ordena todos los partidos por `kickoffAt` ascendente.
   - Agrupa por día calendario en TZ Buenos Aires.
   - Cada sección:
     - `key`: `"dia-YYYY-MM-DD"` (fecha en TZ BA, estable para el ancla del nav).
     - `title`: día formateado (ej. "Jue 12 jun").
     - `matches`: partidos de ese día, ya ordenados por horario.
   - Las secciones se devuelven en orden cronológico de día.
   - Reutiliza el tipo `Groupable` existente (necesita `kickoffAt: Date`).

2. **`src/lib/format.ts` → nuevo helper `formatDay(date, tz)`**
   - Devuelve sólo weekday + día + mes, sin hora
     (ej. `Intl.DateTimeFormat("es-AR", { timeZone, weekday: "short", day: "2-digit", month: "short" })`).
   - Default `timeZone = DEFAULT_TIME_ZONE`.
   - Se usa para el `title` de cada sección día.
   - Para derivar el `key` (`YYYY-MM-DD` en TZ BA) se usa un formateo aparte con
     `en-CA` o `Intl.DateTimeFormat` con `year/month/day` numéricos para obtener
     una clave estable e independiente del locale de display.

3. **`src/app/predicciones/page.tsx` → branch por searchParam**
   - Lee `orden` de los search params de la página.
   - Si `orden === "fecha"` usa `groupMatchesByDay(allMatches)`; si no,
     `groupMatches(allMatches)`.
   - El resto del componente (nav, secciones, cards) no cambia.
   - **Nota Next.js:** esta versión del framework puede exponer `searchParams`
     como `Promise`. Verificar la API exacta en
     `node_modules/next/dist/docs/` antes de implementar y respetar ese contrato
     (await si corresponde).

4. **Toggle de vista (control segmentado)**
   - Dos `<Link>` de `next/link`: uno a `/predicciones` ("Por grupo") y otro a
     `/predicciones?orden=fecha` ("Por fecha").
   - Estilo tipo pills, resaltando el activo según el valor de `orden`. Reusa
     las clases/estética ya presentes (borde redondeado, `text-muted-foreground`,
     hover), consistente con el nav sticky actual.
   - Sin estado de cliente: la navegación entre vistas es por URL.
   - Ubicación: en el header, arriba del nav sticky de secciones.
   - Puede vivir inline en `page.tsx` o como pequeño componente
     `ViewToggle` en `src/components/`; decisión menor, a resolver en el plan.

## Flujo de datos

1. `PrediccionesPage` hace `getMatchesOrdered()` (ya ordena por `kickoffAt`) y
   `getUserPredictions(user.id)` — sin cambios.
2. Lee `orden` de los search params.
3. Selecciona la función de agrupado según `orden`.
4. Renderiza secciones de forma idéntica en ambos modos.

## Manejo de errores / casos borde

- `orden` con un valor desconocido (ej. `?orden=xyz`) → cae al default (por
  grupo). El branch es estricto: sólo `"fecha"` activa la vista por fecha.
- Sin partidos → ambas funciones devuelven `[]`; el render ya tolera lista
  vacía (no renderiza secciones).
- Partidos sin `groupLabel` (eliminación) en modo fecha → se agrupan por su día
  igual que cualquier otro; el modo fecha no mira `stage`/`groupLabel`.
- Día con un solo partido → sección con un ítem, válido.

## Testing

- **`groupMatchesByDay` (unit):**
  - Agrupa correctamente partidos del mismo día calendario (TZ BA) en una sección.
  - Separa en días distintos partidos cruzando la medianoche de Buenos Aires.
  - Mezcla partidos de `stage` distintos (group + knockout) en el mismo día.
  - Devuelve secciones en orden cronológico y partidos ordenados por horario
    dentro de cada día.
  - `keys` estables y con formato `dia-YYYY-MM-DD`.
  - Lista vacía → `[]`.
- **`formatDay` (unit):** formato esperado en TZ default y en una TZ explícita.
- **Page (manual / smoke):** `/predicciones` muestra vista por grupo;
  `/predicciones?orden=fecha` muestra vista por día; el toggle resalta el modo
  activo y los links navegan entre ambos.

## Fuera de alcance

- Recordar la preferencia entre visitas más allá de la URL (localStorage).
- Agrupado por día según la TZ del navegador de cada usuario.
- Otros criterios de orden (por torneo, por estado, etc.).
- Cambios en otras vistas (ranking, posiciones, llaves).
