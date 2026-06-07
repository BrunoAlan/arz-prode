import { requireUser } from "@/lib/session";
import { getGroupStandings } from "@/lib/queries";
import { StandingsTable } from "@/components/StandingsTable";

export default async function PosicionesPage() {
  await requireUser();
  const groups = await getGroupStandings();
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Posiciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fase de grupos · Mundial 2026
        </p>
      </header>
      <div className="space-y-8">
        {groups.map((g) => (
          <StandingsTable key={g.label} label={g.label} rows={g.rows} />
        ))}
      </div>
    </div>
  );
}
