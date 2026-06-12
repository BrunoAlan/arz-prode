import { describe, it, expect } from "vitest";
import { formatKickoff, formatDay, dayKey } from "./format";

const KICKOFF = new Date("2026-06-11T19:00:00Z"); // 16:00 en Buenos Aires (UTC-3)

describe("formatKickoff", () => {
  it("usa Buenos Aires por defecto e incluye sigla de zona", () => {
    const s = formatKickoff(KICKOFF);
    expect(s).toContain("16:00");
    expect(s).toMatch(/GMT|ART|UTC/); // la sigla exacta depende del runtime ICU
  });

  it("respeta una zona horaria explícita", () => {
    const s = formatKickoff(KICKOFF, "America/Mexico_City"); // UTC-6 → 13:00
    expect(s).toContain("13:00");
  });

  it("usa formato 24h (sin AM/PM)", () => {
    const s = formatKickoff(new Date("2026-06-11T23:00:00Z")); // 20:00 en BA
    expect(s).toContain("20:00");
    expect(s).not.toMatch(/[ap]\.?\s?m\.?/i);
  });
});

describe("formatDay", () => {
  it("devuelve weekday + día + mes, sin hora, en Buenos Aires por defecto", () => {
    const s = formatDay(new Date("2026-06-11T19:00:00Z")); // 16:00 jueves en BA
    expect(s).toMatch(/jue/i);
    expect(s).toMatch(/11/);
    expect(s).toMatch(/jun/i);
    expect(s).not.toMatch(/\d{1,2}:\d{2}/); // sin hora
  });

  it("respeta una zona horaria explícita en el límite de día", () => {
    // 01:00Z del 12 = 22:00 del 11 en BA (UTC-3)
    const s = formatDay(new Date("2026-06-12T01:00:00Z"), "America/Argentina/Buenos_Aires");
    expect(s).toMatch(/11/);
  });
});

describe("dayKey", () => {
  it("devuelve YYYY-MM-DD en TZ Buenos Aires", () => {
    expect(dayKey(new Date("2026-06-11T19:00:00Z"))).toBe("2026-06-11");
  });

  it("agrupa por día calendario de BA, no UTC", () => {
    // 01:00Z del 12 cae el 11 en BA
    expect(dayKey(new Date("2026-06-12T01:00:00Z"))).toBe("2026-06-11");
  });
});
