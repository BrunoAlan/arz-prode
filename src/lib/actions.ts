"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { matches, predictions } from "@/db/schema";
import { requireUser, requireAdmin } from "@/lib/session";
import { isMatchPredictable } from "@/lib/match-rules";
import { scorePrediction } from "@/lib/scoring";
import { getKnockoutMatches, getGroupStandings, getCompleteGroups } from "@/lib/queries";
import { resolveBracket, isInvalidKnockoutDraw } from "@/lib/bracket-advance";

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

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new Error("Partido inexistente");
  if (isInvalidKnockoutDraw(match.stage, homeScore, awayScore)) {
    throw new Error(
      "En eliminatorias cargá el resultado con la definición ya reflejada (ej. 3-2); no puede quedar empate.",
    );
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

  // El avance de llaves no debe bloquear la carga del resultado (camino crítico en
  // vivo): si falla, el marcador y los puntos ya quedaron guardados arriba.
  try {
    await applyBracketAdvance();
  } catch (e) {
    console.error(
      `applyBracketAdvance falló tras confirmar el resultado del partido ${matchId}`,
      e,
    );
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

// Re-deriva y persiste los equipos de las llaves a partir del estado actual.
// Idempotente: solo escribe los cambios (deltas).
async function applyBracketAdvance() {
  const [knockout, standings, completeGroups] = await Promise.all([
    getKnockoutMatches(),
    getGroupStandings(),
    getCompleteGroups(),
  ]);

  const groupOrder = new Map<string, number[]>();
  for (const g of standings) {
    if (completeGroups.has(g.label)) {
      groupOrder.set(g.label, g.rows.map((row) => row.teamId));
    }
  }

  const slots = resolveBracket({
    knockout: knockout.map((m) => ({
      id: m.id,
      stage: m.stage,
      homePlaceholder: m.homePlaceholder,
      awayPlaceholder: m.awayPlaceholder,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      finished: m.status === "finished",
    })),
    groupOrder,
  });

  const current = new Map(knockout.map((m) => [m.id, m]));
  for (const slot of slots) {
    const m = current.get(slot.matchId);
    if (!m) continue;
    const cur = slot.side === "home" ? m.homeTeamId : m.awayTeamId;
    if (cur === slot.teamId) continue; // sin cambios
    await db
      .update(matches)
      .set(
        slot.side === "home"
          ? { homeTeamId: slot.teamId }
          : { awayTeamId: slot.teamId },
      )
      .where(eq(matches.id, slot.matchId));
  }

  revalidatePath("/llaves");
  revalidatePath("/predicciones");
}

export async function assignThird(matchId: number, teamId: number) {
  await requireAdmin();
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) throw new Error("Partido inexistente");
  if (match.stage !== "round_of_32") {
    throw new Error("El partido no es de dieciseisavos");
  }

  const side =
    match.homePlaceholder?.startsWith("3 ")
      ? "home"
      : match.awayPlaceholder?.startsWith("3 ")
        ? "away"
        : null;
  if (!side) throw new Error("Este partido no tiene un cupo de tercero");

  const placeholder = (side === "home" ? match.homePlaceholder : match.awayPlaceholder)!;
  // "3 A/B/C/D/F" -> ["A","B","C","D","F"]
  const allowedGroups = placeholder.slice(2).split("/").map((s) => s.trim());

  // El equipo debe ser el 3° de uno de los grupos permitidos Y completo (6 finished).
  const [standings, completeGroups] = await Promise.all([
    getGroupStandings(),
    getCompleteGroups(),
  ]);
  const validThirds = new Set<number>();
  for (const g of standings) {
    if (allowedGroups.includes(g.label) && g.rows[2] && completeGroups.has(g.label)) {
      validThirds.add(g.rows[2].teamId);
    }
  }
  if (!validThirds.has(teamId)) {
    throw new Error("Equipo inválido para este cupo de tercero");
  }

  await db
    .update(matches)
    .set(side === "home" ? { homeTeamId: teamId } : { awayTeamId: teamId })
    .where(eq(matches.id, matchId));

  // La asignación del tercero ya quedó guardada arriba; si el avance posterior
  // falla, no debe revertir ni bloquear la asignación.
  try {
    await applyBracketAdvance();
  } catch (e) {
    console.error(
      `applyBracketAdvance falló tras asignar el tercero del partido ${matchId}`,
      e,
    );
  }
  revalidatePath("/admin");
}
