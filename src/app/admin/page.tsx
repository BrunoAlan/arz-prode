import { requireAdmin } from "@/lib/session";
import { getMatchesOrdered } from "@/lib/queries";
import { groupMatches } from "@/lib/group-matches";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  await requireAdmin();
  const allMatches = await getMatchesOrdered();
  const sections = groupMatches(allMatches);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Admin · Resultados
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá el marcador final; al confirmar se recalculan puntos y ranking.
        </p>
      </header>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </h2>
            <Card>
              <CardContent className="px-4 py-1">
                {section.matches.map((m) => (
                  <AdminMatchRow
                    key={m.id}
                    matchId={m.id}
                    kickoffIso={m.kickoffAt.toISOString()}
                    home={m.home}
                    away={m.away}
                    homePlaceholder={m.homePlaceholder}
                    awayPlaceholder={m.awayPlaceholder}
                    initialHome={m.homeScore}
                    initialAway={m.awayScore}
                    finished={m.status === "finished"}
                  />
                ))}
              </CardContent>
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
