import { requireAdmin } from "@/lib/session";
import { getMatchesOrdered } from "@/lib/queries";
import { formatKickoff } from "@/lib/format";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  await requireAdmin();
  const allMatches = await getMatchesOrdered();
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
      <Card>
        <CardContent className="px-4 py-1">
          {allMatches.map((m) => {
            const home = m.home?.name ?? m.homePlaceholder ?? "?";
            const away = m.away?.name ?? m.awayPlaceholder ?? "?";
            return (
              <AdminMatchRow
                key={m.id}
                matchId={m.id}
                label={`${formatKickoff(m.kickoffAt)} · ${home} vs ${away}`}
                initialHome={m.homeScore}
                initialAway={m.awayScore}
                finished={m.status === "finished"}
              />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
