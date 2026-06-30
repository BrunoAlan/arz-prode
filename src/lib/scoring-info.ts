export const SCORING_INFO_KEY = "prode:scoringInfo:v1";

/** true salvo que el usuario haya marcado "no volver a mostrar" ("1"). */
export function shouldShowScoringInfo(stored: string | null): boolean {
  return stored !== "1";
}
