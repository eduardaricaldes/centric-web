/**
 * Réplica em TypeScript de `../centric-api/app/services/chordpro.py`. A API só
 * transpõe quando pedimos `?view=chords` — no palco, transposição e troca de visão
 * acontecem aqui, no navegador, sem nova requisição (regra 3.1.5 do BRIEFING).
 *
 * Qualquer mudança de comportamento tem que ser espelhada dos dois lados.
 */

const SHARPS: readonly string[] = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS: readonly string[] = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const CHORD_RE = /\[([^\]]*)\]/g;

/** Tira os `[...]` de cada linha e apara os dois lados — igual ao `.strip()` do Python. */
export function toPlainLyrics(chordpro: string): string {
  return chordpro
    .split("\n")
    .map((line) => line.replace(CHORD_RE, "").trim())
    .join("\n");
}

function parseRoot(chord: string): [string, string] {
  if (chord.length >= 2 && (chord[1] === "#" || chord[1] === "b")) {
    return [chord.slice(0, 2), chord.slice(2)];
  }
  return [chord.slice(0, 1), chord.slice(1)];
}

/** Módulo que nunca devolve negativo, ao contrário do `%` puro do JS. */
function mod12(n: number): number {
  return ((n % 12) + 12) % 12;
}

function transposeRoot(root: string, semitones: number): string {
  const useFlats = root.length === 2 && root[1] === "b";
  const scale = useFlats ? FLATS : SHARPS;
  const other = useFlats ? SHARPS : FLATS;

  let idx = scale.indexOf(root);
  if (idx === -1) {
    idx = other.indexOf(root);
  }
  if (idx === -1) {
    // não é nota conhecida, devolve intacto
    return root;
  }

  return scale[mod12(idx + semitones)];
}

function transposeChord(chord: string, semitones: number): string {
  if (!chord) return chord;

  if (chord.includes("/")) {
    const slashIndex = chord.indexOf("/");
    const base = chord.slice(0, slashIndex);
    const bass = chord.slice(slashIndex + 1);
    return `${transposeChord(base, semitones)}/${transposeChord(bass, semitones)}`;
  }

  const [root, suffix] = parseRoot(chord);
  return transposeRoot(root, semitones) + suffix;
}

/** Transpõe todo acorde entre colchetes de um texto ChordPro, preservando o resto. */
export function transposeChordPro(chordpro: string, semitones: number): string {
  if (semitones === 0) return chordpro;
  return chordpro.replace(CHORD_RE, (_match, chord: string) => `[${transposeChord(chord, semitones)}]`);
}

/** Transpõe um tom isolado (ex.: "D/F#" -> "E/G#"), para o selo de tom da música. */
export function transposeTone(tone: string, semitones: number): string {
  if (semitones === 0) return tone;
  return transposeChord(tone, semitones);
}
