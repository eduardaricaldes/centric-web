import { describe, expect, it } from "vitest";
import { autoSlides, joinWithNext, parseSlidesText, slidesToText, songSlides, splitAt } from "./slides";

describe("autoSlides", () => {
  it("faz um slide por estrofe, sem cifra e sem rótulo no texto", () => {
    const slides = autoSlides("[G]Ele é a [D]glória\nEle é o Rei\n\n{comment: Refrão}\nSanto, santo\n\n\nAmém");
    expect(slides).toEqual([
      { lines: ["Ele é a glória", "Ele é o Rei"] },
      { lines: ["Santo, santo"], label: "Refrão" },
      { lines: ["Amém"] },
    ]);
  });

  it("letra vazia não gera slide", () => {
    expect(autoSlides("")).toEqual([]);
  });
});

describe("slides ajustados", () => {
  it("ida e volta pelo texto", () => {
    const slides = parseSlidesText("A\nB\n\n\nC\n");
    expect(slides).toEqual([{ lines: ["A", "B"] }, { lines: ["C"] }]);
    expect(slidesToText(slides)).toBe("A\nB\n\nC");
  });

  it("songSlides prefere os slides salvos", () => {
    expect(songSlides({ slides: "X\n\nY", chordpro: "A" })).toHaveLength(2);
    expect(songSlides({ slides: null, chordpro: "Um\n\nDois\n\nTres" })).toHaveLength(3);
  });

  it("junta e separa", () => {
    const slides = [{ lines: ["A"] }, { lines: ["B", "C"] }];
    expect(joinWithNext(slides, 0)).toEqual([{ lines: ["A", "B", "C"], label: undefined }]);
    expect(splitAt(slides, 1, 1)).toEqual([{ lines: ["A"] }, { lines: ["B"], label: undefined }, { lines: ["C"] }]);
    expect(splitAt(slides, 1, 0)).toBe(slides);
  });
});
