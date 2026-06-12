export type ScoreInput = { homeScore: number; awayScore: number };
export type PredictionInput = { homeScorePred: number; awayScorePred: number };

export const CORRECT_RESULT_POINTS = 1;
export const CLOSE_RESULT_POINTS = 2;
export const EXACT_SCORE_POINTS = 3;

const sign = (h: number, a: number): -1 | 0 | 1 =>
  h > a ? 1 : h < a ? -1 : 0;

/** +3 marcador exacto, +2 acierta resultado y diferencia, +1 acierta solo el resultado, 0 en otro caso. */
export function scorePrediction(
  pred: PredictionInput,
  result: ScoreInput,
): number {
  if (
    pred.homeScorePred === result.homeScore &&
    pred.awayScorePred === result.awayScore
  ) {
    return EXACT_SCORE_POINTS;
  }
  if (
    sign(pred.homeScorePred, pred.awayScorePred) ===
    sign(result.homeScore, result.awayScore)
  ) {
    const predDiff = pred.homeScorePred - pred.awayScorePred;
    const resultDiff = result.homeScore - result.awayScore;
    return predDiff === resultDiff ? CLOSE_RESULT_POINTS : CORRECT_RESULT_POINTS;
  }
  return 0;
}
