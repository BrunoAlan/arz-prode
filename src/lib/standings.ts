export type StandingTeam = { id: number; name: string; flag: string | null };

export type StandingMatch = {
  homeTeamId: number;
  awayTeamId: number;
  homeScore: number;
  awayScore: number;
};

export type StandingRow = {
  teamId: number;
  name: string;
  flag: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  position: number;
  qualifies: boolean;
};

type Stat = {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

function emptyStat(): Stat {
  return {
    played: 0, won: 0, drawn: 0, lost: 0,
    goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0,
  };
}

/** Acumula estadísticas de un conjunto de equipos sobre los partidos en los que
 *  ambos equipos pertenecen al conjunto (los demás partidos se ignoran). */
function accumulate(teamIds: number[], matches: StandingMatch[]): Map<number, Stat> {
  const stats = new Map<number, Stat>();
  for (const id of teamIds) stats.set(id, emptyStat());

  for (const m of matches) {
    const home = stats.get(m.homeTeamId);
    const away = stats.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++; away.played++;
    home.goalsFor += m.homeScore; home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore; away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.won++; home.points += 3; away.lost++;
    } else if (m.homeScore < m.awayScore) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  }

  for (const s of stats.values()) s.goalDiff = s.goalsFor - s.goalsAgainst;
  return stats;
}

export function computeGroupStandings(
  teams: StandingTeam[],
  matches: StandingMatch[],
): StandingRow[] {
  const teamIds = teams.map((t) => t.id);
  const byId = new Map(teams.map((t) => [t.id, t]));
  const stats = accumulate(teamIds, matches);

  const ordered = [...teamIds].sort((a, b) => {
    const sa = stats.get(a)!;
    const sb = stats.get(b)!;
    return (
      sb.points - sa.points ||
      sb.goalDiff - sa.goalDiff ||
      sb.goalsFor - sa.goalsFor ||
      byId.get(a)!.name.localeCompare(byId.get(b)!.name)
    );
  });

  return ordered.map((id, idx) => {
    const s = stats.get(id)!;
    const t = byId.get(id)!;
    return {
      teamId: id,
      name: t.name,
      flag: t.flag,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      goalsFor: s.goalsFor,
      goalsAgainst: s.goalsAgainst,
      goalDiff: s.goalDiff,
      points: s.points,
      position: idx + 1,
      qualifies: idx < 2,
    };
  });
}
