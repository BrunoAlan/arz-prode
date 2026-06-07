import { describe, it, expect } from "vitest";
import { formatKickoff } from "./format";

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
