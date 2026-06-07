import { describe, it, expect } from "vitest";
import { isAllowedEmail, isAdmin } from "./access";

describe("isAllowedEmail", () => {
  it("acepta email del dominio permitido", () => {
    expect(isAllowedEmail("juan@arzion.com", "arzion.com")).toBe(true);
  });
  it("rechaza otro dominio", () => {
    expect(isAllowedEmail("juan@gmail.com", "arzion.com")).toBe(false);
  });
  it("es case-insensitive y tolera espacios", () => {
    expect(isAllowedEmail("  Juan@Arzion.com ", "arzion.com")).toBe(true);
  });
  it("rechaza null/undefined/vacío", () => {
    expect(isAllowedEmail(undefined, "arzion.com")).toBe(false);
    expect(isAllowedEmail("", "arzion.com")).toBe(false);
  });
  it("no se deja engañar por subdominio falso", () => {
    expect(isAllowedEmail("x@arzion.com.evil.com", "arzion.com")).toBe(false);
  });
  it("rechaza dominio vacío o con solo espacios", () => {
    expect(isAllowedEmail("user@arzion.com", "")).toBe(false);
    expect(isAllowedEmail("user@", "   ")).toBe(false);
  });
});

describe("isAdmin", () => {
  const admins = "alan.bruno@arzion.com, otro@arzion.com";
  it("reconoce admin (case-insensitive)", () => {
    expect(isAdmin("Alan.Bruno@arzion.com", admins)).toBe(true);
  });
  it("rechaza no-admin", () => {
    expect(isAdmin("juan@arzion.com", admins)).toBe(false);
  });
  it("rechaza email vacío o lista vacía", () => {
    expect(isAdmin("", admins)).toBe(false);
    expect(isAdmin("alan.bruno@arzion.com", "")).toBe(false);
  });
});
