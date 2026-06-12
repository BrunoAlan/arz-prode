import { formatDay, dayKey } from "./format";

type Groupable = {
  stage: string;
  groupLabel: string | null;
  kickoffAt: Date;
};

export type MatchSection<T> = {
  key: string;
  title: string;
  matches: T[];
};

export const GROUP_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

const KNOCKOUT_ORDER: { stage: string; key: string; title: string }[] = [
  { stage: "round_of_32", key: "r32", title: "Dieciseisavos" },
  { stage: "round_of_16", key: "r16", title: "Octavos de final" },
  { stage: "quarter_final", key: "qf", title: "Cuartos de final" },
  { stage: "semi_final", key: "sf", title: "Semifinales" },
  { stage: "third_place", key: "third", title: "Tercer puesto" },
  { stage: "final", key: "final", title: "Final" },
];

export function groupMatches<T extends Groupable>(matches: T[]): MatchSection<T>[] {
  const byKickoff = (a: T, b: T) =>
    a.kickoffAt.getTime() - b.kickoffAt.getTime();
  const sections: MatchSection<T>[] = [];

  for (const label of GROUP_LABELS) {
    const inGroup = matches
      .filter((mm) => mm.stage === "group" && mm.groupLabel === label)
      .sort(byKickoff);
    if (inGroup.length > 0) {
      sections.push({
        key: `grupo-${label.toLowerCase()}`,
        title: `Grupo ${label}`,
        matches: inGroup,
      });
    }
  }

  for (const round of KNOCKOUT_ORDER) {
    const inRound = matches
      .filter((mm) => mm.stage === round.stage)
      .sort(byKickoff);
    if (inRound.length > 0) {
      sections.push({ key: round.key, title: round.title, matches: inRound });
    }
  }

  return sections;
}

export function groupMatchesByDay<T extends Groupable>(
  matches: T[],
): MatchSection<T>[] {
  const sorted = [...matches].sort(
    (a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime(),
  );
  const sections: MatchSection<T>[] = [];
  const byKey = new Map<string, MatchSection<T>>();

  for (const mm of sorted) {
    const key = dayKey(mm.kickoffAt);
    let section = byKey.get(key);
    if (!section) {
      section = { key: `dia-${key}`, title: formatDay(mm.kickoffAt), matches: [] };
      byKey.set(key, section);
      sections.push(section);
    }
    section.matches.push(mm);
  }

  return sections;
}
