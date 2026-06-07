import { describe, it, expect } from "vitest";
import { buildBracket } from "./bracket";

describe("buildBracket", () => {
  const bracket = buildBracket();

  it("arma 5 rondas con tamaños 16/8/4/2/1", () => {
    expect(bracket.rounds.map((r) => r.nodes.length)).toEqual([16, 8, 4, 2, 1]);
    expect(bracket.rounds.map((r) => r.key)).toEqual(["r32", "r16", "qf", "sf", "final"]);
  });

  it("separa el tercer puesto del árbol principal", () => {
    expect(bracket.thirdPlace).not.toBeNull();
    expect(bracket.thirdPlace!.stage).toBe("third_place");
    expect(
      bracket.rounds.some((r) => r.nodes.some((n) => n.stage === "third_place")),
    ).toBe(false);
  });

  it("ubica los dos alimentadores de cada llave contiguos en la ronda previa", () => {
    for (let i = 1; i < bracket.rounds.length; i++) {
      const prevNumbers = bracket.rounds[i - 1].nodes.map((n) => n.matchNumber);
      for (const node of bracket.rounds[i].nodes) {
        expect(node.feeders).toHaveLength(2);
        const positions = node.feeders
          .map((f) => prevNumbers.indexOf(f))
          .sort((a, b) => a - b);
        expect(positions[0]).toBeGreaterThanOrEqual(0);
        expect(positions[1]).toBe(positions[0] + 1);
      }
    }
  });

  it("las llaves de R32 son hojas de grupo (sin alimentadores)", () => {
    for (const node of bracket.rounds[0].nodes) {
      expect(node.feeders).toHaveLength(0);
      expect(node.home.kind).toBe("group");
      expect(node.away.kind).toBe("group");
    }
  });

  it("la final toma los ganadores de las dos semifinales", () => {
    const final = bracket.rounds[4].nodes[0];
    expect(final.home).toEqual({ kind: "winner", from: 101 });
    expect(final.away).toEqual({ kind: "winner", from: 102 });
  });
});
