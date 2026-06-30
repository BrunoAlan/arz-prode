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
  advancingTeamId?: number | null;
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
    const t = teamOf.get(src.id);
    if (!t || t.home == null || t.away == null) return null;
    let winner: number;
    let loser: number;
    if (src.homeScore === src.awayScore) {
      // Empate: lo define el equipo que el admin marcó como avanzando (penales).
      if (src.advancingTeamId == null) return null; // sin definición => no resoluble.
      if (src.advancingTeamId !== t.home && src.advancingTeamId !== t.away) {
        return null; // definición inconsistente con los equipos del partido.
      }
      winner = src.advancingTeamId;
      loser = src.advancingTeamId === t.home ? t.away : t.home;
    } else {
      const homeWon = src.homeScore > src.awayScore;
      winner = homeWon ? t.home : t.away;
      loser = homeWon ? t.away : t.home;
    }
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

export type ThirdPlaceInput = {
  group: string;
  teamId: number;
  name: string;
  flag: string | null;
  points: number;
  goalDiff: number;
  goalsFor: number;
};

export type RankedThird = ThirdPlaceInput & { rank: number; qualifies: boolean };

export function rankThirdPlaces(thirds: ThirdPlaceInput[]): RankedThird[] {
  const sorted = [...thirds].sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      a.group.localeCompare(b.group),
  );
  return sorted.map((x, i) => ({ ...x, rank: i + 1, qualifies: i < 8 }));
}

export type KnockoutResultValidation =
  | { ok: true; advancingTeamId: number | null }
  | { ok: false; error: string };

/**
 * Valida el resultado de una eliminatoria y normaliza el equipo que avanza.
 * - Grupo o no-empate: avance => null.
 * - Eliminatoria + empate: exige advancingTeamId y que sea uno de los dos equipos.
 */
export function validateKnockoutResult(args: {
  stage: string;
  homeScore: number;
  awayScore: number;
  advancingTeamId: number | null | undefined;
  homeTeamId: number | null;
  awayTeamId: number | null;
}): KnockoutResultValidation {
  const { stage, homeScore, awayScore, advancingTeamId, homeTeamId, awayTeamId } = args;
  const isDraw = homeScore === awayScore;

  if (stage === "group" || !isDraw) {
    return { ok: true, advancingTeamId: null };
  }
  if (homeTeamId == null || awayTeamId == null) {
    return { ok: false, error: "Asigná los equipos antes de cargar un empate en eliminatorias." };
  }
  if (advancingTeamId == null) {
    return { ok: false, error: "Definí qué equipo avanza por penales." };
  }
  if (advancingTeamId !== homeTeamId && advancingTeamId !== awayTeamId) {
    return { ok: false, error: "El equipo que avanza debe ser uno de los dos del partido." };
  }
  return { ok: true, advancingTeamId };
}
