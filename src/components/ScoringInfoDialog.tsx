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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
                aria-label="No volver a mostrar"
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
