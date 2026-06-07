"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, predictions } from "@/db/schema";
import { requireUser, requireAdmin } from "@/lib/session";
import { isMatchPredictable } from "@/lib/match-rules";
import { scorePrediction } from "@/lib/scoring";

export async function savePrediction(
  matchId: number,
  homeScorePred: number,
  awayScorePred: number,
) {
  const user = await requireUser();
  if (
    !Number.isInteger(homeScorePred) ||
    !Number.isInteger(awayScorePred) ||
    homeScorePred < 0 ||
    awayScorePred < 0 ||
    homeScorePred > 99 ||
    awayScorePred > 99
  ) {
    throw new Error("Marcador inválido");
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new Error("Partido inexistente");
  if (!isMatchPredictable(match, new Date())) {
    throw new Error("El partido está cerrado para pronósticos");
  }

  await db
    .insert(predictions)
    .values({ userId: user.id, matchId, homeScorePred, awayScorePred })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      set: { homeScorePred, awayScorePred, updatedAt: new Date() },
    });

  revalidatePath("/predicciones");
  revalidatePath("/ranking");
}

export async function confirmResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
) {
  await requireAdmin();
  if (
    !Number.isInteger(homeScore) ||
    !Number.isInteger(awayScore) ||
    homeScore < 0 ||
    awayScore < 0 ||
    homeScore > 99 ||
    awayScore > 99
  ) {
    throw new Error("Marcador inválido");
  }

  await db
    .update(matches)
    .set({ homeScore, awayScore, status: "finished" })
    .where(eq(matches.id, matchId));

  // Recalcular puntos de cada pronóstico del partido.
  const preds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  for (const p of preds) {
    const points = scorePrediction(
      { homeScorePred: p.homeScorePred, awayScorePred: p.awayScorePred },
      { homeScore, awayScore },
    );
    await db.update(predictions).set({ points }).where(eq(predictions.id, p.id));
  }

  revalidatePath("/ranking");
  revalidatePath("/admin");
  revalidatePath("/predicciones");
  revalidatePath(`/partido/${matchId}`);
}

export async function assignTeams(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
) {
  await requireAdmin();
  await db
    .update(matches)
    .set({ homeTeamId, awayTeamId })
    .where(eq(matches.id, matchId));
  revalidatePath("/predicciones");
  revalidatePath("/admin");
}
