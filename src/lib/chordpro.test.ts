import { describe, expect, it } from "vitest";
import { toPlainLyrics, transposeChordPro, transposeTone } from "./chordpro";

describe("toPlainLyrics", () => {
  it("remove os acordes e apara os dois lados da linha", () => {
    const input = "  [G]Amazing [C]grace\n[D]how sweet  the sound  ";
    expect(toPlainLyrics(input)).toBe("Amazing grace\nhow sweet  the sound");
  });

  it("preserva linhas sem nenhum acorde", () => {
    expect(toPlainLyrics("Só letra, sem cifra")).toBe("Só letra, sem cifra");
  });

  it("lida com linha vazia entre acordes", () => {
    expect(toPlainLyrics("[G]Verso um\n\n[C]Verso dois")).toBe("Verso um\n\nVerso dois");
  });
});

describe("transposeChordPro — sustenido por padrão", () => {
  it("sobe um semitom em Dó usando sustenido, não bemol", () => {
    expect(transposeChordPro("[C]Grace", 1)).toBe("[C#]Grace");
  });

  it("dá a volta na escala (B + 1 semitom = C)", () => {
    expect(transposeChordPro("[B]", 1)).toBe("[C]");
  });

  it("semitons negativos também dão a volta (C - 1 semitom = B)", () => {
    expect(transposeChordPro("[C]", -1)).toBe("[B]");
  });

  it("semitons = 0 devolve o texto intacto", () => {
    const original = "[G]Amazing [C]grace [D]how sweet";
    expect(transposeChordPro(original, 0)).toBe(original);
  });
});

describe("transposeChordPro — bemol declarado continua bemol", () => {
  it("Db + 2 semitons dá Eb, não D#", () => {
    expect(transposeChordPro("[Db]", 2)).toBe("[Eb]");
  });

  it("Ab + 1 semitom dá A (nota natural, sem acidente)", () => {
    expect(transposeChordPro("[Ab]", 1)).toBe("[A]");
  });
});

describe("transposeChordPro — acorde com baixo (barra)", () => {
  it("transpõe base e baixo juntos: D/F# + 2 semitons = E/G#", () => {
    expect(transposeChordPro("[D/F#]", 2)).toBe("[E/G#]");
  });

  it("baixo em bemol continua em bemol: C/Eb + 1 semitom = C#/E", () => {
    expect(transposeChordPro("[C/Eb]", 1)).toBe("[C#/E]");
  });
});

describe("transposeChordPro — sufixos e conteúdo desconhecido", () => {
  it("preserva o sufixo do acorde (Cadd9 + 2 semitons = Dadd9)", () => {
    expect(transposeChordPro("[Cadd9]", 2)).toBe("[Dadd9]");
  });

  it("preserva marcador não musical, devolvendo intacto", () => {
    expect(transposeChordPro("[N.C.]", 3)).toBe("[N.C.]");
  });

  it("transpõe vários acordes na mesma linha", () => {
    expect(transposeChordPro("[G]Amazing [C]grace [D]how", 2)).toBe("[A]Amazing [D]grace [E]how");
  });
});

describe("transposeTone", () => {
  it("transpõe o tom original da música", () => {
    expect(transposeTone("G", 2)).toBe("A");
  });

  it("transpõe tom com baixo", () => {
    expect(transposeTone("D/F#", 2)).toBe("E/G#");
  });

  it("semitons = 0 devolve o tom original", () => {
    expect(transposeTone("Bb", 0)).toBe("Bb");
  });
});
