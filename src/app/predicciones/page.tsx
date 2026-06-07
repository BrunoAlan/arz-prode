import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMatchesOrdered, getUserPredictions } from "@/lib/queries";
import { isMatchPredictable, isLocked } from "@/lib/match-rules";
import { formatKickoff } from "@/lib/format";
import { PredictionForm } from "@/components/PredictionForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PrediccionesPage() {
  const user = await requireUser();
  const [allMatches, preds] = await Promise.all([
    getMatchesOrdered(),
    getUserPredictions(user.id),
  ]);
  const now = new Date();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Predicciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá el marcador exacto. Cada partido se cierra al arrancar.
        </p>
      </header>
      <ul className="space-y-2">
        {allMatches.map((m, i) => {
          const p = preds.get(m.id);
          const predictable = isMatchPredictable(m, now);
          const locked = isLocked(m, now);
          const home = m.home?.name ?? m.homePlaceholder ?? "?";
          const away = m.away?.name ?? m.awayPlaceholder ?? "?";
          return (
            <li
              key={m.id}
              className="animate-rise"
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
            >
              <Card className="transition-colors hover:border-foreground/20">
                <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatKickoff(m.kickoffAt)}</span>
                      {m.venue && <span className="truncate">· {m.venue}</span>}
                      {m.status === "finished" ? (
                        <Badge variant="secondary" className="font-mono tabular-nums">
                          {m.homeScore}:{m.awayScore}
                        </Badge>
                      ) : locked ? (
                        <Badge variant="outline">cerrado</Badge>
                      ) : null}
                    </div>
                    <Link
                      href={`/partido/${m.id}`}
                      className="font-medium tracking-tight hover:underline"
                    >
                      {home} <span className="text-muted-foreground">vs</span> {away}
                    </Link>
                    {m.status === "finished" && p?.points != null && (
                      <span className="ml-2 font-mono text-xs font-semibold tabular-nums text-primary">
                        +{p.points}
                      </span>
                    )}
                  </div>
                  <PredictionForm
                    matchId={m.id}
                    initialHome={p?.homeScorePred ?? null}
                    initialAway={p?.awayScorePred ?? null}
                    disabled={!predictable}
                  />
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
