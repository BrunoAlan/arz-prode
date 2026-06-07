import { eq, asc, and } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, teams, predictions, users } from "@/db/schema";
import { computeRanking } from "@/lib/ranking";
import { computeGroupStandings, type StandingRow } from "@/lib/standings";
import { GROUP_LABELS } from "@/lib/group-matches";

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

const KNOCKOUT_STAGES = new Set([
  "round_of_32",
  "round_of_16",
  "quarter_final",
  "semi_final",
  "third_place",
  "final",
]);

export async function getKnockoutMatches(): Promise<MatchRow[]> {
  const all = await getMatchesOrdered();
  return all.filter((m) => KNOCKOUT_STAGES.has(m.stage));
}

export async function getGroupStandings(): Promise<
  { label: string; rows: StandingRow[] }[]
> {
  const allTeams = await db.select().from(teams);
  const finishedGroupMatches = await db
    .select()
    .from(matches)
    .where(and(eq(matches.stage, "group"), eq(matches.status, "finished")));

  const groups: { label: string; rows: StandingRow[] }[] = [];
  for (const label of GROUP_LABELS) {
    const groupTeams = allTeams
      .filter((t) => t.group === label)
      .map((t) => ({ id: t.id, name: t.name, flag: t.flag }));
    if (groupTeams.length === 0) continue;

    const ids = new Set(groupTeams.map((t) => t.id));
    const groupMatches = finishedGroupMatches
      .filter(
        (m) =>
          m.homeTeamId != null &&
          m.awayTeamId != null &&
          m.homeScore != null &&
          m.awayScore != null &&
          ids.has(m.homeTeamId) &&
          ids.has(m.awayTeamId),
      )
      .map((m) => ({
        homeTeamId: m.homeTeamId!,
        awayTeamId: m.awayTeamId!,
        homeScore: m.homeScore!,
        awayScore: m.awayScore!,
      }));

    groups.push({ label, rows: computeGroupStandings(groupTeams, groupMatches) });
  }
  return groups;
}
