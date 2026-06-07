"use client";

import { useState, useTransition } from "react";
import { confirmResult } from "@/lib/actions";
import { TeamLabel } from "@/components/TeamLabel";
import { LocalTime } from "@/components/LocalTime";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type TeamLite = { name: string; flag: string | null };

export function AdminMatchRow({
  matchId,
  kickoffIso,
  home,
  away,
  homePlaceholder,
  awayPlaceholder,
  initialHome,
  initialAway,
  finished,
}: {
  matchId: number;
  kickoffIso: string;
  home: TeamLite | null;
  away: TeamLite | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  initialHome: number | null;
  initialAway: number | null;
  finished: boolean;
}) {
  const [homeScore, setHomeScore] = useState(initialHome?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(initialAway?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await confirmResult(matchId, Number(homeScore || 0), Number(awayScore || 0));
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">
          <LocalTime iso={kickoffIso} />
        </div>
        <div className="truncate text-sm">
          <TeamLabel team={home} placeholder={homePlaceholder} />
          <span className="text-muted-foreground"> vs </span>
          <TeamLabel team={away} placeholder={awayPlaceholder} />
        </div>
      </div>
      <Input
        type="number"
        min={0}
        value={homeScore}
        disabled={pending}
        onChange={(e) => setHomeScore(e.target.value)}
        className="w-12 text-center font-mono tabular-nums"
      />
      <span className="text-muted-foreground">:</span>
      <Input
        type="number"
        min={0}
        value={awayScore}
        disabled={pending}
        onChange={(e) => setAwayScore(e.target.value)}
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
