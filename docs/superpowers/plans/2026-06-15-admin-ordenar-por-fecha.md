# Vista de partidos ordenada por fecha en Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar a `/admin` el toggle "Por grupo / Por fecha" y la nav sticky de saltos que ya tiene `/predicciones`, reutilizando `groupMatchesByDay`.

**Architecture:** Cambio a un solo archivo (`src/app/admin/page.tsx`). Se lee `?orden=fecha` desde `searchParams`, se elige entre `groupMatches` y `groupMatchesByDay` (ambas ya existentes), y se replica el markup del toggle + nav de la página de predicciones apuntando los hrefs a `/admin`. No hay lógica nueva: la agrupación por día ya está implementada y testeada.

**Tech Stack:** Next.js (versión del repo con `searchParams` como `Promise`), React Server Components, Tailwind.

---

## Nota sobre testing

No se agrega lógica nueva unit-testeable: `groupMatchesByDay` ya está cubierta por `src/lib/group-matches.test.ts`. Por eso este plan no incluye un test rojo→verde nuevo; la verificación es typecheck + lint + build + suite existente + chequeo visual. La ruta `/admin` es autenticada y no se puede screenshotear directo, así que la verificación visual usa un harness HTML standalone (ver Task 2).

---

## File Structure

- **Modify:** `src/app/admin/page.tsx` — única responsabilidad: renderizar la vista de admin de resultados. Pasa a aceptar `searchParams`, elegir agrupación y mostrar toggle + nav.

No se crean ni tocan otros archivos. `src/lib/group-matches.ts` queda intacto (ya genérico y testeado).

---

## Task 1: Agregar toggle por fecha y nav sticky a la vista de admin

**Files:**
- Modify: `src/app/admin/page.tsx` (reemplazo completo del archivo)

- [ ] **Step 1: Reemplazar el contenido completo de `src/app/admin/page.tsx`**

```tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getMatchesOrdered } from "@/lib/queries";
import { groupMatches, groupMatchesByDay } from "@/lib/group-matches";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const { orden } = await searchParams;
  const byDate = orden === "fecha";
  const allMatches = await getMatchesOrdered();
  const sections = byDate
    ? groupMatchesByDay(allMatches)
    : groupMatches(allMatches);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Admin · Resultados
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá el marcador final; al confirmar se recalculan puntos y ranking.
        </p>
        <div
          role="group"
          aria-label="Ordenar partidos"
          className="mt-4 inline-flex gap-1 rounded-full border p-1 text-xs"
        >
          <Link
            href="/admin"
            aria-current={!byDate ? "page" : undefined}
            className={`rounded-full px-3 py-1 transition-colors ${
              byDate
                ? "text-muted-foreground hover:text-foreground"
                : "bg-foreground text-background"
            }`}
          >
            Por grupo
          </Link>
          <Link
            href="/admin?orden=fecha"
            aria-current={byDate ? "page" : undefined}
            className={`rounded-full px-3 py-1 transition-colors ${
              byDate
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Por fecha
          </Link>
        </div>
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

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key} id={section.key} className="scroll-mt-28">
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

- [ ] **Step 2: Verificar lint**

Run: `npm run lint`
Expected: sin errores ni warnings nuevos.

- [ ] **Step 3: Verificar typecheck + build**

Run: `npm run build`
Expected: build exitoso (`Compiled successfully`), sin errores de tipos en `admin/page.tsx`.

- [ ] **Step 4: Correr la suite de tests existente**

Run: `npm test`
Expected: PASS, incluyendo `src/lib/group-matches.test.ts` (la agrupación por día sigue verde).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: vista de admin ordenable por fecha (toggle ?orden=fecha)"
```

---

## Task 2: Verificación visual en harness

**Files:**
- Create (temporal, no se commitea): un HTML standalone con el markup del header (toggle) + nav + dos secciones de ejemplo, para capturar screenshot. `/admin` es autenticada y no se puede screenshotear directo (ver [[validate-visual-changes-in-harness]]).

- [ ] **Step 1: Armar harness HTML**

Crear un archivo temporal (p. ej. `/tmp/admin-harness.html`) que reproduzca, con Tailwind CDN o las clases inline equivalentes, el bloque del toggle "Por grupo / Por fecha", la `<nav>` sticky con 2-3 anclas, y dos `<section>` con un par de filas placeholder. No requiere datos reales: es para validar layout y estados del toggle.

- [ ] **Step 2: Screenshot del harness**

Abrir el harness en el navegador y capturar screenshot en estado "Por grupo" y en estado "Por fecha" (cambiando manualmente cuál pill tiene `bg-foreground text-background`). Confirmar visualmente: pills bien contrastadas, nav sticky con anclas, secciones con título.

- [ ] **Step 3: Mostrar screenshot al usuario y pedir refresh**

Presentar el/los screenshot al usuario. Si lo aprueba, pedirle que refresque `/admin` y `/admin?orden=fecha` en su sesión autenticada para confirmar en el entorno real.

---

## Self-Review (completado al escribir el plan)

- **Cobertura del spec:** los 5 cambios del spec (firma con `searchParams`, selección de agrupación, toggle UI, nav sticky, `id`+`scroll-mt-28` en secciones) están todos en el reemplazo de archivo de la Task 1. Los imports nuevos (`Link`, `groupMatchesByDay`) están en el `import` block. ✔
- **Placeholders:** ninguno; el código del archivo está completo. ✔
- **Consistencia de tipos:** la firma `searchParams: Promise<...>` y `await searchParams` coinciden con el patrón ya usado en `predicciones/page.tsx`. Las props de `AdminMatchRow` se preservan idénticas al archivo original. ✔
- **No cambia:** `group-matches.ts`, queries, scoring, `AdminMatchRow`. ✔
