import { describe, it, expect } from "vitest";
import { isLocked, isMatchPredictable } from "./match-rules";

const now = new Date("2026-06-15T12:00:00Z");
const future = new Date("2026-06-15T18:00:00Z");
const past = new Date("2026-06-15T06:00:00Z");

const base = {
  homeTeamId: 1,
  awayTeamId: 2,
  kickoffAt: future,
  status: "scheduled" as const,
};

describe("isLocked", () => {
  it("no bloqueado antes del kickoff", () => {
    expect(isLocked({ ...base, kickoffAt: future }, now)).toBe(false);
  });
  it("bloqueado en o después del kickoff", () => {
    expect(isLocked({ ...base, kickoffAt: past }, now)).toBe(true);
    expect(isLocked({ ...base, kickoffAt: now }, now)).toBe(true);
  });
});

describe("isMatchPredictable", () => {
  it("predecible con ambos equipos y antes del kickoff", () => {
    expect(isMatchPredictable(base, now)).toBe(true);
  });
  it("no predecible si falta un equipo (cruce sin definir)", () => {
    expect(isMatchPredictable({ ...base, homeTeamId: null }, now)).toBe(false);
  });
  it("no predecible si ya empezó", () => {
    expect(isMatchPredictable({ ...base, kickoffAt: past }, now)).toBe(false);
  });
  it("no predecible si ya finalizó", () => {
    expect(isMatchPredictable({ ...base, status: "finished" }, now)).toBe(false);
  });
});
