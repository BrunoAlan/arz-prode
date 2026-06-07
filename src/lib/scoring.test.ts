import { describe, it, expect } from "vitest";
import { scorePrediction } from "./scoring";

const pred = (h: number, a: number) => ({ homeScorePred: h, awayScorePred: a });
const res = (h: number, a: number) => ({ homeScore: h, awayScore: a });

describe("scorePrediction (resultado +1, exacto +3)", () => {
  it("marcador exacto da 3", () => {
    expect(scorePrediction(pred(2, 1), res(2, 1))).toBe(3);
  });
  it("acierta ganador pero no marcador da 1", () => {
    expect(scorePrediction(pred(2, 1), res(3, 0))).toBe(1);
  });
  it("acierta empate (distinto marcador) da 1", () => {
    expect(scorePrediction(pred(1, 1), res(2, 2))).toBe(1);
  });
  it("empate exacto da 3", () => {
    expect(scorePrediction(pred(0, 0), res(0, 0))).toBe(3);
  });
  it("erra el resultado da 0", () => {
    expect(scorePrediction(pred(2, 1), res(0, 1))).toBe(0);
  });
  it("marcador invertido (gana el otro) da 0", () => {
    expect(scorePrediction(pred(0, 1), res(1, 0))).toBe(0);
  });
});
