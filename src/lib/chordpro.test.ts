import { describe, expect, it } from "vitest";
import {
  normalizeChordPro,
  parseChordLine,
  parseChordProLines,
  toLyricLines,
  toPlainLyrics,
  transposeChordPro,
  transposeTone,
} from "./chordpro";

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

describe("parseChordLine", () => {
  it("alinha o acorde na coluna da sílaba onde entra", () => {
    expect(parseChordLine("Ama[G]zing gra[C]ce")).toEqual({
      chordRow: "   G       C",
      lyricRow: "Amazing grace",
    });
  });

  it("acorde no início da linha fica na coluna 0", () => {
    expect(parseChordLine("[G]Amazing grace")).toEqual({
      chordRow: "G",
      lyricRow: "Amazing grace",
    });
  });

  it("linha sem acorde nenhum", () => {
    expect(parseChordLine("Só letra")).toEqual({ chordRow: "", lyricRow: "Só letra" });
  });

  it("dois acordes seguidos sem letra entre eles ganham um espaço de separação", () => {
    expect(parseChordLine("[G][C]word")).toEqual({ chordRow: "G C", lyricRow: "word" });
  });

  it("colchete sem fechamento é tratado como texto comum", () => {
    expect(parseChordLine("texto [solto")).toEqual({ chordRow: "", lyricRow: "texto [solto" });
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

describe("normalizeChordPro — acordes em cima da letra", () => {
  it("encaixa cada acorde na coluna em que estava, sobre a letra de baixo", () => {
    const input = "G        D\nGrande é o Senhor";
    expect(normalizeChordPro(input)).toBe("[G]Grande é [D]o Senhor");
  });

  it("acorde depois do fim da letra fica no fim, com espaço", () => {
    expect(normalizeChordPro("Am        D    G\nReina o Senhor")).toBe(
      "[Am]Reina o Se[D]nhor [G]",
    );
  });

  it("aceita baixo, sufixos e bemol", () => {
    expect(normalizeChordPro("Bb   F/A  Gm7(9)\nRendido estou")).toBe(
      "[Bb]Rendi[F/A]do es[Gm7(9)]tou",
    );
  });

  it("linha só de acordes sem letra embaixo vira acordes entre colchetes", () => {
    expect(normalizeChordPro("Intro: G  D  Em\n\nG\nVerso")).toBe(
      "Intro: [G]  [D]  [Em]\n\n[G]Verso",
    );
  });

  it("cabeçalho entre colchetes vira comentário, acorde sozinho não", () => {
    expect(normalizeChordPro("[Refrão]\n[C]")).toBe("{comment: Refrão}\n[C]");
  });

  it("rótulo e acordes na mesma linha viram comentário e linha de acordes", () => {
    expect(normalizeChordPro("[Intro] G  D  Em")).toBe("{comment: Intro}\n[G]  [D]  [Em]");
  });

  it("não confunde palavra com acorde", () => {
    const input = "E agora\nDe todo o coração\nAmor";
    expect(normalizeChordPro(input)).toBe(input);
  });

  it("ChordPro já com colchetes passa intacto (pode chamar duas vezes)", () => {
    const input = "{comment: Verso}\n[G]Grande é o Se[D]nhor";
    expect(normalizeChordPro(input)).toBe(input);
    expect(normalizeChordPro(normalizeChordPro("G\nLetra"))).toBe("[G]Letra");
  });

  it("transposeChordPro transpõe cifra colada com acordes em cima", () => {
    expect(transposeChordPro("Bb      F\nRendido estou", 1)).toBe("[B]Rendido [F#]estou");
  });
});

describe("diretivas", () => {
  const song = "{title: Grande}\n{comment: Verso 1}\n[G]Grande\n{soc}\n[C]Aleluia\n{eoc}";

  it("parseChordProLines esconde título e fim de seção e marca rótulos", () => {
    const lines = parseChordProLines(song);
    expect(lines.map((line) => line.section ?? line.lyricRow)).toEqual([
      "Verso 1",
      "Grande",
      "Refrão",
      "Aleluia",
    ]);
  });

  it("toLyricLines tira acordes, diretivas escondidas e linhas só de acorde", () => {
    expect(toLyricLines(`${song}\nG  D`)).toEqual([
      { text: "Verso 1", section: true },
      { text: "Grande" },
      { text: "Refrão", section: true },
      { text: "Aleluia" },
    ]);
  });
});
