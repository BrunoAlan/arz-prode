import { describe, it, expect } from "vitest";
import { SCORING_INFO_KEY, shouldShowScoringInfo } from "./scoring-info";

describe("scoring-info", () => {
  it("la key está versionada", () => {
    expect(SCORING_INFO_KEY).toBe("prode:scoringInfo:v1");
  });
  it("muestra cuando no hay nada guardado (null)", () => {
    expect(shouldShowScoringInfo(null)).toBe(true);
  });
  it("muestra cuando el valor guardado está vacío", () => {
    expect(shouldShowScoringInfo("")).toBe(true);
  });
  it("muestra cuando hay cualquier otro valor", () => {
    expect(shouldShowScoringInfo("0")).toBe(true);
  });
  it("no muestra cuando el usuario marcó no volver a mostrar (\"1\")", () => {
    expect(shouldShowScoringInfo("1")).toBe(false);
  });
});
