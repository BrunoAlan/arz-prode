# Arz Prode — Diseño (MVP)

**Fecha:** 2026-06-07
**Estado:** Aprobado para implementación
**Autor:** Alan Bruno (alan.bruno@arzion.com) + Claude

## 1. Resumen

**Arz Prode** es el prode interno de **Arzion** para la **Copa Mundial de la FIFA 2026**
(48 equipos, 12 grupos A–L, 104 partidos, del 11 de junio al 19 de julio de 2026).

Los empleados de Arzion ingresan con su cuenta de Google `@arzion.com`, pronostican el
**marcador exacto** de cada partido y compiten en un **único ranking compartido**. Un admin
confirma los resultados a mano desde un panel. Se despliega gratis en Vercel.

## 2. Objetivos y alcance

### Objetivos
- Login únicamente con Google, restringido al dominio `@arzion.com`.
- Pronóstico de marcador exacto por partido, con bloqueo al inicio del partido.
- Ranking único en tiempo real según puntaje.
- Panel de admin para confirmar resultados y resolver los cruces de eliminatorias.
- Costo cero (Vercel Hobby + Neon free + Google OAuth).

### Fuera de alcance (MVP)
- Sub-ligas / grupos múltiples / códigos de invitación.
- Predicciones extra (campeón, goleador, fase de grupos).
- Sincronización automática vía API de fútbol.
- Notificaciones push / email.
- App móvil nativa (la web es responsive).

## 3. Decisiones de producto

| Tema | Decisión |
|------|----------|
| Audiencia | Un único grupo privado, ranking compartido |
| Acceso | Google OAuth, restringido a dominio `@arzion.com` |
| Qué se pronostica | Marcador exacto de cada partido |
| Sistema de puntos | Acertar resultado (1X2) = **+1**; marcador exacto = **+3** (reemplaza al +1, no acumulativo); errar = **0** |
| Origen de datos | Fixture pre-cargado (seed) + resultados confirmados a mano por admin |
| Torneo | Solo Mundial 2026 |
| Admin | `alan.bruno@arzion.com` (configurable vía `ADMIN_EMAILS`) |
| Deploy | Vercel (plan Hobby, gratis) |

## 4. Stack técnico (Opción A — aprobada)

- **Framework:** Next.js (App Router) — Server Components + Server Actions.
- **Auth:** Auth.js v5 con provider de Google; validación de dominio `@arzion.com` en el callback.
- **DB:** Postgres serverless en **Neon** (free tier).
- **ORM:** Drizzle (liviano, serverless-friendly, con `@neondatabase/serverless`).
- **UI:** Tailwind CSS (opcionalmente shadcn/ui para componentes base).
- **Hosting:** Vercel Hobby. Un solo repo, un solo deploy. TypeScript end-to-end.

## 5. Autenticación y control de acceso

1. El usuario hace clic en "Ingresar con Google" (único método).
2. En el callback `signIn` de Auth.js se valida:
   - `email_verified === true`,
   - el email termina en `@${ALLOWED_DOMAIN}` (`arzion.com`).
   Si no cumple, se rechaza el ingreso y se muestra una página de **acceso restringido a Arzion**.
3. La sesión usa el **adapter de Drizzle** (estrategia de base de datos), persistiendo al usuario
   para vincular sus pronósticos.
4. **Rol admin:** determinado por la env `ADMIN_EMAILS` (lista separada por comas). El resto son
   jugadores. Las rutas y acciones de admin verifican este rol del lado del server.

> Opcional (si `arzion.com` es un Google Workspace): crear la app OAuth como "Interna" dentro de la
> organización para reforzar la restricción a nivel Google. Igual validamos el dominio en código.

## 6. Modelo de datos (Drizzle / Postgres)

**Tablas de Auth.js:** `users` (id, name, email, image, emailVerified), `accounts`, `sessions`,
`verificationTokens`.

**Tablas del dominio:**

- **teams**
  - `id` (pk), `name`, `fifaCode` (3 letras), `group` (A–L), `flag` (emoji o código).
- **matches**
  - `id` (pk)
  - `stage`: `group | round_of_32 | round_of_16 | quarter_final | semi_final | third_place | final`
  - `groupLabel` (nullable, A–L para fase de grupos)
  - `homeTeamId` (nullable, fk teams), `awayTeamId` (nullable, fk teams)
  - `homePlaceholder` / `awayPlaceholder` (texto, ej. "Ganador Grupo A", "2º Grupo B") para cruces sin definir
  - `kickoffAt` (timestamptz, UTC)
  - `venue` (texto)
  - `status`: `scheduled | finished`
  - `homeScore` / `awayScore` (nullable hasta finalizar)
- **predictions**
  - `id` (pk), `userId` (fk), `matchId` (fk)
  - `homeScorePred`, `awayScorePred`
  - `points` (nullable; se cachea al finalizar el partido)
  - `updatedAt`
  - **Único** por (`userId`, `matchId`).

## 7. Reglas de negocio

### Cuándo se puede pronosticar
Un partido es pronosticable cuando **tiene ambos equipos definidos** (no null) y **aún no llegó su
`kickoffAt`**. Los 72 partidos de grupos ya tienen equipos; las eliminatorias arrancan con
placeholders y el admin asigna los equipos a medida que se definen los cruces.

### Bloqueo
El pronóstico se crea/edita libremente hasta el `kickoffAt`. Pasado ese momento queda bloqueado.
La validación se hace **en el server** (server action), no solo deshabilitando la UI.

### Cálculo de puntos
Cuando el admin marca un partido como `finished` con su marcador:
- Para cada pronóstico del partido:
  - **+3** si `(homeScorePred, awayScorePred) === (homeScore, awayScore)` (marcador exacto).
  - si no, **+1** si el signo del resultado coincide (local gana / empate / visitante gana).
  - si no, **0**.
- El valor se guarda en `predictions.points`.

### Privacidad de pronósticos
Los pronósticos ajenos de un partido se muestran **solo después del `kickoffAt`** (evita copiar).

### Ranking y desempates
Orden: (1) puntos totales desc, (2) cantidad de marcadores exactos desc, (3) nombre asc.

## 8. Pantallas

- **/** — Sin sesión: bienvenida + "Ingresar con Google". Con sesión no-`@arzion.com`: acceso restringido.
- **/predicciones** — Partidos agrupados por fecha/fase, inputs de marcador, bloqueados en gris.
  Filtro por fase. Horarios mostrados en hora de Argentina (America/Argentina/Buenos_Aires).
- **/ranking** — Tabla de posiciones con puntos, marcadores exactos y desempates.
- **/partido/[id]** — Detalle: resultado y todos los pronósticos (visibles tras el kickoff).
- **/admin** — Solo admins: confirmar resultados, asignar equipos a cruces de eliminatorias, ajustar horarios.

## 9. Datos semilla (fixture Mundial 2026)

Un script de seed carga:
- Los **48 equipos** clasificados con su grupo (A–L).
- Los **104 partidos**: 72 de fase de grupos (con equipos), más eliminatorias con placeholders
  (Round of 32 → Final), con fecha, sede y horario oficiales.

> La compilación del fixture oficial exacto (equipos, grupos, fechas, sedes, horarios) es una tarea
> de carga de datos que se resuelve en la implementación a partir de la fuente oficial FIFA / Wikipedia.
> El formato 2026: 48 equipos, 12 grupos de 4, Round of 32 (2 primeros de cada grupo + 8 mejores terceros).

## 10. Deploy gratis en Vercel

Repo en GitHub → Vercel Hobby. Variables de entorno:

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Conexión a Neon Postgres |
| `AUTH_SECRET` | Secreto de Auth.js |
| `GOOGLE_CLIENT_ID` | OAuth de Google |
| `GOOGLE_CLIENT_SECRET` | OAuth de Google |
| `AUTH_URL` | URL pública de la app |
| `ADMIN_EMAILS` | Lista de emails admin (incluye `alan.bruno@arzion.com`) |
| `ALLOWED_DOMAIN` | `arzion.com` |

Se entregará guía paso a paso para: crear credenciales OAuth en Google Cloud Console, crear la base
en Neon, correr migraciones + seed, y conectar el repo a Vercel.

## 11. Riesgos y notas

- **Timeline ajustado:** el Mundial arranca el 11/6/2026. El MVP debe estar listo para esa fecha;
  por eso se prioriza carga manual (sin integración de API).
- **Carga de resultados manual:** el admin debe cargar ~104 resultados durante el torneo. Aceptable
  para un grupo interno; se puede automatizar con API más adelante.
- **Exactitud del fixture:** depende de la calidad de la fuente al seedear. Se revisa contra fuente oficial.
- **Eliminatorias:** los cruces (equipos) se asignan a mano a medida que avanzan las fases.
