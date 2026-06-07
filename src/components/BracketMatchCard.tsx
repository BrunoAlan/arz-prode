import Link from "next/link";
import { TeamLabel } from "@/components/TeamLabel";
import { LocalTime } from "@/components/LocalTime";

type TeamLite = { name: string; flag: string | null };

export type BracketCardData = {
  matchId: number | null;
  kickoffIso: string | null;
  home: TeamLite | null;
  away: TeamLite | null;
  homePlaceholder: string;
  awayPlaceholder: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
  pred: {
    homeScorePred: number;
    awayScorePred: number;
    points: number | null;
  } | null;
};

export type BracketRoundView = {
  key: string;
  title: string;
  cards: BracketCardData[];
};

function predColor(points: number | null): string {
  if (points === 3) return "text-primary";
  if (points === 0) return "text-destructive";
  return "text-muted-foreground";
}

function Row({
  team,
  placeholder,
  score,
  finished,
}: {
  team: TeamLite | null;
  placeholder: string;
  score: number | null;
  finished: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <TeamLabel team={team} placeholder={placeholder} className="min-w-0 truncate" />
      <span className="font-mono tabular-nums text-muted-foreground">
        {finished && score != null ? score : "–"}
      </span>
    </div>
  );
}

export function BracketMatchCard({ data }: { data: BracketCardData }) {
  const inner = (
    <div className="rounded-lg border bg-card px-3 py-2 transition-colors hover:border-foreground/30">
      {data.kickoffIso && (
        <div className="mb-1 text-[10px] text-muted-foreground">
          <LocalTime iso={data.kickoffIso} />
        </div>
      )}
      <Row
        team={data.home}
        placeholder={data.homePlaceholder}
        score={data.homeScore}
        finished={data.finished}
      />
      <Row
        team={data.away}
        placeholder={data.awayPlaceholder}
        score={data.awayScore}
        finished={data.finished}
      />
      {data.finished && data.pred && (
        <div
          className={`mt-1 font-mono text-[10px] tabular-nums ${predColor(
            data.pred.points,
          )}`}
        >
          vos: {data.pred.homeScorePred}:{data.pred.awayScorePred}
          {data.pred.points != null && (
            <span className="ml-1">(+{data.pred.points})</span>
          )}
        </div>
      )}
    </div>
  );

  if (data.matchId) {
    return (
      <Link href={`/partido/${data.matchId}`} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}
