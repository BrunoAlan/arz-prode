export type RankingUser = { id: string; name: string | null };
export type RankingPrediction = { userId: string; points: number | null };

export type RankedRow = {
  id: string;
  name: string;
  totalPoints: number;
  exactCount: number;
  position: number;
};

export function computeRanking(
  users: RankingUser[],
  predictions: RankingPrediction[],
): RankedRow[] {
  const totals = new Map<string, { points: number; exact: number }>();
  for (const u of users) totals.set(u.id, { points: 0, exact: 0 });

  for (const p of predictions) {
    const acc = totals.get(p.userId);
    if (!acc) continue;
    const pts = p.points ?? 0;
    acc.points += pts;
    if (pts === 3) acc.exact += 1;
  }

  const rows = users
    .map((u) => {
      const acc = totals.get(u.id)!;
      return {
        id: u.id,
        name: u.name ?? "Sin nombre",
        totalPoints: acc.points,
        exactCount: acc.exact,
      };
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.exactCount - a.exactCount ||
        a.name.localeCompare(b.name),
    );

  return rows.map((r, i) => ({ ...r, position: i + 1 }));
}
