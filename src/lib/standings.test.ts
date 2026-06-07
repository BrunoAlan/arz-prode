import { describe, it, expect } from "vitest";
import { computeGroupStandings } from "./standings";

const T = (id: number, name: string) => ({ id, name, flag: null });

describe("computeGroupStandings", () => {
  it("grupo sin partidos: todo en cero y orden alfabético", () => {
    const rows = computeGroupStandings([T(2, "Brasil"), T(1, "Argentina")], []);
    expect(rows.map((r) => r.name)).toEqual(["Argentina", "Brasil"]);
    expect(rows[0]).toMatchObject({ played: 0, won: 0, points: 0, goalDiff: 0, position: 1 });
  });

  it("un partido: ganador 3 pts, perdedor 0, goles correctos", () => {
    const rows = computeGroupStandings(
      [T(1, "Argentina"), T(2, "Brasil")],
      [{ homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 1 }],
    );
    expect(rows[0]).toMatchObject({
      teamId: 1, played: 1, won: 1, drawn: 0, lost: 0,
      goalsFor: 2, goalsAgainst: 1, goalDiff: 1, points: 3, position: 1,
    });
    expect(rows[1]).toMatchObject({ teamId: 2, lost: 1, points: 0, goalDiff: -1 });
  });

  it("empata en puntos, desempata por diferencia de gol", () => {
    const rows = computeGroupStandings(
      [T(1, "A"), T(2, "B"), T(3, "X"), T(4, "Y")],
      [
        { homeTeamId: 1, awayTeamId: 3, homeScore: 3, awayScore: 0 },
        { homeTeamId: 2, awayTeamId: 4, homeScore: 1, awayScore: 0 },
      ],
    );
    expect(rows[0].teamId).toBe(1);
    expect(rows[1].teamId).toBe(2);
  });

  it("empata en puntos y DG, desempata por goles a favor", () => {
    const rows = computeGroupStandings(
      [T(1, "A"), T(2, "B"), T(3, "X"), T(4, "Y")],
      [
        { homeTeamId: 1, awayTeamId: 3, homeScore: 2, awayScore: 0 },
        { homeTeamId: 2, awayTeamId: 4, homeScore: 3, awayScore: 1 },
      ],
    );
    expect(rows[0].teamId).toBe(2);
    expect(rows[1].teamId).toBe(1);
  });

  it("empate total sin enfrentamiento: orden alfabético", () => {
    const rows = computeGroupStandings(
      [T(1, "Zeta"), T(2, "Alfa"), T(3, "X"), T(4, "Y")],
      [
        { homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 },
        { homeTeamId: 2, awayTeamId: 4, homeScore: 1, awayScore: 0 },
      ],
    );
    expect(rows[0].teamId).toBe(2);
    expect(rows[1].teamId).toBe(1);
  });

  it("empate: ambos equipos suman 1 punto y 1 jugado", () => {
    const rows = computeGroupStandings(
      [T(1, "A"), T(2, "B")],
      [{ homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 1 }],
    );
    expect(rows[0]).toMatchObject({ drawn: 1, played: 1, points: 1, goalDiff: 0 });
    expect(rows[1]).toMatchObject({ drawn: 1, played: 1, points: 1, goalDiff: 0 });
  });

  it("qualifies: true para puestos 1 y 2, false del 3 en adelante", () => {
    const rows = computeGroupStandings(
      [T(1, "A"), T(2, "B"), T(3, "C")],
      [
        { homeTeamId: 1, awayTeamId: 3, homeScore: 1, awayScore: 0 },
        { homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 0 },
      ],
    );
    expect(rows[0].qualifies).toBe(true);
    expect(rows[1].qualifies).toBe(true);
    expect(rows[2].qualifies).toBe(false);
  });
});
