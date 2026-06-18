import { describe, it, expect } from "vitest";
import { groupMatches, groupMatchesByDay, getActiveDayKey } from "./group-matches";

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

describe("groupMatchesByDay", () => {
  it("agrupa partidos del mismo día (TZ BA) en una sección", () => {
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-11T19:00:00Z"),
      m("round_of_32", null, "2026-06-11T22:00:00Z"),
    ]);
    expect(secs).toHaveLength(1);
    expect(secs[0].key).toBe("dia-2026-06-11");
    expect(secs[0].matches).toHaveLength(2);
  });

  it("separa en días distintos cruzando la medianoche de BA", () => {
    // 02:00Z del 12 = 23:00 del 11 en BA; 04:00Z del 12 = 01:00 del 12 en BA
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-12T02:00:00Z"),
      m("group", "B", "2026-06-12T04:00:00Z"),
    ]);
    expect(secs.map((s) => s.key)).toEqual(["dia-2026-06-11", "dia-2026-06-12"]);
  });

  it("mezcla stages distintos en el mismo día, ordenados por horario", () => {
    const secs = groupMatchesByDay([
      m("final", null, "2026-06-11T22:00:00Z"),
      m("group", "A", "2026-06-11T19:00:00Z"),
    ]);
    expect(secs).toHaveLength(1);
    expect(secs[0].matches.map((x) => x.kickoffAt.toISOString())).toEqual([
      "2026-06-11T19:00:00.000Z",
      "2026-06-11T22:00:00.000Z",
    ]);
  });

  it("devuelve las secciones en orden cronológico de día", () => {
    const secs = groupMatchesByDay([
      m("group", "C", "2026-06-13T19:00:00Z"),
      m("group", "A", "2026-06-11T19:00:00Z"),
    ]);
    expect(secs.map((s) => s.key)).toEqual(["dia-2026-06-11", "dia-2026-06-13"]);
  });

  it("lista vacía devuelve []", () => {
    expect(groupMatchesByDay([])).toEqual([]);
  });
});

describe("getActiveDayKey", () => {
  it("devuelve la sección de hoy cuando hoy tiene partidos", () => {
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-17T19:00:00Z"),
      m("group", "B", "2026-06-18T19:00:00Z"),
      m("group", "C", "2026-06-19T19:00:00Z"),
    ]);
    // 2026-06-18T15:00Z = 12:00 del 18 en BA
    expect(getActiveDayKey(secs, new Date("2026-06-18T15:00:00Z"))).toBe("dia-2026-06-18");
  });

  it("devuelve el próximo día con partidos cuando hoy no tiene", () => {
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-16T19:00:00Z"),
      m("group", "B", "2026-06-19T19:00:00Z"),
    ]);
    // 2026-06-17 es día libre; el próximo con partidos es el 19
    expect(getActiveDayKey(secs, new Date("2026-06-17T15:00:00Z"))).toBe("dia-2026-06-19");
  });

  it("devuelve la última sección cuando todo quedó en el pasado", () => {
    const secs = groupMatchesByDay([
      m("group", "A", "2026-06-11T19:00:00Z"),
      m("group", "B", "2026-06-12T19:00:00Z"),
    ]);
    expect(getActiveDayKey(secs, new Date("2026-07-01T15:00:00Z"))).toBe("dia-2026-06-12");
  });

  it("devuelve null sin secciones", () => {
    expect(getActiveDayKey([], new Date("2026-06-18T15:00:00Z"))).toBeNull();
  });
});
