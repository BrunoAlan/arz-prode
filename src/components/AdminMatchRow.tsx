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
  stage,
  home,
  away,
  homeTeamId,
  awayTeamId,
  homePlaceholder,
  awayPlaceholder,
  initialHome,
  initialAway,
  initialAdvancingTeamId,
  finished,
}: {
  matchId: number;
  kickoffIso: string;
  stage: string;
  home: TeamLite | null;
  away: TeamLite | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  initialHome: number | null;
  initialAway: number | null;
  initialAdvancingTeamId: number | null;
  finished: boolean;
}) {
  const [homeScore, setHomeScore] = useState(initialHome?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(initialAway?.toString() ?? "");
  const [advancingTeamId, setAdvancingTeamId] = useState<number | null>(
    initialAdvancingTeamId,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isKnockout = stage !== "group";
  const bothFilled = homeScore !== "" && awayScore !== "";
  const isDraw = bothFilled && Number(homeScore) === Number(awayScore);
  const showAdvancer =
    isKnockout && isDraw && homeTeamId != null && awayTeamId != null;

  function submit() {
    setError(null);
    if (showAdvancer && advancingTeamId == null) {
      setError("Elegí qué equipo avanza por penales");
      return;
    }
    startTransition(async () => {
      try {
        await confirmResult(
          matchId,
          Number(homeScore || 0),
          Number(awayScore || 0),
          showAdvancer ? advancingTeamId : null,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al guardar");
      }
    });
  }

  return (
    <div className="border-b py-2 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
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

        {showAdvancer && (
          <div className="flex w-full flex-wrap items-center gap-4 pl-1 text-xs">
            <span className="text-muted-foreground">Avanza por penales:</span>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`adv-${matchId}`}
                checked={advancingTeamId === homeTeamId}
                onChange={() => setAdvancingTeamId(homeTeamId)}
                disabled={pending}
              />
              {home?.name ?? "Local"}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`adv-${matchId}`}
                checked={advancingTeamId === awayTeamId}
                onChange={() => setAdvancingTeamId(awayTeamId)}
                disabled={pending}
              />
              {away?.name ?? "Visitante"}
            </label>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
