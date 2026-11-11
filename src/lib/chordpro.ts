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

/**
 * Transpõe todo acorde entre colchetes de um texto ChordPro, preservando o resto.
 * Cifra no formato "acordes em cima da letra" é convertida antes, para transpor também.
 */
export function transposeChordPro(chordpro: string, semitones: number): string {
  if (semitones === 0) return chordpro;
  return normalizeChordPro(chordpro).replace(
    CHORD_RE,
    (_match, chord: string) => `[${transposeChord(chord, semitones)}]`,
  );
}

// --- Cifra colada com acordes em cima da letra (formato de sites de cifra) ---

/**
 * Um acorde isolado: raiz, acidente, sufixos comuns (m, 7, maj7, sus4, add9, dim, º, +),
 * extensões entre parênteses e baixo depois da barra. Restrito de propósito para não
 * confundir palavra com acorde ("De", "Bem", "Amor" não passam; "Am", "F#m7", "D/F#" sim).
 */
const CHORD_TOKEN_RE =
  /^[A-G][#b]?(?:maj|min|m|M|dim|aug|sus|add|no|º|°|\+|-|#|b|\d)*(?:\([^)\s]*\))?(?:\/[A-G][#b]?)?$/;

/** Marcas que aparecem em linha de acordes e não são acorde: `|`, `/`, `-`, `2x`, `(x2)`. */
const CHORD_LINE_FILLER_RE = /^(?:[|/\-–.]+|\(?(?:x\d+|\d+x)\)?)$/i;

const DIRECTIVE_RE = /^\s*\{\s*([a-zA-Z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/;
const SECTION_HEADER_RE = /^\s*\[([^\]]+)\]\s*$/;

export function isChordToken(token: string): boolean {
  return CHORD_TOKEN_RE.test(token);
}

interface ChordLineInfo {
  /** Rótulo no começo da linha, como "Intro:" — a linha fica sozinha, sem letra embaixo. */
  label: boolean;
  chords: { column: number; chord: string }[];
}

/** Devolve os acordes e as colunas de uma linha que só tem acordes; `null` se tiver letra. */
function readChordLine(line: string): ChordLineInfo | null {
  if (line.includes("[") || line.includes("{")) return null;
  const tokens = [...line.matchAll(/\S+/g)];
  if (tokens.length === 0) return null;

  let label = false;
  const chords: ChordLineInfo["chords"] = [];
  for (const [index, match] of tokens.entries()) {
    const token = match[0];
    if (isChordToken(token)) {
      chords.push({ column: match.index ?? 0, chord: token });
    } else if (CHORD_LINE_FILLER_RE.test(token)) {
      continue;
    } else if (index === 0 && token.endsWith(":") && tokens.length > 1) {
      label = true;
    } else {
      return null;
    }
  }
  return chords.length > 0 ? { label, chords } : null;
}

function isLyricLine(line: string | undefined): line is string {
  if (line === undefined || line.trim() === "") return false;
  if (line.includes("[") || DIRECTIVE_RE.test(line)) return false;
  return readChordLine(line) === null;
}

/** Encaixa cada acorde na coluna em que ele estava, sobre a linha de letra de baixo. */
function mergeChordsIntoLyric(lyric: string, chords: ChordLineInfo["chords"]): string {
  let result = lyric;
  for (const { column, chord } of [...chords].sort((a, b) => b.column - a.column)) {
    if (result.length < column) result = result.padEnd(column, " ");
    result = `${result.slice(0, column)}[${chord}]${result.slice(column)}`;
  }
  return result;
}

/**
 * Converte cifra no formato de sites de cifra (uma linha de acordes em cima de cada
 * linha de letra) para ChordPro com colchetes, e cabeçalhos como `[Refrão]` para
 * `{comment: Refrão}`. Texto que já é ChordPro passa intacto, então dá para chamar
 * mais de uma vez.
 */
export function normalizeChordPro(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const out: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    const header = SECTION_HEADER_RE.exec(line);
    if (header && !isChordToken(header[1].trim()) && !/^n\.?c\.?$/i.test(header[1].trim())) {
      out.push(`{comment: ${header[1].trim()}}`);
      continue;
    }

    // "[Intro] G  D  Em": rótulo e acordes na mesma linha, como nos sites de cifra.
    const labeled = /^\s*\[([^\]]+)\]\s+(\S.*)$/.exec(line);
    if (labeled && !isChordToken(labeled[1].trim()) && readChordLine(labeled[2])) {
      out.push(`{comment: ${labeled[1].trim()}}`);
      out.push(labeled[2].replace(/\S+/g, (token) => (isChordToken(token) ? `[${token}]` : token)));
      continue;
    }

    const info = readChordLine(line);
    if (!info) {
      out.push(line);
      continue;
    }

    const next = lines[i + 1];
    if (!info.label && isLyricLine(next)) {
      out.push(mergeChordsIntoLyric(next, info.chords));
      i += 1;
    } else {
      // Linha só de acordes (intro, solo, final): cada acorde ganha colchetes no lugar.
      out.push(line.replace(/\S+/g, (token) => (isChordToken(token) ? `[${token}]` : token)));
    }
  }

  return out.join("\n");
}

// --- Diretivas ChordPro ({title: ...}, {comment: ...}, {soc} ...) -----------

const COMMENT_DIRECTIVES = new Set(["c", "comment", "ci", "comment_italic", "cb", "comment_box", "highlight"]);
const SECTION_DIRECTIVES: Record<string, string> = {
  soc: "Refrão",
  start_of_chorus: "Refrão",
  sov: "Verso",
  start_of_verse: "Verso",
  sob: "Ponte",
  start_of_bridge: "Ponte",
};

/**
 * `undefined` se a linha não é diretiva; `null` se é uma diretiva que não aparece na
 * tela (título, artista, tom, fim de seção...); o texto do rótulo se vira cabeçalho.
 */
function directiveLabel(line: string): string | null | undefined {
  const match = DIRECTIVE_RE.exec(line);
  if (!match) return undefined;
  const name = match[1].toLowerCase();
  const value = match[2]?.trim() ?? "";
  if (COMMENT_DIRECTIVES.has(name)) return value || null;
  if (name in SECTION_DIRECTIVES) return value || SECTION_DIRECTIVES[name];
  return null;
}

export interface LyricLine {
  text: string;
  /** Rótulo de parte da música ("Verso 1", "Refrão"), vindo de uma diretiva. */
  section?: boolean;
}

/**
 * Letra pronta para exibir: sem acordes, sem diretivas escondidas, com rótulos de parte
 * marcados e sem as linhas que só tinham acordes.
 */
export function toLyricLines(chordpro: string): LyricLine[] {
  const result: LyricLine[] = [];
  for (const line of normalizeChordPro(chordpro).split("\n")) {
    const label = directiveLabel(line);
    if (label === null) continue;
    if (label !== undefined) {
      result.push({ text: label, section: true });
      continue;
    }
    const text = line.replace(CHORD_RE, "").trim();
    if (text === "" && line.trim() !== "") continue;
    result.push({ text });
  }
  return result;
}

/** Transpõe um tom isolado (ex.: "D/F#" -> "E/G#"), para o selo de tom da música. */
export function transposeTone(tone: string, semitones: number): string {
  if (semitones === 0) return tone;
  return transposeChord(tone, semitones);
}

export interface ChordLine {
  /** Linha de acordes, alinhada por coluna com a sílaba onde cada um entra. */
  chordRow: string;
  /** Linha de letra, sem os colchetes. */
  lyricRow: string;
  /** Preenchido quando a linha é um rótulo de parte da música, vindo de uma diretiva. */
  section?: string;
}

/**
 * Separa uma linha ChordPro em duas linhas alinhadas por coluna (acorde em cima da
 * sílaba certa), para renderizar em fonte monoespaçada — usado no detalhe da música
 * e no modo palco. Um `[` sem `]` correspondente é tratado como texto comum.
 */
export function parseChordLine(line: string): ChordLine {
  let chordRow = "";
  let lyricRow = "";
  let i = 0;

  while (i < line.length) {
    if (line[i] === "[") {
      const end = line.indexOf("]", i);
      if (end === -1) {
        lyricRow += line[i];
        i += 1;
        continue;
      }
      const chord = line.slice(i + 1, end);
      if (chordRow.length < lyricRow.length) {
        chordRow += " ".repeat(lyricRow.length - chordRow.length);
      } else if (chordRow.length > lyricRow.length) {
        chordRow += " ";
      }
      chordRow += chord;
      i = end + 1;
    } else {
      lyricRow += line[i];
      i += 1;
    }
  }

  return { chordRow, lyricRow };
}

/**
 * Aplica `parseChordLine` a um texto ChordPro inteiro, linha por linha. Converte antes
 * a cifra com acordes em cima da letra; diretivas viram rótulo de parte ou somem.
 */
export function parseChordProLines(chordpro: string): ChordLine[] {
  const result: ChordLine[] = [];
  for (const line of normalizeChordPro(chordpro).split("\n")) {
    const label = directiveLabel(line);
    if (label === null) continue;
    if (label !== undefined) {
      result.push({ chordRow: "", lyricRow: "", section: label });
      continue;
    }
    result.push(parseChordLine(line));
  }
  return result;
}
