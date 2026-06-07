import { TeamLabel } from "@/components/TeamLabel";
import type { StandingRow } from "@/lib/standings";

const NUM = "py-1.5 text-right font-mono tabular-nums";

export function StandingsTable({
  label,
  rows,
}: {
  label: string;
  rows: StandingRow[];
}) {
  return (
    <section>
      <h2 className="mb-2 font-display text-lg font-semibold tracking-tight">
        Grupo {label}
      </h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th scope="col" className="py-1 text-left font-medium">Equipo</th>
            <th scope="col" className={`w-7 ${NUM} font-medium`}>PJ</th>
            <th scope="col" className={`w-7 ${NUM} font-medium`}>G</th>
            <th scope="col" className={`w-7 ${NUM} font-medium`}>E</th>
            <th scope="col" className={`w-7 ${NUM} font-medium`}>P</th>
            <th scope="col" className={`w-8 ${NUM} font-medium`}>GF</th>
            <th scope="col" className={`w-8 ${NUM} font-medium`}>GC</th>
            <th scope="col" className={`w-8 ${NUM} font-medium`}>DG</th>
            <th scope="col" className={`w-8 ${NUM} font-medium`}>Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.teamId} className={r.qualifies ? "bg-accent/50" : undefined}>
              <td className="py-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-4 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {r.position}
                  </span>
                  <TeamLabel team={{ name: r.name, flag: r.flag }} />
                </div>
              </td>
              <td className={NUM}>{r.played}</td>
              <td className={NUM}>{r.won}</td>
              <td className={NUM}>{r.drawn}</td>
              <td className={NUM}>{r.lost}</td>
              <td className={NUM}>{r.goalsFor}</td>
              <td className={NUM}>{r.goalsAgainst}</td>
              <td className={NUM}>
                {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
              </td>
              <td className={`${NUM} font-semibold`}>{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
