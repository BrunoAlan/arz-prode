import { SEED_MATCHES } from "@/db/fixture-data";

export type BracketSlot =
  | { kind: "group"; label: string }
  | { kind: "winner"; from: number }
  | { kind: "loser"; from: number };

export type BracketNode = {
  matchNumber: number;
  stage: string;
  homePlaceholder: string;
  awayPlaceholder: string;
  home: BracketSlot;
  away: BracketSlot;
  feeders: number[]; // matchNumbers que alimentan este nodo (0 o 2)
};

export type BracketRound = {
  stage: string;
  key: string;
  title: string;
  nodes: BracketNode[]; // en orden vertical de display
};

export type Bracket = {
  rounds: BracketRound[]; // round_of_32 → final (sin tercer puesto)
  thirdPlace: BracketNode | null;
};

const ROUND_META: { stage: string; key: string; title: string }[] = [
  { stage: "round_of_32", key: "r32", title: "Dieciseisavos" },
  { stage: "round_of_16", key: "r16", title: "Octavos" },
  { stage: "quarter_final", key: "qf", title: "Cuartos" },
  { stage: "semi_final", key: "sf", title: "Semis" },
  { stage: "final", key: "final", title: "Final" },
];

function parseSlot(placeholder: string): BracketSlot {
  const match = /^(Ganador|Perdedor)\s+\S+-(\d+)$/.exec(placeholder);
  if (match) {
    const from = Number(match[2]);
    return match[1] === "Ganador"
      ? { kind: "winner", from }
      : { kind: "loser", from };
  }
  return { kind: "group", label: placeholder };
}

export function buildBracket(): Bracket {
  // matchNumber por posición en el fixture (grupos 1..72, eliminatorias 73..104).
  const nodes: BracketNode[] = [];
  const byNumber = new Map<number, BracketNode>();

  SEED_MATCHES.forEach((m, i) => {
    if (m.stage === "group") return;
    const home = parseSlot(m.homePlaceholder ?? "");
    const away = parseSlot(m.awayPlaceholder ?? "");
    const feeders = [home, away]
      .filter((s): s is Extract<BracketSlot, { from: number }> => s.kind !== "group")
      .map((s) => s.from);
    const node: BracketNode = {
      matchNumber: i + 1,
      stage: m.stage,
      homePlaceholder: m.homePlaceholder ?? "",
      awayPlaceholder: m.awayPlaceholder ?? "",
      home,
      away,
      feeders,
    };
    nodes.push(node);
    byNumber.set(node.matchNumber, node);
  });

  // Orden vertical por DFS desde la final (subárbol "home" antes que "away").
  const finalNode = nodes.find((n) => n.stage === "final");
  const orderKey = new Map<number, number>();
  let counter = 0;
  function dfs(mn: number): number {
    const node = byNumber.get(mn);
    if (!node) return counter++;
    if (node.feeders.length === 0) {
      const k = counter++;
      orderKey.set(mn, k);
      return k;
    }
    const k = Math.min(...node.feeders.map((f) => dfs(f)));
    orderKey.set(mn, k);
    return k;
  }
  if (finalNode) dfs(finalNode.matchNumber);

  const rounds: BracketRound[] = ROUND_META.map((meta) => ({
    stage: meta.stage,
    key: meta.key,
    title: meta.title,
    nodes: nodes
      .filter((n) => n.stage === meta.stage)
      .sort(
        (a, b) =>
          (orderKey.get(a.matchNumber) ?? 0) - (orderKey.get(b.matchNumber) ?? 0),
      ),
  }));

  const thirdPlace = nodes.find((n) => n.stage === "third_place") ?? null;

  return { rounds, thirdPlace };
}
