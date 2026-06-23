"use client";

import { useState, useTransition } from "react";
import { assignThird } from "@/lib/actions";
import type { RankedThird } from "@/lib/bracket-advance";
import type { ThirdSlot } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";

export function ThirdPlacePanel({
  allComplete,
  ranking,
  slots,
}: {
  allComplete: boolean;
  ranking: RankedThird[];
  slots: ThirdSlot[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!allComplete) {
    return (
      <p className="text-sm text-muted-foreground">
        El panel de terceros se habilita cuando terminen los 12 grupos.
      </p>
    );
  }

  function assign(matchId: number, teamId: number) {
    setError(null);
    startTransition(async () => {
      try {
        await assignThird(matchId, teamId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al asignar");
      }
    });
  }

  const qualified = ranking.filter((r) => r.qualifies);

  return (
    <Card>
      <CardContent className="space-y-4 px-4 py-4">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Mejores terceros
          </h3>
          <ol className="space-y-1 text-sm">
            {ranking.map((r) => (
              <li
                key={r.teamId}
                className={r.qualifies ? "" : "text-muted-foreground line-through"}
              >
                {r.rank}. {r.name} (Grupo {r.group}) · {r.points} pts · DG {r.goalDiff}
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Asignar a cada cruce
          </h3>
          {slots.map((slot) => {
            const options = qualified.filter((r) =>
              slot.allowedGroups.includes(r.group),
            );
            return (
              <div key={slot.matchId} className="flex items-center gap-2 text-sm">
                <span className="w-40 font-mono text-xs text-muted-foreground">
                  {slot.placeholder}
                </span>
                <select
                  className="rounded border bg-background px-2 py-1 text-sm"
                  disabled={pending}
                  value={slot.assignedTeamId ?? ""}
                  onChange={(e) =>
                    e.target.value && assign(slot.matchId, Number(e.target.value))
                  }
                >
                  <option value="">— elegir —</option>
                  {options.map((o) => (
                    <option key={o.teamId} value={o.teamId}>
                      {o.name} (Grupo {o.group})
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
