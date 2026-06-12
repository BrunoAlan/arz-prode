import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { matches, predictions } from "../src/db/schema";
import { scorePrediction } from "../src/lib/scoring";

async function main() {
  const finished = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "finished"));

  let updated = 0;
  for (const m of finished) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const preds = await db
      .select()
      .from(predictions)
      .where(eq(predictions.matchId, m.id));
    for (const p of preds) {
      const points = scorePrediction(
        { homeScorePred: p.homeScorePred, awayScorePred: p.awayScorePred },
        { homeScore: m.homeScore, awayScore: m.awayScore },
      );
      await db
        .update(predictions)
        .set({ points })
        .where(eq(predictions.id, p.id));
      updated++;
    }
  }

  console.log(
    `recalculadas ${updated} predicciones (${finished.length} partidos finished)`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
