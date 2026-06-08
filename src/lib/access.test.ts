import { describe, it, expect } from "vitest";
import { isAllowedEmail, isAdmin, loginErrorMessage } from "./access";

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
  it("acepta cualquier dominio de una lista separada por comas", () => {
    const domains = "arzion.com,restosimple.com";
    expect(isAllowedEmail("juan@arzion.com", domains)).toBe(true);
    expect(isAllowedEmail("juan@restosimple.com", domains)).toBe(true);
  });
  it("rechaza un dominio que no está en la lista", () => {
    expect(isAllowedEmail("juan@gmail.com", "arzion.com,restosimple.com")).toBe(
      false,
    );
  });
  it("tolera espacios alrededor de cada dominio de la lista", () => {
    const domains = " arzion.com , restosimple.com ";
    expect(isAllowedEmail("Juan@RestoSimple.com", domains)).toBe(true);
  });
  it("ignora entradas vacías en la lista", () => {
    expect(isAllowedEmail("juan@arzion.com", "arzion.com,,")).toBe(true);
    expect(isAllowedEmail("juan@gmail.com", ",,")).toBe(false);
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

describe("loginErrorMessage", () => {
  it("devuelve null sin código de error", () => {
    expect(loginErrorMessage(undefined)).toBeNull();
    expect(loginErrorMessage("")).toBeNull();
  });
  it("da mensaje de dominio para AccessDenied", () => {
    const msg = loginErrorMessage("AccessDenied");
    expect(msg).toContain("@arzion");
    expect(msg).toContain("@restosimple");
  });
  it("da mensaje genérico para cualquier otro código", () => {
    const msg = loginErrorMessage("Configuration");
    expect(msg).toBeTruthy();
    expect(msg).not.toContain("@arzion");
  });
});
