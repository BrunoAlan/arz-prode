import { describe, it, expect } from "vitest";
import { groupMatches } from "./group-matches";

function m(stage: string, groupLabel: string | null, iso: string) {
  return { stage, groupLabel, kickoffAt: new Date(iso) };
}

describe("groupMatches", () => {
  it("pone los grupos A..L antes que las rondas de eliminatoria", () => {
    const secs = groupMatches([
      m("final", null, "2026-07-19T19:00:00Z"),
      m("group", "B", "2026-06-12T19:00:00Z"),
      m("group", "A", "2026-06-11T19:00:00Z"),
      m("round_of_32", null, "2026-06-28T19:00:00Z"),
    ]);
    expect(secs.map((s) => s.key)).toEqual(["grupo-a", "grupo-b", "r32", "final"]);
    expect(secs[0].title).toBe("Grupo A");
  });

  it("ordena los partidos de una sección por horario", () => {
    const secs = groupMatches([
      m("group", "A", "2026-06-25T01:00:00Z"),
      m("group", "A", "2026-06-11T19:00:00Z"),
    ]);
    expect(secs).toHaveLength(1);
    expect(secs[0].matches.map((x) => x.kickoffAt.toISOString())).toEqual([
      "2026-06-11T19:00:00.000Z",
      "2026-06-25T01:00:00.000Z",
    ]);
  });

  it("omite las secciones vacías", () => {
    const secs = groupMatches([m("group", "C", "2026-06-13T22:00:00Z")]);
    expect(secs.map((s) => s.key)).toEqual(["grupo-c"]);
  });

  it("respeta el orden de rondas r32 → final", () => {
    const secs = groupMatches([
      m("final", null, "2026-07-19T19:00:00Z"),
      m("semi_final", null, "2026-07-14T19:00:00Z"),
      m("third_place", null, "2026-07-18T21:00:00Z"),
      m("round_of_16", null, "2026-07-04T17:00:00Z"),
      m("quarter_final", null, "2026-07-09T20:00:00Z"),
      m("round_of_32", null, "2026-06-28T19:00:00Z"),
    ]);
    expect(secs.map((s) => s.key)).toEqual(["r32", "r16", "qf", "sf", "third", "final"]);
  });
});
