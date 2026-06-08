# Arz Prode ⚽

Prode interno de **Arzion** para la **Copa Mundial de la FIFA 2026**. Login solo con Google
restringido a los dominios `@arzion.com` y `@restosimple.com`, pronóstico de marcador exacto por
partido, ranking único compartido y panel de admin para cargar resultados.

## Stack

- **Next.js** (App Router, TypeScript) — Server Components + Server Actions
- **Auth.js v5** (Google) con restricción por dominio (`@arzion.com`, `@restosimple.com`; split config edge-safe)
- **Drizzle ORM** + **Neon** (Postgres serverless)
- **Tailwind v4** + **shadcn/ui** — theme "Editorial Scoreboard" (claro, acento lime)
- **Vitest** (lógica de dominio testeada)
- Deploy en **Vercel** (plan Hobby, gratis)

## Reglas

- **Pronóstico**: marcador exacto de cada partido, editable hasta el inicio del partido.
- **Puntos**: acertar el resultado (1X2) = **+1**; acertar el marcador exacto = **+3** (reemplaza al +1).
- **Privacidad**: los pronósticos ajenos de un partido se ven recién después del kickoff.
- **Admin**: definido por `ADMIN_EMAILS`; confirma resultados (recalcula puntos) y asigna los cruces de eliminatorias.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completá los valores (ver abajo)
npx auth secret              # genera AUTH_SECRET en .env.local
npm run dev                  # http://localhost:3000
npm test                     # corre los tests de Vitest
```

## Variables de entorno (`.env.local`)

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon (`postgresql://...?sslmode=require`) |
| `AUTH_SECRET` | Secreto de Auth.js (`npx auth secret`) |
| `AUTH_URL` | URL pública (local: `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales OAuth de Google |
| `ALLOWED_DOMAIN` | Dominios permitidos separados por coma (ej. `arzion.com,restosimple.com`) |
| `ADMIN_EMAILS` | Emails admin separados por coma (ej. `alan.bruno@arzion.com`) |
| `AUTH_TRUST_HOST` | `true` en Vercel / detrás de un proxy |

## Base de datos

```bash
npm run db:push   # crea las tablas en Neon a partir del schema Drizzle
npm run db:seed   # carga el fixture del Mundial 2026 (48 equipos, 104 partidos)
```

> El seed (`src/db/fixture-data.ts`) se compiló del fixture oficial; **conviene revisarlo**
> (grupos, horarios en UTC, sedes) antes del torneo. Es idempotente: si ya hay equipos, aborta.

## Puesta en producción (Vercel, gratis)

1. **Neon**: crear cuenta y proyecto Postgres → copiar el connection string a `DATABASE_URL`.
2. **Google OAuth** (Google Cloud Console → APIs & Services):
   - OAuth consent screen: con dominios de más de una organización usá **External** (el modo **Internal** limita a un solo Workspace). La restricción real la aplica `ALLOWED_DOMAIN`.
   - Credentials → OAuth client ID → Web application. Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (local)
     - `https://<tu-app>.vercel.app/api/auth/callback/google` (prod)
   - Copiar Client ID/Secret.
3. **Subir a GitHub** y **importar en Vercel** (framework Next.js autodetectado, plan Hobby).
4. **Variables de entorno en Vercel** (Production): todas las de la tabla de arriba, con
   `AUTH_URL=https://<tu-app>.vercel.app` y `AUTH_TRUST_HOST=true`.
5. Desde tu máquina (con el `DATABASE_URL` de Neon en `.env.local`): `npm run db:push && npm run db:seed`.
6. Deploy en Vercel y smoke test: login con `@arzion.com` o `@restosimple.com`, cargar un pronóstico, ver el ranking;
   con la cuenta admin, confirmar un resultado.

## Estructura

- `src/lib/{access,scoring,match-rules,ranking}.ts` — lógica de dominio pura (testeada con Vitest).
- `src/db/` — schema Drizzle, cliente Neon, fixture y seed.
- `src/auth.config.ts` / `src/auth.ts` / `src/middleware.ts` — Auth.js (split edge-safe).
- `src/lib/{queries,actions,session}.ts` — acceso a datos y server actions.
- `src/app/` — páginas (`/`, `/predicciones`, `/ranking`, `/partido/[id]`, `/admin`).

Diseño y plan de implementación en `docs/superpowers/`.
