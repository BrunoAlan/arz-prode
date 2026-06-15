import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { getMatchesOrdered } from "@/lib/queries";
import { groupMatches, groupMatchesByDay } from "@/lib/group-matches";
import { AdminMatchRow } from "@/components/AdminMatchRow";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireAdmin();
  const { orden } = await searchParams;
  const byDate = orden === "fecha";
  const allMatches = await getMatchesOrdered();
  const sections = byDate
    ? groupMatchesByDay(allMatches)
    : groupMatches(allMatches);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Admin · Resultados
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cargá el marcador final; al confirmar se recalculan puntos y ranking.
        </p>
        <div
          role="group"
          aria-label="Ordenar partidos"
          className="mt-4 inline-flex gap-1 rounded-full border p-1 text-xs"
        >
          <Link
            href="/admin"
            aria-current={!byDate ? "page" : undefined}
            className={`rounded-full px-3 py-1 transition-colors ${
              byDate
                ? "text-muted-foreground hover:text-foreground"
                : "bg-foreground text-background"
            }`}
          >
            Por grupo
          </Link>
          <Link
            href="/admin?orden=fecha"
            aria-current={byDate ? "page" : undefined}
            className={`rounded-full px-3 py-1 transition-colors ${
              byDate
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Por fecha
          </Link>
        </div>
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

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key} id={section.key} className="scroll-mt-28">
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
