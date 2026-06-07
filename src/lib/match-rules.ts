export type MatchRuleInput = {
  homeTeamId: number | null;
  awayTeamId: number | null;
  kickoffAt: Date;
  status: "scheduled" | "finished";
};

/** Bloqueado para editar pronóstico desde el kickoff (inclusive). */
export function isLocked(
  match: Pick<MatchRuleInput, "kickoffAt">,
  now: Date,
): boolean {
  return now.getTime() >= match.kickoffAt.getTime();
}

/** Predecible: ambos equipos definidos, programado y sin empezar. */
export function isMatchPredictable(match: MatchRuleInput, now: Date): boolean {
  return (
    match.homeTeamId != null &&
    match.awayTeamId != null &&
    match.status === "scheduled" &&
    !isLocked(match, now)
  );
}
