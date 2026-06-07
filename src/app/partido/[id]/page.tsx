import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getMatchById, getPredictionsForMatch } from "@/lib/queries";
import { isLocked } from "@/lib/match-rules";
import { formatKickoff } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

export default async function PartidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const match = await getMatchById(Number(id));
  if (!match) notFound();

  const locked = isLocked(match, new Date());
  const home = match.home?.name ?? match.homePlaceholder ?? "?";
  const away = match.away?.name ?? match.awayPlaceholder ?? "?";
  const preds = locked ? await getPredictionsForMatch(match.id) : [];

  return (
    <div className="animate-rise">
      <div className="text-sm text-muted-foreground">{formatKickoff(match.kickoffAt)}</div>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {home} <span className="text-muted-foreground">vs</span> {away}
        </h1>
        {match.status === "finished" && (
          <span className="font-mono text-3xl font-semibold tabular-nums">
            {match.homeScore}:{match.awayScore}
          </span>
        )}
      </div>

      <h2 className="mt-8 mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pronósticos
      </h2>
      {!locked ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Los pronósticos se revelan cuando empieza el partido.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y rounded-lg border">
          {preds.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="font-medium">{p.userName}</span>
              <span className="flex items-center gap-3">
                <span className="font-mono tabular-nums">
                  {p.homeScorePred}:{p.awayScorePred}
                </span>
                {p.points != null && (
                  <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                    +{p.points}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
