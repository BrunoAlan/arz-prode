import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMatchesOrdered, getUserPredictions } from "@/lib/queries";
import { isMatchPredictable, isLocked } from "@/lib/match-rules";
import { groupMatches } from "@/lib/group-matches";
import { PredictionForm } from "@/components/PredictionForm";
import { TeamLabel } from "@/components/TeamLabel";
import { LocalTime } from "@/components/LocalTime";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PrediccionesPage() {
  const user = await requireUser();
  const [allMatches, preds] = await Promise.all([
    getMatchesOrdered(),
    getUserPredictions(user.id),
  ]);
  const now = new Date();
  const sections = groupMatches(allMatches);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Predicciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá el marcador exacto. Cada partido se cierra al arrancar.
        </p>
      </header>

      <nav className="sticky top-14 z-10 -mx-4 mb-6 flex gap-1.5 overflow-x-auto border-b bg-background/80 px-4 py-2 backdrop-blur">
        {sections.map((s) => (
          <a
            key={s.key}
            href={`#${s.key}`}
            className="whitespace-nowrap rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            {s.title}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.key} id={section.key} className="scroll-mt-28">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h2>
            <ul className="space-y-2">
              {section.matches.map((m, i) => {
                const p = preds.get(m.id);
                const predictable = isMatchPredictable(m, now);
                const locked = isLocked(m, now);
                return (
                  <li
                    key={m.id}
                    className="animate-rise"
                    style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                  >
                    <Card className="transition-colors hover:border-foreground/20">
                      <CardContent className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <LocalTime iso={m.kickoffAt.toISOString()} />
                            {m.venue && <span className="truncate">· {m.venue}</span>}
                            {m.status === "finished" ? (
                              <Badge
                                variant="secondary"
                                className="font-mono tabular-nums"
                              >
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
                            <TeamLabel team={m.home} placeholder={m.homePlaceholder} />{" "}
                            <span className="text-muted-foreground">vs</span>{" "}
                            <TeamLabel team={m.away} placeholder={m.awayPlaceholder} />
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
          </section>
        ))}
      </div>
    </div>
  );
}
