import { eq, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, predictions, users } from "@/db/schema";
import { computeRanking } from "@/lib/ranking";

export type MatchRow = typeof matches.$inferSelect & {
  home: typeof teams.$inferSelect | null;
  away: typeof teams.$inferSelect | null;
};

export async function getMatchesOrdered(): Promise<MatchRow[]> {
  const rows = await db.query.matches.findMany({
    orderBy: [asc(matches.kickoffAt)],
  });
  const allTeams = await db.select().from(teams);
  const byId = new Map(allTeams.map((t) => [t.id, t]));
  return rows.map((m) => ({
    ...m,
    home: m.homeTeamId ? byId.get(m.homeTeamId) ?? null : null,
    away: m.awayTeamId ? byId.get(m.awayTeamId) ?? null : null,
  }));
}

export async function getMatchById(id: number): Promise<MatchRow | null> {
  const m = await db.query.matches.findFirst({ where: eq(matches.id, id) });
  if (!m) return null;
  const allTeams = await db.select().from(teams);
  const byId = new Map(allTeams.map((t) => [t.id, t]));
  return {
    ...m,
    home: m.homeTeamId ? byId.get(m.homeTeamId) ?? null : null,
    away: m.awayTeamId ? byId.get(m.awayTeamId) ?? null : null,
  };
}

export async function getUserPredictions(userId: string) {
  const rows = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, userId));
  return new Map(rows.map((p) => [p.matchId, p]));
}

export async function getPredictionsForMatch(matchId: number) {
  return db
    .select({
      id: predictions.id,
      userId: predictions.userId,
      userName: users.name,
      homeScorePred: predictions.homeScorePred,
      awayScorePred: predictions.awayScorePred,
      points: predictions.points,
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id))
    .where(eq(predictions.matchId, matchId));
}

export async function getRanking() {
  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const allPreds = await db
    .select({ userId: predictions.userId, points: predictions.points })
    .from(predictions);
  return computeRanking(allUsers, allPreds);
}
