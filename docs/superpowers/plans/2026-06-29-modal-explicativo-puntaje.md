# Modal explicativo de puntaje Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar a cada jugador, la primera vez que entra a `/predicciones`, un modal que explica cómo se puntúa (incluyendo empates y penales), con una casilla "No volver a mostrar".

**Architecture:** Un helper puro (`scoring-info.ts`) decide si mostrar el aviso según un valor de `localStorage`. Un client component (`ScoringInfoDialog.tsx`) usa `@base-ui/react/dialog` + `@base-ui/react/checkbox`, se autogestiona vía `localStorage`, y se monta una vez en la página server-side de predicciones.

**Tech Stack:** Next.js 16, React 19, `@base-ui/react` (Dialog + Checkbox), `lucide-react`, Tailwind v4, vitest.

## Global Constraints

- **Persistencia:** solo `localStorage`, key `prode:scoringInfo:v1`. No tocar DB ni server actions.
- **Reglas de puntaje (verbatim, ya existentes en `src/lib/scoring.ts`):** +3 marcador exacto, +2 acierta resultado y diferencia, +1 acierta solo el resultado, 0 en otro caso. El modal **describe** estas reglas; no las modifica.
- **Penales:** el avance por penales solo resuelve el cuadro de llaves; **no** afecta el puntaje de predicciones. El copy debe dejarlo explícito.
- **Convenciones del repo:** helpers puros con su `*.test.ts` (vitest); componentes con `cn` de `@/lib/utils`; tokens de tema (`bg-background`, `text-muted-foreground`, `border`, `primary`); íconos de `lucide-react`. No hay test runner de componentes (sin jsdom/testing-library): la UI se verifica con `tsc`, `eslint` y chequeo manual.
- **`AGENTS.md`:** este Next.js puede diferir de lo conocido; ante dudas de convención (montar client component en server page) revisar `node_modules/next/dist/docs/`.

---

### Task 1: Helper puro `scoring-info`

**Files:**
- Create: `src/lib/scoring-info.ts`
- Test: `src/lib/scoring-info.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `SCORING_INFO_KEY: string` — `"prode:scoringInfo:v1"`.
  - `shouldShowScoringInfo(stored: string | null): boolean` — `true` salvo que `stored === "1"`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/scoring-info.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SCORING_INFO_KEY, shouldShowScoringInfo } from "./scoring-info";

describe("scoring-info", () => {
  it("la key está versionada", () => {
    expect(SCORING_INFO_KEY).toBe("prode:scoringInfo:v1");
  });
  it("muestra cuando no hay nada guardado (null)", () => {
    expect(shouldShowScoringInfo(null)).toBe(true);
  });
  it("muestra cuando el valor guardado está vacío", () => {
    expect(shouldShowScoringInfo("")).toBe(true);
  });
  it("muestra cuando hay cualquier otro valor", () => {
    expect(shouldShowScoringInfo("0")).toBe(true);
  });
  it("no muestra cuando el usuario marcó no volver a mostrar (\"1\")", () => {
    expect(shouldShowScoringInfo("1")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/scoring-info.test.ts`
Expected: FAIL — no se puede resolver el módulo `./scoring-info`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/scoring-info.ts`:

```ts
export const SCORING_INFO_KEY = "prode:scoringInfo:v1";

/** true salvo que el usuario haya marcado "no volver a mostrar" ("1"). */
export function shouldShowScoringInfo(stored: string | null): boolean {
  return stored !== "1";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/scoring-info.test.ts`
Expected: PASS — 5 tests verdes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring-info.ts src/lib/scoring-info.test.ts
git commit -m "feat: helper scoring-info para gatear el aviso de puntaje"
```

---

### Task 2: Componente `ScoringInfoDialog`

**Files:**
- Create: `src/components/ScoringInfoDialog.tsx`

**Interfaces:**
- Consumes: `SCORING_INFO_KEY`, `shouldShowScoringInfo` de `@/lib/scoring-info`; `Button` de `@/components/ui/button`.
- Produces: `ScoringInfoDialog` — componente sin props (export nombrado). Se autogestiona vía `localStorage`; seguro de renderizar siempre.

**Notas de API base-ui (verificadas en `node_modules`):**
- `import { Dialog } from "@base-ui/react/dialog"` (namespace: `Dialog.Root/Portal/Backdrop/Popup/Title/Description/Close`).
- `import { Checkbox } from "@base-ui/react/checkbox"` (`Checkbox.Root/Indicator`).
- `Dialog.Root` controlado: props `open` y `onOpenChange(open: boolean, details)`.
- `Checkbox.Root` controlado: `checked` y `onCheckedChange(checked: boolean, details)`; estado marcado expone `data-checked`.
- `Dialog.Close` acepta `render` para usar un elemento propio como botón de cierre.

- [ ] **Step 1: Write the component**

Create `src/components/ScoringInfoDialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Checkbox } from "@base-ui/react/checkbox";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCORING_INFO_KEY, shouldShowScoringInfo } from "@/lib/scoring-info";

export function ScoringInfoDialog() {
  // Arranca cerrado para no romper la hidratación; se abre en el efecto (solo cliente).
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    try {
      if (shouldShowScoringInfo(localStorage.getItem(SCORING_INFO_KEY))) {
        setOpen(true);
      }
    } catch {
      // localStorage no disponible (modo privado, etc.): mostramos igual.
      setOpen(true);
    }
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && dontShowAgain) {
      try {
        localStorage.setItem(SCORING_INFO_KEY, "1");
      } catch {
        // Si no se puede persistir, el aviso simplemente reaparecerá.
      }
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-5 shadow-lg outline-none">
          <div className="mb-3 flex items-center justify-between gap-4">
            <Dialog.Title className="font-display text-lg font-semibold tracking-tight">
              Cómo se puntúa
            </Dialog.Title>
            <Dialog.Close
              render={
                <button
                  aria-label="Cerrar"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              }
            />
          </div>

          <Dialog.Description className="sr-only">
            Reglas de puntaje del prode, incluyendo empates y penales.
          </Dialog.Description>

          <ul className="space-y-1.5 text-sm">
            <li>
              <span className="font-semibold text-primary">+3</span> Marcador
              exacto. Pronosticaste 2-1 y salió 2-1.
            </li>
            <li>
              <span className="font-semibold text-primary">+2</span> Resultado y
              diferencia. Acertás quién gana (o el empate) y por cuántos goles.
              Ej: 2-1 y salió 3-2.
            </li>
            <li>
              <span className="font-semibold text-primary">+1</span> Solo el
              resultado. Acertás quién gana (o el empate) con otra diferencia.
              Ej: 2-0 y salió 1-0.
            </li>
            <li>
              <span className="font-semibold text-muted-foreground">0</span>{" "}
              Erraste el resultado.
            </li>
          </ul>

          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Empates:</span> un
            empate no tiene diferencia de gol, así que cualquier empate que
            aciertes suma mínimo +2 (y +3 si clavás el marcador). Ej: 1-1 y
            salió 2-2 → +2.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Penales (eliminatorias):
            </span>{" "}
            si una llave se define por penales, eso solo decide quién avanza en
            el cuadro. No suma ni resta puntos: tu predicción puntúa solo por el
            marcador de los 90/120 minutos.
          </p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
              <Checkbox.Root
                checked={dontShowAgain}
                onCheckedChange={setDontShowAgain}
                className="flex size-4 items-center justify-center rounded border border-input bg-background text-primary-foreground data-[checked]:border-primary data-[checked]:bg-primary"
              >
                <Checkbox.Indicator>
                  <Check className="size-3" />
                </Checkbox.Indicator>
              </Checkbox.Root>
              No volver a mostrar
            </label>
            <Dialog.Close render={<Button>Entendido</Button>} />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores. (Si `tsc` se queja del `render` de `Dialog.Close`, ver que el elemento provisto sea un único elemento `button`/Button — ya lo es.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: sin errores ni warnings nuevos en `ScoringInfoDialog.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ScoringInfoDialog.tsx
git commit -m "feat: componente ScoringInfoDialog con copy de puntaje y empates"
```

---

### Task 3: Montar el modal en Predicciones

**Files:**
- Modify: `src/app/predicciones/page.tsx` (import + render dentro del JSX raíz)

**Interfaces:**
- Consumes: `ScoringInfoDialog` de `@/components/ScoringInfoDialog`.
- Produces: nada nuevo; integra el modal en la página.

- [ ] **Step 1: Agregar el import**

En `src/app/predicciones/page.tsx`, junto a los otros imports de `@/components/...`, agregar:

```tsx
import { ScoringInfoDialog } from "@/components/ScoringInfoDialog";
```

- [ ] **Step 2: Renderizar el componente**

En el JSX, justo después de la apertura del `<div>` raíz del `return` (antes del `<header>`), agregar:

```tsx
      <ScoringInfoDialog />
```

Queda así el arranque del return:

```tsx
  return (
    <div>
      <ScoringInfoDialog />
      <header className="mb-6">
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Verificar la suite completa sigue verde**

Run: `npm test`
Expected: PASS — toda la suite, incluida `scoring-info.test.ts`.

- [ ] **Step 5: Verificación manual**

Run: `npm run dev`, abrir `/predicciones` logueado.
Esperado:
1. En la primera visita aparece el modal "Cómo se puntúa".
2. Cerrar sin tildar (Esc / X / backdrop / "Entendido") → al recargar, vuelve a aparecer.
3. Tildar "No volver a mostrar" y cerrar → al recargar, ya no aparece.
4. En DevTools → Application → Local Storage existe `prode:scoringInfo:v1 = "1"` tras tildar.
5. Borrar esa key → vuelve a aparecer.

- [ ] **Step 6: Commit**

```bash
git add src/app/predicciones/page.tsx
git commit -m "feat: mostrar el aviso de puntaje al entrar a predicciones"
```

---

## Notas de cierre

- Al terminar las 3 tasks, la rama `feat/modal-explicativo-puntaje` queda lista para merge local a `main` (preferencia: branch en el lugar, merge local, **confirmar antes de pushear**).
- Si en el futuro cambian las reglas de puntaje, subir `SCORING_INFO_KEY` a `:v2` reabre el aviso para todos.
