import { requireUser } from "@/lib/session";
import { getKnockoutMatches, getUserPredictions } from "@/lib/queries";
import { buildBracket, type BracketNode } from "@/lib/bracket";
import { Bracket } from "@/components/Bracket";
import { BracketTabs } from "@/components/BracketTabs";
import type {
  BracketCardData,
  BracketRoundView,
} from "@/components/BracketMatchCard";

const key = (home: string | null, away: string | null) =>
  `${home ?? ""}::${away ?? ""}`;

export default async function LlavesPage() {
  const user = await requireUser();
  const [knockout, preds] = await Promise.all([
    getKnockoutMatches(),
    getUserPredictions(user.id),
  ]);

  const matchByKey = new Map<string, (typeof knockout)[number]>();
  for (const m of knockout) {
    matchByKey.set(key(m.homePlaceholder, m.awayPlaceholder), m);
  }

  const bracket = buildBracket();

  function toCard(node: BracketNode): BracketCardData {
    const m = matchByKey.get(key(node.homePlaceholder, node.awayPlaceholder)) ?? null;
    const pred = m ? preds.get(m.id) ?? null : null;
    const advancingSide: "home" | "away" | null =
      m && m.advancingTeamId != null
        ? m.advancingTeamId === m.homeTeamId
          ? "home"
          : m.advancingTeamId === m.awayTeamId
            ? "away"
            : null
        : null;
    return {
      matchId: m?.id ?? null,
      kickoffIso: m ? m.kickoffAt.toISOString() : null,
      home: m?.home ?? null,
      away: m?.away ?? null,
      homePlaceholder: node.homePlaceholder,
      awayPlaceholder: node.awayPlaceholder,
      homeScore: m?.homeScore ?? null,
      awayScore: m?.awayScore ?? null,
      finished: m?.status === "finished",
      advancingSide,
      pred: pred
        ? {
            homeScorePred: pred.homeScorePred,
            awayScorePred: pred.awayScorePred,
            points: pred.points,
          }
        : null,
    };
  }

  const rounds: BracketRoundView[] = bracket.rounds.map((r) => ({
    key: r.key,
    title: r.title,
    cards: r.nodes.map(toCard),
  }));
  const thirdPlace = bracket.thirdPlace ? toCard(bracket.thirdPlace) : null;

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Llaves
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          El cuadro de eliminatorias. Los cruces se completan a medida que el admin
          carga resultados.
        </p>
      </header>
      <Bracket rounds={rounds} thirdPlace={thirdPlace} />
      <BracketTabs rounds={rounds} thirdPlace={thirdPlace} />
    </div>
  );
}
