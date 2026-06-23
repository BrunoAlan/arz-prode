import { buildBracket } from "@/lib/bracket";

export type KnockoutMatchInput = {
  id: number;
  stage: string;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
};

export type ResolveInput = {
  knockout: KnockoutMatchInput[];
  // Por grupo COMPLETO: teamIds en orden de posición (idx0 = 1°, idx1 = 2°, idx2 = 3°...).
  groupOrder: Map<string, number[]>;
};

export type ResolvedSlot = {
  matchId: number;
  side: "home" | "away";
  teamId: number;
};

// Orden de procesamiento: cada ronda depende de la anterior.
const ROUND_SEQUENCE = [
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
];

// "1F" / "2C" => posición de grupo. "3 A/B/C/D/F" no matchea (es tercero, manual).
const GROUP_POS = /^([12])([A-L])$/;

const key = (home: string | null, away: string | null) =>
  `${home ?? ""}::${away ?? ""}`;

export function resolveBracket(input: ResolveInput): ResolvedSlot[] {
  const { rounds, thirdPlace } = buildBracket();
  const nodes = [
    ...rounds.flatMap((r) => r.nodes),
    ...(thirdPlace ? [thirdPlace] : []),
  ];

  // matchNumber del cuadro -> partido de la DB, vía placeholder-key.
  const dbByKey = new Map<string, KnockoutMatchInput>();
  for (const m of input.knockout) {
    dbByKey.set(key(m.homePlaceholder, m.awayPlaceholder), m);
  }
  const numberToDb = new Map<number, KnockoutMatchInput>();
  for (const n of nodes) {
    const m = dbByKey.get(key(n.homePlaceholder, n.awayPlaceholder));
    if (m) numberToDb.set(n.matchNumber, m);
  }

  // Overlay de equipos por matchId: arranca del estado DB y se actualiza al resolver,
  // para que el ganador de una ronda recién resuelta sea visible río abajo.
  const teamOf = new Map<number, { home: number | null; away: number | null }>();
  for (const m of input.knockout) {
    teamOf.set(m.id, { home: m.homeTeamId, away: m.awayTeamId });
  }

  // Agrupar nodos por etapa una sola vez (en vez de filtrar por cada ronda).
  const nodesByStage = new Map<string, typeof nodes>();
  for (const n of nodes) {
    const arr = nodesByStage.get(n.stage);
    if (arr) arr.push(n);
    else nodesByStage.set(n.stage, [n]);
  }

  const out: ResolvedSlot[] = [];
  const emit = (matchId: number, side: "home" | "away", teamId: number) => {
    const cur = teamOf.get(matchId);
    if (!cur) return;
    out.push({ matchId, side, teamId });
    teamOf.set(
      matchId,
      side === "home" ? { ...cur, home: teamId } : { ...cur, away: teamId },
    );
  };

  // Ganador / perdedor de un partido fuente (por número de cuadro).
  const outcome = (from: number, want: "winner" | "loser"): number | null => {
    const src = numberToDb.get(from);
    if (!src || !src.finished) return null;
    if (src.homeScore == null || src.awayScore == null) return null;
    if (src.homeScore === src.awayScore) return null; // empate: no resoluble.
    const t = teamOf.get(src.id);
    if (!t || t.home == null || t.away == null) return null;
    const homeWon = src.homeScore > src.awayScore;
    const winner = homeWon ? t.home : t.away;
    const loser = homeWon ? t.away : t.home;
    return want === "winner" ? winner : loser;
  };

  for (const stage of ROUND_SEQUENCE) {
    for (const node of nodesByStage.get(stage) ?? []) {
      const m = numberToDb.get(node.matchNumber);
      if (!m) continue;
      for (const side of ["home", "away"] as const) {
        const slot = side === "home" ? node.home : node.away;
        if (slot.kind === "group") {
          const mm = GROUP_POS.exec(slot.label);
          if (!mm) continue; // "3 ..." => manual, se omite.
          const pos = Number(mm[1]);
          const order = input.groupOrder.get(mm[2]);
          if (!order || order.length < pos) continue;
          emit(m.id, side, order[pos - 1]);
        } else if (slot.kind === "winner") {
          const t = outcome(slot.from, "winner");
          if (t != null) emit(m.id, side, t);
        } else if (slot.kind === "loser") {
          const t = outcome(slot.from, "loser");
          if (t != null) emit(m.id, side, t);
        }
      }
    }
  }

  return out;
}
