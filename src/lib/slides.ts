import { toLyricLines } from "./chordpro";

/** Um slide do telão: só letra, sem cifra. `label` é a parte (Refrão, Ponte) quando houver. */
export interface Slide {
  lines: string[];
  label?: string;
}

/**
 * Slides automáticos: uma estrofe por slide, cortando nas linhas em branco.
 * Rótulos `{comment: Refrão}` não aparecem no telão, só viram o rótulo do slide.
 */
export function autoSlides(chordpro: string): Slide[] {
  const slides: Slide[] = [];
  let current: Slide = { lines: [] };
  let pendingLabel: string | undefined;

  const flush = () => {
    if (current.lines.length > 0) slides.push(current);
    current = { lines: [] };
  };

  for (const line of toLyricLines(chordpro)) {
    if (line.section) {
      flush();
      pendingLabel = line.text;
      continue;
    }
    if (line.text.trim() === "") {
      flush();
      continue;
    }
    if (current.lines.length === 0 && pendingLabel) {
      current.label = pendingLabel;
      pendingLabel = undefined;
    }
    current.lines.push(line.text);
  }
  flush();
  return slides;
}

/** Slides salvos à mão: texto com slides separados por linha em branco. */
export function parseSlidesText(text: string): Slide[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.split("\n").map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0)
    .map((lines) => ({ lines }));
}

export function slidesToText(slides: Slide[]): string {
  return slides.map((slide) => slide.lines.join("\n")).join("\n\n");
}

/** Slides de uma música: os ajustados à mão, ou os automáticos. */
export function songSlides(song: { slides?: string | null; chordpro?: string | null; lyrics?: string | null }): Slide[] {
  if (song.slides && song.slides.trim()) return parseSlidesText(song.slides);
  return autoSlides(song.chordpro ?? song.lyrics ?? "");
}

/** Junta o slide `index` com o seguinte. */
export function joinWithNext(slides: Slide[], index: number): Slide[] {
  if (index < 0 || index >= slides.length - 1) return slides;
  const merged: Slide = { lines: [...slides[index].lines, ...slides[index + 1].lines], label: slides[index].label };
  return [...slides.slice(0, index), merged, ...slides.slice(index + 2)];
}

/** Separa o slide `index` antes da linha `lineIndex`. */
export function splitAt(slides: Slide[], index: number, lineIndex: number): Slide[] {
  const slide = slides[index];
  if (!slide || lineIndex <= 0 || lineIndex >= slide.lines.length) return slides;
  const first: Slide = { lines: slide.lines.slice(0, lineIndex), label: slide.label };
  const second: Slide = { lines: slide.lines.slice(lineIndex) };
  return [...slides.slice(0, index), first, second, ...slides.slice(index + 1)];
}
