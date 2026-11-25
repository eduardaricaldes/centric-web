import { autoSlides, joinWithNext, parseSlidesText, slidesToText, splitAt, type Slide } from "../../lib/slides";

interface SlidesEditorProps {
  chordpro: string;
  /** Slides ajustados à mão (texto), ou vazio para automático. */
  slidesText: string;
  onChange: (text: string) => void;
  /** A letra mudou depois dos slides ajustados. */
  lyricsChanged: boolean;
}

/** Aba "Slides" (Fase 2): juntar ou separar estrofes do telão. */
export function SlidesEditor({ chordpro, slidesText, onChange, lyricsChanged }: SlidesEditorProps) {
  const custom = slidesText.trim().length > 0;
  const slides: Slide[] = custom ? parseSlidesText(slidesText) : autoSlides(chordpro);

  const update = (next: Slide[]) => onChange(slidesToText(next));

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {custom ? "Slides ajustados à mão." : "Automático: uma estrofe por slide."} {slides.length} slide
          {slides.length === 1 ? "" : "s"}.
        </p>
        {custom && (
          <button type="button" className="text-sm font-medium text-north hover:underline" onClick={() => onChange("")}>
            Voltar ao automático
          </button>
        )}
      </div>

      {custom && lyricsChanged && (
        <p className="mb-3 rounded-field border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber-ink">
          A letra mudou. Ao salvar, os slides voltam ao automático, a não ser que você ajuste de novo aqui.
        </p>
      )}

      <ol className="flex max-h-[28rem] flex-col gap-2 overflow-auto">
        {slides.map((slide, index) => (
          <li key={index}>
            <div className="rounded-field bg-navy px-3 py-2 text-sm text-white">
              <span className="mb-1 block text-xs text-white/50">
                Slide {index + 1}
                {slide.label ? ` · ${slide.label}` : ""}
              </span>
              {slide.lines.map((line, lineIndex) => (
                <div key={lineIndex} className="relative">
                  {lineIndex > 0 && (
                    <button
                      type="button"
                      title="Separar o slide aqui"
                      className="absolute -top-1.5 left-0 right-0 z-10 h-3 border-t border-dashed border-white/40 text-center text-[10px] leading-none text-white opacity-0 hover:opacity-100 focus:opacity-100"
                      onClick={() => update(splitAt(slides, index, lineIndex))}
                    >
                      <span className="relative -top-1.5 bg-navy px-1">separar aqui</span>
                    </button>
                  )}
                  <span className="block py-0.5 font-display">{line}</span>
                </div>
              ))}
            </div>
            {index < slides.length - 1 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-muted hover:text-north"
                  onClick={() => update(joinWithNext(slides, index))}
                >
                  juntar com o próximo
                </button>
              </div>
            )}
          </li>
        ))}
        {slides.length === 0 && <li className="text-sm text-muted">Escreva a letra para ver os slides.</li>}
      </ol>
    </div>
  );
}
