"use client";

import { useState, useTransition } from "react";
import { savePrediction } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PredictionForm({
  matchId,
  initialHome,
  initialAway,
  disabled,
}: {
  matchId: number;
  initialHome: number | null;
  initialAway: number | null;
  disabled: boolean;
}) {
  const [home, setHome] = useState(initialHome?.toString() ?? "");
  const [away, setAway] = useState(initialAway?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        await savePrediction(matchId, Number(home || 0), Number(away || 0));
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number" min={0} max={99} value={home} disabled={disabled || pending}
        onChange={(e) => setHome(e.target.value)}
        className="w-12 text-center font-mono text-base tabular-nums"
      />
      <span className="text-muted-foreground">:</span>
      <Input
        type="number" min={0} max={99} value={away} disabled={disabled || pending}
        onChange={(e) => setAway(e.target.value)}
        className="w-12 text-center font-mono text-base tabular-nums"
      />
      {!disabled && (
        <Button
          onClick={submit}
          disabled={pending}
          size="sm"
          variant={saved ? "secondary" : "default"}
          className="min-w-[88px]"
        >
          {pending ? "Guardando…" : saved ? "Guardado ✓" : "Guardar"}
        </Button>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
