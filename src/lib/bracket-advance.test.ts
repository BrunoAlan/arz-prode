import { describe, it, expect } from "vitest";
import {
  resolveBracket,
  rankThirdPlaces,
  isInvalidKnockoutDraw,
  type KnockoutMatchInput,
  type ThirdPlaceInput,
} from "./bracket-advance";

// Helper: arma un KnockoutMatchInput con defaults.
function mk(
  id: number,
  homePlaceholder: string,
  awayPlaceholder: string,
  over: Partial<KnockoutMatchInput> = {},
): KnockoutMatchInput {
  return {
    id,
    stage: "round_of_32",
    homePlaceholder,
    awayPlaceholder,
    homeTeamId: null,
    awayTeamId: null,
    homeScore: null,
    awayScore: null,
    finished: false,
    ...over,
  };
}

describe("resolveBracket", () => {
  it("resuelve posiciones de grupo (1X/2X) de grupos completos", () => {
    // Partido 73 del fixture: "2A" vs "2B".
    const knockout = [mk(73, "2A", "2B")];
    const groupOrder = new Map<string, number[]>([
      ["A", [101, 102, 103, 104]], // 1°=101, 2°=102, 3°=103
      ["B", [201, 202, 203, 204]],
    ]);

    const slots = resolveBracket({ knockout, groupOrder });

    expect(slots).toEqual(
      expect.arrayContaining([
        { matchId: 73, side: "home", teamId: 102 }, // 2A => 2° de A
        { matchId: 73, side: "away", teamId: 202 }, // 2B => 2° de B
      ]),
    );
  });

  it("no toca los cupos de tercero (placeholder '3 ...')", () => {
    // Partido 74 del fixture: "1E" vs "3 A/B/C/D/F".
    const knockout = [mk(74, "1E", "3 A/B/C/D/F")];
    const groupOrder = new Map<string, number[]>([["E", [501, 502, 503, 504]]]);

    const slots = resolveBracket({ knockout, groupOrder });

    expect(slots).toContainEqual({ matchId: 74, side: "home", teamId: 501 }); // 1E => 1° de E
    expect(slots.some((s) => s.matchId === 74 && s.side === "away")).toBe(false);
  });

  it("no resuelve un grupo incompleto (ausente de groupOrder)", () => {
    const knockout = [mk(73, "2A", "2B")];
    const groupOrder = new Map<string, number[]>([["A", [101, 102, 103, 104]]]); // falta B
    const slots = resolveBracket({ knockout, groupOrder });
    expect(slots).toContainEqual({ matchId: 73, side: "home", teamId: 102 });
    expect(slots.some((s) => s.matchId === 73 && s.side === "away")).toBe(false);
  });

  it("propaga el ganador (marcador más alto) al cruce siguiente", () => {
    // R16 partido 90: "Ganador R32-73" vs "Ganador R32-75".
    const knockout = [
      mk(73, "2A", "2B", {
        homeTeamId: 102, awayTeamId: 202, homeScore: 2, awayScore: 1, finished: true,
      }), // gana 102 (home)
      mk(75, "1F", "2C", {
        homeTeamId: 601, awayTeamId: 302, homeScore: 0, awayScore: 3, finished: true,
      }), // gana 302 (away)
      mk(90, "Ganador R32-73", "Ganador R32-75", { stage: "round_of_16" }),
    ];
    const slots = resolveBracket({ knockout, groupOrder: new Map() });
    expect(slots).toContainEqual({ matchId: 90, side: "home", teamId: 102 });
    expect(slots).toContainEqual({ matchId: 90, side: "away", teamId: 302 });
  });

  it("resuelve perdedor para el partido por el tercer puesto y ganador para la final", () => {
    // SF 101: "Ganador CF-97" vs "Ganador CF-98"; SF 102: "Ganador CF-99" vs "Ganador CF-100".
    // 103 third_place: "Perdedor SF-101" vs "Perdedor SF-102".
    // 104 final: "Ganador SF-101" vs "Ganador SF-102".
    const knockout = [
      mk(101, "Ganador CF-97", "Ganador CF-98", {
        stage: "semi_final", homeTeamId: 11, awayTeamId: 12, homeScore: 1, awayScore: 0, finished: true,
      }), // gana 11, pierde 12
      mk(102, "Ganador CF-99", "Ganador CF-100", {
        stage: "semi_final", homeTeamId: 21, awayTeamId: 22, homeScore: 2, awayScore: 3, finished: true,
      }), // gana 22, pierde 21
      mk(103, "Perdedor SF-101", "Perdedor SF-102", { stage: "third_place" }),
      mk(104, "Ganador SF-101", "Ganador SF-102", { stage: "final" }),
    ];
    const slots = resolveBracket({ knockout, groupOrder: new Map() });
    expect(slots).toContainEqual({ matchId: 103, side: "home", teamId: 12 });
    expect(slots).toContainEqual({ matchId: 103, side: "away", teamId: 21 });
    expect(slots).toContainEqual({ matchId: 104, side: "home", teamId: 11 });
    expect(slots).toContainEqual({ matchId: 104, side: "away", teamId: 22 });
  });

  it("no resuelve ganador si el partido fuente está empatado", () => {
    const knockout = [
      mk(73, "2A", "2B", {
        homeTeamId: 102, awayTeamId: 202, homeScore: 1, awayScore: 1, finished: true,
      }),
      mk(90, "Ganador R32-73", "Ganador R32-75", { stage: "round_of_16" }),
    ];
    const slots = resolveBracket({ knockout, groupOrder: new Map() });
    expect(slots.some((s) => s.matchId === 90 && s.side === "home")).toBe(false);
  });

  it("es idempotente (mismo input => mismo output)", () => {
    const build = (): KnockoutMatchInput[] => [
      mk(73, "2A", "2B", {
        homeTeamId: 102, awayTeamId: 202, homeScore: 2, awayScore: 1, finished: true,
      }),
      mk(90, "Ganador R32-73", "Ganador R32-75", { stage: "round_of_16" }),
    ];
    const a = resolveBracket({ knockout: build(), groupOrder: new Map() });
    const b = resolveBracket({ knockout: build(), groupOrder: new Map() });
    expect(a).toEqual(b);
  });
});

describe("rankThirdPlaces", () => {
  const t = (group: string, points: number, goalDiff = 0, goalsFor = 0): ThirdPlaceInput => ({
    group, teamId: group.charCodeAt(0), name: group, flag: null, points, goalDiff, goalsFor,
  });

  it("marca como clasificados solo a los 8 mejores", () => {
    const thirds = ["A","B","C","D","E","F","G","H","I","J","K","L"]
      .map((g, i) => t(g, 12 - i)); // A=12 pts ... L=1 pt
    const ranked = rankThirdPlaces(thirds);
    expect(ranked.filter((r) => r.qualifies).map((r) => r.group)).toEqual(
      ["A", "B", "C", "D", "E", "F", "G", "H"],
    );
    expect(ranked.find((r) => r.group === "I")!.qualifies).toBe(false);
  });

  it("desempata por dif. de gol y luego goles a favor", () => {
    const ranked = rankThirdPlaces([
      t("A", 4, 1, 2),
      t("B", 4, 3, 5), // mejor dif
      t("C", 4, 3, 9), // misma dif que B, más GF
    ]);
    expect(ranked.map((r) => r.group)).toEqual(["C", "B", "A"]);
  });
});

describe("isInvalidKnockoutDraw", () => {
  it("permite empate en grupos", () => {
    expect(isInvalidKnockoutDraw("group", 1, 1)).toBe(false);
  });
  it("rechaza empate en eliminatorias", () => {
    expect(isInvalidKnockoutDraw("round_of_32", 2, 2)).toBe(true);
    expect(isInvalidKnockoutDraw("final", 0, 0)).toBe(true);
  });
  it("permite no-empate en eliminatorias", () => {
    expect(isInvalidKnockoutDraw("final", 3, 2)).toBe(false);
  });
});
