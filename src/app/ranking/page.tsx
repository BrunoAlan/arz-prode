import { requireUser } from "@/lib/session";
import { getRanking } from "@/lib/queries";

export default async function RankingPage() {
  const me = await requireUser();
  const rows = await getRanking();
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Ranking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} jugadores · Mundial 2026
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          +3 marcador exacto · +2 diferencia · +1 resultado
        </p>
      </header>
      <ol className="divide-y">
        {rows.map((r) => {
          const isMe = r.id === me.id;
          const leader = r.position === 1;
          return (
            <li
              key={r.id}
              className={`animate-rise flex items-center gap-4 py-3 ${
                isMe ? "-mx-3 rounded-lg bg-accent/60 px-3" : ""
              }`}
              style={{ animationDelay: `${Math.min(r.position, 14) * 35}ms` }}
            >
              <span
                className={`w-8 text-right font-mono text-2xl tabular-nums ${
                  leader ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {r.position}
              </span>
              <span className="flex flex-1 items-center truncate font-medium tracking-tight">
                {leader && (
                  <span className="mr-2 inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                )}
                {r.name}
                {isMe && <span className="ml-2 text-xs text-muted-foreground">vos</span>}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {r.exactCount} exactos
              </span>
              <span className="w-12 text-right font-mono text-lg font-semibold tabular-nums">
                {r.totalPoints}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
