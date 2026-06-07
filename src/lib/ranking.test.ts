import { describe, it, expect } from "vitest";
import { computeRanking } from "./ranking";

describe("computeRanking", () => {
  const users = [
    { id: "u1", name: "Ana" },
    { id: "u2", name: "Beto" },
    { id: "u3", name: "Caro" },
  ];
  const predictions = [
    { userId: "u1", points: 3 },
    { userId: "u1", points: 1 },
    { userId: "u2", points: 3 },
    { userId: "u2", points: 1 },
    { userId: "u3", points: 1 },
  ];

  it("ordena por puntos desc", () => {
    const rows = computeRanking(users, predictions);
    expect(rows[2].name).toBe("Caro");
    expect(rows[0].totalPoints).toBe(4);
  });
  it("desempata por cantidad de marcadores exactos", () => {
    const rows = computeRanking(users, predictions);
    expect(rows[0].name).toBe("Ana");
    expect(rows[1].name).toBe("Beto");
  });
  it("incluye usuarios sin pronósticos con 0", () => {
    const rows = computeRanking([{ id: "u9", name: "Zoe" }], []);
    expect(rows[0]).toMatchObject({ name: "Zoe", totalPoints: 0, exactCount: 0 });
  });
});
