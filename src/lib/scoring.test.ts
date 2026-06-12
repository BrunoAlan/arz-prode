import { describe, it, expect } from "vitest";
import { scorePrediction } from "./scoring";

const pred = (h: number, a: number) => ({ homeScorePred: h, awayScorePred: a });
const res = (h: number, a: number) => ({ homeScore: h, awayScore: a });

describe("scorePrediction (exacto +3, diferencia +2, resultado +1)", () => {
  it("marcador exacto da 3", () => {
    expect(scorePrediction(pred(2, 1), res(2, 1))).toBe(3);
  });
  it("empate exacto da 3", () => {
    expect(scorePrediction(pred(0, 0), res(0, 0))).toBe(3);
  });
  it("mismo signo y misma diferencia (no exacto) da 2", () => {
    expect(scorePrediction(pred(2, 1), res(3, 2))).toBe(2);
  });
  it("misma diferencia aunque el marcador esté lejos da 2", () => {
    expect(scorePrediction(pred(1, 0), res(3, 2))).toBe(2);
  });
  it("empate no exacto da 2 (toda diferencia de empate es 0)", () => {
    expect(scorePrediction(pred(1, 1), res(2, 2))).toBe(2);
  });
  it("mismo signo pero distinta diferencia da 1", () => {
    expect(scorePrediction(pred(2, 0), res(1, 0))).toBe(1);
  });
  it("acierta ganador con diferencia distinta da 1", () => {
    expect(scorePrediction(pred(2, 1), res(3, 0))).toBe(1);
  });
  it("erra el resultado da 0", () => {
    expect(scorePrediction(pred(2, 1), res(0, 1))).toBe(0);
  });
  it("marcador invertido (gana el otro) da 0", () => {
    expect(scorePrediction(pred(0, 1), res(1, 0))).toBe(0);
  });
});
