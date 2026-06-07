import { db } from "./client";
import { teams, matches } from "./schema";
import { SEED_TEAMS, SEED_MATCHES } from "./fixture-data";

async function main() {
  const existing = await db.select().from(teams).limit(1);
  if (existing.length > 0) {
    console.log("La base ya tiene equipos. Abortando para no duplicar. (Vaciá las tablas si querés re-seedear.)");
    process.exit(0);
  }

  console.log("Sembrando equipos...");
  const codeToId = new Map<string, number>();
  for (const t of SEED_TEAMS) {
    const [row] = await db
      .insert(teams)
      .values({ name: t.name, fifaCode: t.fifaCode, group: t.group, flag: t.flag })
      .returning({ id: teams.id });
    codeToId.set(t.fifaCode, row.id);
  }

  console.log("Sembrando partidos...");
  for (const m of SEED_MATCHES) {
    await db.insert(matches).values({
      stage: m.stage,
      groupLabel: m.groupLabel,
      homeTeamId: m.homeFifaCode ? codeToId.get(m.homeFifaCode) ?? null : null,
      awayTeamId: m.awayFifaCode ? codeToId.get(m.awayFifaCode) ?? null : null,
      homePlaceholder: m.homePlaceholder,
      awayPlaceholder: m.awayPlaceholder,
      kickoffAt: new Date(m.kickoffAtUtc),
      venue: m.venue,
    });
  }

  console.log(`Listo: ${SEED_TEAMS.length} equipos, ${SEED_MATCHES.length} partidos.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
