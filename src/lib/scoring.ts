export type ScoreInput = { homeScore: number; awayScore: number };
export type PredictionInput = { homeScorePred: number; awayScorePred: number };

const sign = (h: number, a: number): -1 | 0 | 1 =>
  h > a ? 1 : h < a ? -1 : 0;

/** +3 marcador exacto, +1 acierta ganador/empate, 0 en otro caso. */
export function scorePrediction(
  pred: PredictionInput,
  result: ScoreInput,
): number {
  if (
    pred.homeScorePred === result.homeScore &&
    pred.awayScorePred === result.awayScore
  ) {
    return 3;
  }
  if (
    sign(pred.homeScorePred, pred.awayScorePred) ===
    sign(result.homeScore, result.awayScore)
  ) {
    return 1;
  }
  return 0;
}
