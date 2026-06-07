"use client";

import { useState, useTransition } from "react";
import { confirmResult } from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AdminMatchRow({
  matchId,
  label,
  initialHome,
  initialAway,
  finished,
}: {
  matchId: number;
  label: string;
  initialHome: number | null;
  initialAway: number | null;
  finished: boolean;
}) {
  const [home, setHome] = useState(initialHome?.toString() ?? "");
  const [away, setAway] = useState(initialAway?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await confirmResult(matchId, Number(home || 0), Number(away || 0));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
      <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
      <Input
        type="number" min={0} value={home} onChange={(e) => setHome(e.target.value)}
        className="w-12 text-center font-mono tabular-nums"
      />
      <span className="text-muted-foreground">:</span>
      <Input
        type="number" min={0} value={away} onChange={(e) => setAway(e.target.value)}
        className="w-12 text-center font-mono tabular-nums"
      />
      <Button
        onClick={submit}
        disabled={pending}
        size="sm"
        variant={finished ? "secondary" : "default"}
      >
        {pending ? "…" : finished ? "Actualizar" : "Confirmar"}
      </Button>
    </div>
  );
}
