import { describe, expect, it } from "vitest";
import { normalizeTitle } from "./songs";

describe("normalizeTitle", () => {
  it("ignora acento, caixa e pontuação", () => {
    expect(normalizeTitle("Ele é a Glória!")).toBe(normalizeTitle("ele e a gloria"));
  });

  it("não junta títulos diferentes", () => {
    expect(normalizeTitle("Bondade de Deus")).not.toBe(normalizeTitle("Bondade"));
  });
});
