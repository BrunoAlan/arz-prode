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
    expect(rows[0]).toMatchObject({ teamId: 1, drawn: 1, played: 1, points: 1, goalDiff: 0 });
    expect(rows[1]).toMatchObject({ teamId: 2, drawn: 1, played: 1, points: 1, goalDiff: 0 });
  });

  it("empate total en pts/dg/gf se resuelve por enfrentamiento directo", () => {
    const rows = computeGroupStandings(
      [
        { id: 1, name: "Zeta", flag: null },
        { id: 2, name: "Alfa", flag: null },
        { id: 3, name: "Carla", flag: null },
        { id: 4, name: "Delta", flag: null },
      ],
      [
        { homeTeamId: 1, awayTeamId: 2, homeScore: 1, awayScore: 0 }, // Zeta 1-0 Alfa
        { homeTeamId: 3, awayTeamId: 1, homeScore: 1, awayScore: 0 }, // Carla 1-0 Zeta
        { homeTeamId: 1, awayTeamId: 4, homeScore: 2, awayScore: 0 }, // Zeta 2-0 Delta
        { homeTeamId: 2, awayTeamId: 3, homeScore: 1, awayScore: 0 }, // Alfa 1-0 Carla
        { homeTeamId: 2, awayTeamId: 4, homeScore: 2, awayScore: 0 }, // Alfa 2-0 Delta
        { homeTeamId: 4, awayTeamId: 3, homeScore: 1, awayScore: 0 }, // Delta 1-0 Carla
      ],
    );
    // Zeta y Alfa: ambos 6 pts, DG +2, GF 3 -> desempata el 1-0 de Zeta sobre Alfa
    expect(rows[0].teamId).toBe(1);
    expect(rows[1].teamId).toBe(2);
  });

  it("triple empate overall se resuelve por la mini-tabla head-to-head", () => {
    // A(1), B(2), C(3) terminan idénticos overall (6 pts, DG +2, GF 4); W(4) último.
    // Entre ellos: ciclo con márgenes distintos -> h2h los separa por DG: A > B > C.
    const rows = computeGroupStandings(
      [
        { id: 1, name: "A", flag: null },
        { id: 2, name: "B", flag: null },
        { id: 3, name: "C", flag: null },
        { id: 4, name: "W", flag: null },
      ],
      [
        { homeTeamId: 1, awayTeamId: 2, homeScore: 2, awayScore: 0 }, // A 2-0 B
        { homeTeamId: 3, awayTeamId: 1, homeScore: 1, awayScore: 0 }, // C 1-0 A
        { homeTeamId: 2, awayTeamId: 3, homeScore: 2, awayScore: 0 }, // B 2-0 C
        { homeTeamId: 1, awayTeamId: 4, homeScore: 2, awayScore: 1 }, // A 2-1 W
        { homeTeamId: 2, awayTeamId: 4, homeScore: 2, awayScore: 0 }, // B 2-0 W
        { homeTeamId: 3, awayTeamId: 4, homeScore: 3, awayScore: 0 }, // C 3-0 W
      ],
    );
    expect(rows.map((r) => r.teamId)).toEqual([1, 2, 3, 4]);
    expect(rows[0].qualifies).toBe(true);
    expect(rows[1].qualifies).toBe(true);
    expect(rows[2].qualifies).toBe(false);
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
