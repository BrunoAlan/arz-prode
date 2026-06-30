# Modal explicativo de puntaje (con empates)

**Fecha:** 2026-06-29

## Objetivo

Mostrar a cada jugador, la primera vez que entra a Predicciones, un modal que
explique cómo se puntúa el prode — con foco en cómo caen los empates y en que
los penales de eliminatoria no afectan el puntaje. El modal trae una casilla
"No volver a mostrar" para que el jugador lo silencie cuando ya lo leyó.

## Contexto

- El puntaje **no cambió**: `scorePrediction` (`src/lib/scoring.ts`) da
  **+3** marcador exacto, **+2** acierta resultado y diferencia de gol,
  **+1** acierta solo el resultado, **0** en otro caso.
- Lo nuevo es el avance por penales en eliminatorias: cuando una llave termina
  empatada, el admin marca `advancingTeamId`. Eso **solo resuelve el cuadro**
  (`resolveBracket` en `src/lib/bracket-advance.ts`); **no entra en el puntaje
  de las predicciones**. El jugador puntúa solo por el marcador.
- Por eso el modal es puramente informativo: comunica reglas existentes, no
  cambia ninguna lógica de scoring.

## Decisiones (acordadas)

- **Persistencia:** `localStorage` (por navegador). Sin tocar DB ni server
  actions.
- **Contenido:** puntaje completo (+3/+2/+1/0) con foco en empates y penales.
- **Dónde aparece:** solo en `/predicciones`.
- **Al cerrar:** si **no** tilda la casilla, reaparece la próxima visita; solo
  deja de mostrarse si marca "No volver a mostrar".

## Arquitectura

### 1. `src/lib/scoring-info.ts` (nuevo, puro y testeable)

```ts
export const SCORING_INFO_KEY = "prode:scoringInfo:v1";

/** true salvo que el usuario haya marcado "no volver a mostrar" ("1"). */
export function shouldShowScoringInfo(stored: string | null): boolean {
  return stored !== "1";
}
```

- **Key versionada** (`:v1`): si en el futuro cambian las reglas, se sube a
  `:v2` y el aviso reaparece para todos sin lógica extra.

### 2. `src/components/ScoringInfoDialog.tsx` (nuevo, `"use client"`)

- Usa `@base-ui/react/dialog` (Root / Portal / Backdrop / Popup / Title /
  Description / Close), `@base-ui/react/checkbox` para el tilde, y
  `@/components/ui/button` para el CTA.
- **Estado:** `open` (arranca `false`), `dontShowAgain` (arranca `false`).
- **Montaje:** arranca cerrado para evitar mismatch de hidratación SSR. En un
  `useEffect` (solo cliente) lee `localStorage.getItem(SCORING_INFO_KEY)` dentro
  de try/catch; si `shouldShowScoringInfo(stored)` es `true`, hace
  `setOpen(true)`.
- **Al cerrar** (close button, backdrop, Esc o "Entendido"): si `dontShowAgain`,
  hace `localStorage.setItem(SCORING_INFO_KEY, "1")` dentro de try/catch. Si no,
  no persiste nada.
- **Robustez:** si `localStorage` tira (modo privado / deshabilitado), la
  lectura cae a "mostrar" y la escritura se ignora en silencio.

### 3. `src/app/predicciones/page.tsx` (modificado)

- Renderiza `<ScoringInfoDialog />` una vez cerca del top del JSX. El componente
  se autogestiona (gate por `localStorage`), así que es seguro renderizarlo
  siempre.

## Contenido del modal

**Título:** Cómo se puntúa

- **+3 — Marcador exacto.** Pronosticaste 2-1 y salió 2-1.
- **+2 — Resultado y diferencia.** Acertás quién gana (o el empate) y por
  cuántos goles. Ej: pusiste 2-1 y salió 3-2.
- **+1 — Solo el resultado.** Acertás quién gana (o el empate) pero con otra
  diferencia. Ej: 2-0 y salió 1-0.
- **0 —** Erraste el resultado.

**Empates:** un empate no tiene diferencia de gol, así que cualquier empate que
aciertes suma mínimo +2 (y +3 si clavás el marcador). Ej: pusiste 1-1 y salió
2-2 → +2.

**Penales (eliminatorias):** si una llave se define por penales, eso solo decide
quién avanza en el cuadro. **No suma ni resta puntos** — tu predicción puntúa
solo por el marcador de los 90/120 minutos.

Pie: casilla "No volver a mostrar este aviso" + botón "Entendido".

## Mockup

```
┌────────────────────────────────────────┐
│  Cómo se puntúa                      ✕  │
├────────────────────────────────────────┤
│  +3  Marcador exacto                    │
│  +2  Resultado y diferencia             │
│  +1  Solo el resultado                  │
│   0  Erraste el resultado               │
│                                         │
│  Empates: …                             │
│  Penales (eliminatorias): …             │
├────────────────────────────────────────┤
│  ☐ No volver a mostrar    [ Entendido ] │
└────────────────────────────────────────┘
```

## Estilo

- Seguir tokens del tema (`bg-background`, `text-foreground`,
  `text-muted-foreground`, `border`, `primary`) como el resto de la UI.
- Backdrop semitransparente con blur suave, Popup centrado tipo card, ancho
  máximo acotado (legible en mobile, que es el uso principal).

## Testing

- `src/lib/scoring-info.test.ts`: cubre `shouldShowScoringInfo` para
  `null`, `""` y `"1"` (esperando `true`, `true`, `false`).
- El componente queda fino (solo wiring de UI + efecto de `localStorage`); no se
  testea con harness de browser en esta entrega.

## Fuera de alcance (YAGNI)

- Botón/ícono para reabrir el aviso a demanda.
- Wrapper genérico `ui/dialog.tsx`.
- Persistencia por usuario en la DB.

## Notas de implementación

- `AGENTS.md`: este Next.js puede diferir de lo conocido. Antes de codear,
  revisar el patrón de montar un client component dentro de un server component
  page en `node_modules/next/dist/docs/` si surge alguna duda de convención.
- Verificar la API exacta de `@base-ui/react/dialog` y `@base-ui/react/checkbox`
  (nombres de partes/props) leyendo sus typings en `node_modules` antes de
  escribir el componente.
```
